const {
  connectToDatabase,
  getClient,
} = require("../../configuration/dbConfig");
const { ObjectId } = require("mongodb");

const COLLECTION_NAME = "confessionComments";

const PROTECTED_FIELDS = [
  "userId",
  "confessionId",
  "createdAt",
  "parentId",
  "isEdited",
  "likesCount",
  "replyCount",
  "deletedAt",
];

const getCollection = async () => {
  const db = await connectToDatabase();
  return db.collection(COLLECTION_NAME);
};

const createComment = async (commentData) => {
  const collection = await getCollection();
  const db = collection.db;
  const confessionsCollection = db.collection("confessions");
  const client = getClient();
  const session = client.startSession();

  if (!commentData.content?.trim()) {
    throw new Error("Content is required");
  }

  const userId = new ObjectId(commentData.userId);
  const confessionId = new ObjectId(commentData.confessionId);
  const parentId = commentData.parentId
    ? new ObjectId(commentData.parentId)
    : null;
  const now = new Date();

  const comment = {
    userId,
    confessionId,
    content: commentData.content,
    parentId,
    isEdited: false,
    likesCount: 0,
    replyCount: 0,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  let insertedId;

  try {
    await session.withTransaction(async () => {
      if (parentId) {
        const parent = await collection.findOne(
          {
            _id: parentId,
            confessionId,
            deletedAt: null,
          },
          { session },
        );

        if (!parent) throw new Error("Invalid parent comment");

        if (parent.parentId) {
          throw new Error("Nested replies not allowed");
        }
      }

      const result = await collection.insertOne(comment, { session });
      insertedId = result.insertedId;

      if (parentId) {
        const parentUpdate = await collection.updateOne(
          { _id: parentId, deletedAt: null },
          { $inc: { replyCount: 1 } },
          { session },
        );

        if (parentUpdate.matchedCount === 0) {
          throw new Error("Invalid parent comment");
        }
      }

      const confessionUpdate = await confessionsCollection.updateOne(
        { _id: confessionId },
        { $inc: { commentCount: 1 } },
        { session },
      );

      if (confessionUpdate.matchedCount === 0) {
        throw new Error("Invalid confession");
      }
    });

    return insertedId;
  } finally {
    await session.endSession();
  }
};

const getCommentsByConfession = async (
  confessionId,
  currentUserId,
  limit = 10,
  cursor = null,
) => {
  const collection = await getCollection();
  const db = collection.db;

  const matchStage = {
    confessionId: new ObjectId(confessionId),
    parentId: null,
    deletedAt: null,
  };

  if (typeof cursor === "string" && cursor.includes("_")) {
    const [createdAtStr, id] = cursor.split("_");

    if (createdAtStr && id && ObjectId.isValid(id)) {
      const createdAtDate = new Date(createdAtStr);

      if (!Number.isNaN(createdAtDate.getTime())) {
        matchStage.$or = [
          {
            createdAt: { $lt: createdAtDate },
          },
          {
            createdAt: createdAtDate,
            _id: { $lt: new ObjectId(id) },
          },
        ];
      }
    }
  }

  const pipeline = [
    { $match: matchStage },
    { $sort: { createdAt: -1, _id: -1 } },
    { $limit: limit + 1 },
    {
      $lookup: {
        from: "profiles",
        let: { userId: "$userId" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$userId", "$$userId"] },
              deletedAt: null,
            },
          },
          {
            $project: { displayName: 1, profilePicture: 1 },
          },
        ],
        as: "author",
      },
    },
    {
      $unwind: {
        path: "$author",
        preserveNullAndEmptyArrays: true,
      },
    },
  ];

  const comments = await collection.aggregate(pipeline).toArray();

  const hasMore = comments.length > limit;
  const data = hasMore ? comments.slice(0, limit) : comments;

  let likedCommentIds = new Set();

  if (currentUserId && data.length > 0) {
    const commentIds = data.map((comment) => comment._id);

    const likes = await db
      .collection("confessionCommentLikes")
      .find({
        userId: new ObjectId(currentUserId),
        commentId: { $in: commentIds },
      })
      .project({ commentId: 1 })
      .toArray();

    likedCommentIds = new Set(likes.map((like) => like.commentId.toString()));
  }

  const finalData = data.map((comment) => ({
    ...comment,
    likedByCurrentUser: likedCommentIds.has(comment._id.toString()),
    replyCount: comment.replyCount || 0,
    authorDisplayName: comment.author?.displayName || null,
    authorProfilePicture: comment.author?.profilePicture || "",
  }));

  let nextCursor = null;

  if (hasMore) {
    const lastComment = data[data.length - 1];
    nextCursor = `${lastComment.createdAt.toISOString()}_${lastComment._id}`;
  }

  return { comments: finalData, nextCursor, hasMore };
};

const getRepliesByComment = async (
  commentId,
  currentUserId,
  limit = 10,
  cursor = null,
) => {
  const collection = await getCollection();
  const db = collection.db;

  const matchStage = {
    parentId: new ObjectId(commentId),
    deletedAt: null,
  };

  if (cursor && typeof cursor === "string") {
    const parts = cursor.split("_");

    if (parts.length === 2) {
      const [createdAtStr, id] = parts;
      const timestamp = Date.parse(createdAtStr);

      if (!Number.isNaN(timestamp) && ObjectId.isValid(id)) {
        const cursorDate = new Date(timestamp);
        const cursorId = new ObjectId(id);

        matchStage.$or = [
          {
            createdAt: { $gt: cursorDate },
          },
          {
            createdAt: cursorDate,
            _id: { $gt: cursorId },
          },
        ];
      }
    }
  }

  const pipeline = [
    { $match: matchStage },
    { $sort: { createdAt: 1, _id: 1 } },
    { $limit: limit + 1 },
    {
      $lookup: {
        from: "profiles",
        let: { userId: "$userId" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$userId", "$$userId"] },
              deletedAt: null,
            },
          },
          {
            $project: { displayName: 1, profilePicture: 1 },
          },
        ],
        as: "author",
      },
    },
    {
      $unwind: {
        path: "$author",
        preserveNullAndEmptyArrays: true,
      },
    },
  ];

  const replies = await collection.aggregate(pipeline).toArray();

  const hasMore = replies.length > limit;
  const data = hasMore ? replies.slice(0, limit) : replies;

  let likedReplyIds = new Set();

  if (currentUserId && data.length > 0) {
    const replyIds = data.map((reply) => reply._id);
    const likes = await db
      .collection("confessionCommentLikes")
      .find({
        userId: new ObjectId(currentUserId),
        commentId: { $in: replyIds },
      })
      .project({ commentId: 1 })
      .toArray();
    likedReplyIds = new Set(likes.map((like) => like.commentId.toString()));
  }

  const finalData = data.map((reply) => ({
    ...reply,
    likedByCurrentUser: likedReplyIds.has(reply._id.toString()),
    authorDisplayName: reply.author?.displayName || null,
    authorProfilePicture: reply.author?.profilePicture || "",
  }));

  let nextCursor = null;

  if (hasMore) {
    const lastReply = data[data.length - 1];
    nextCursor = `${lastReply.createdAt.toISOString()}_${lastReply._id}`;
  }

  return { replies: finalData, nextCursor, hasMore };
};

const getCommentById = async (id, currentUserId = null) => {
  const collection = await getCollection();
  const db = collection.db;
  const comment = await collection.findOne({
    _id: new ObjectId(id),
    deletedAt: null,
  });

  if (!comment) return null;

  let likedByCurrentUser = false;

  if (currentUserId) {
    const like = await db.collection("confessionCommentLikes").findOne({
      userId: new ObjectId(currentUserId),
      commentId: comment._id,
    });
    likedByCurrentUser = !!like;
  }

  const author = await db.collection("profiles").findOne(
    {
      userId: comment.userId,
      deletedAt: null,
    },
    {
      projection: {
        displayName: 1,
        profilePicture: 1,
      },
    },
  );

  return {
    ...comment,
    likedByCurrentUser,
    authorDisplayName: author?.displayName || null,
    authorProfilePicture: author?.profilePicture || "",
  };
};

const updateComment = async (id, userId, updateData) => {
  const collection = await getCollection();

  const comment = await collection.findOne({
    _id: new ObjectId(id),
    deletedAt: null,
  });

  if (!comment) throw new Error("not found");

  if (comment.userId.toString() !== userId.toString()) {
    throw new Error("Unauthorized");
  }

  PROTECTED_FIELDS.forEach((field) => delete updateData[field]);

  return collection.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        ...updateData,
        isEdited: true,
        updatedAt: new Date(),
      },
    },
  );
};

const deleteComment = async (userId, id) => {
  const collection = await getCollection();
  const db = collection.db;

  const likesCollection = db.collection("confessionCommentLikes");
  const confessionsCollection = db.collection("confessions");

  const client = getClient();
  const session = client.startSession();

  const commentId = new ObjectId(id);
  let removedCount = 0;

  try {
    await session.withTransaction(async () => {
      const comment = await collection.findOne(
        {
          _id: commentId,
          deletedAt: null,
        },
        { session },
      );

      if (!comment) throw new Error("not found");

      if (comment.userId.toString() !== userId.toString()) {
        throw new Error("Unauthorized");
      }

      const now = new Date();

      await collection.updateOne(
        { _id: commentId, deletedAt: null },
        { $set: { deletedAt: now } },
        { session },
      );

      const replies = await collection
        .find({ parentId: commentId, deletedAt: null }, { session })
        .project({ _id: 1 })
        .toArray();

      const replyIds = replies.map((r) => r._id);

      if (replyIds.length > 0) {
        await collection.updateMany(
          { _id: { $in: replyIds }, deletedAt: null },
          { $set: { deletedAt: now } },
          { session },
        );
      }

      if (comment.parentId) {
        await collection.updateOne(
          { _id: comment.parentId, replyCount: { $gt: 0 } },
          { $inc: { replyCount: -1 } },
          { session },
        );
      }

      const allIds = [commentId, ...replyIds];

      await likesCollection.deleteMany(
        {
          commentId: { $in: allIds },
        },
        { session },
      );

      const totalDeleted = 1 + replyIds.length;
      removedCount = totalDeleted;

      await confessionsCollection.updateOne(
        { _id: comment.confessionId },
        { $inc: { commentCount: -totalDeleted } },
        { session },
      );
    });

    return { success: true, removedCount };
  } catch (error) {
    console.error("Transaction failed:", error);
    throw error;
  } finally {
    await session.endSession();
  }
};

module.exports = {
  createComment,
  getCommentsByConfession,
  getRepliesByComment,
  getCommentById,
  updateComment,
  deleteComment,
};
