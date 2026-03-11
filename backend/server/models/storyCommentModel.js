const { connectToDatabase, getClient } = require("../configuration/dbConfig");
const { ObjectId } = require("mongodb");

const COLLECTION_NAME = "storyComments";

const PROTECTED_FIELDS = [
  "userId",
  "storyId",
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

// Create a comment
const createComment = async (commentData) => {
  const collection = await getCollection();
  const db = collection.db;

  if (!commentData.content || !commentData.content.trim()) {
    throw new Error("Content is required");
  }

  if (commentData.parentId) {
    const parent = await collection.findOne({
      _id: new ObjectId(commentData.parentId),
      storyId: new ObjectId(commentData.storyId),
      deletedAt: null,
    });

    if (!parent) throw new Error("Invalid parent comment");

    if (parent.parentId) {
      throw new Error("Nested replies not allowed");
    }

    await collection.updateOne(
      { _id: new ObjectId(commentData.parentId) },
      { $inc: { replyCount: 1 } },
    );
  }

  const comment = {
    userId: new ObjectId(commentData.userId),
    storyId: new ObjectId(commentData.storyId),
    content: commentData.content,
    parentId: commentData.parentId ? new ObjectId(commentData.parentId) : null,
    isEdited: false,
    likesCount: 0,
    replyCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const result = await collection.insertOne(comment);

  await db
    .collection("stories")
    .updateOne(
      { _id: new ObjectId(commentData.storyId) },
      { $inc: { commentCount: 1 } },
    );

  return result.insertedId;
};

// Get comments for a story with pagination and like status
const getCommentsByStory = async (
  storyId,
  currentUserId,
  limit = 10,
  cursor = null,
) => {
  const collection = await getCollection();
  const db = collection.db;

  const filter = {
    storyId: new ObjectId(storyId),
    parentId: null, // only top-level comments
    deletedAt: null,
  };

  if (cursor) {
    const [createdAtStr, id] = cursor.split("_");

    filter.$or = [
      {
        createdAt: { $lt: new Date(createdAtStr) },
      },
      {
        createdAt: new Date(createdAtStr),
        _id: { $lt: new ObjectId(id) },
      },
    ];
  }

  const comments = await collection
    .find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1)
    .toArray();

  const hasMore = comments.length > limit;
  const data = hasMore ? comments.slice(0, limit) : comments;

  let likedCommentIds = new Set();

  if (currentUserId && data.length > 0) {
    const commentIds = data.map((comment) => comment._id);

    const likes = await db
      .collection("commentLikes")
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
  }));

  let nextCursor = null;

  if (hasMore) {
    const lastComment = data[data.length - 1];
    nextCursor = `${lastComment.createdAt.toISOString()}_${lastComment._id}`;
  }

  return { comments: finalData, nextCursor, hasMore };
};

// Get replies for a comment with pagination and like status
const getRepliesByComment = async (
  commentId,
  currentUserId,
  limit = 10,
  cursor = null, // Format: "createdAt_timestamp_id" (same format, just different comparison logic)
) => {
  const collection = await getCollection();
  const db = collection.db;

  const filter = {
    parentId: new ObjectId(commentId),
    deletedAt: null,
  };

  // Cursor logic for oldest-to-newest pagination
  if (cursor) {
    const [createdAtStr, id] = cursor.split("_");
    const cursorDate = new Date(createdAtStr);
    const cursorId = new ObjectId(id);

    filter.$or = [
      {
        createdAt: { $gt: cursorDate }, // Get items AFTER this date
      },
      {
        createdAt: cursorDate,
        _id: { $gt: cursorId }, // Same date, get items with LARGER _id
      },
    ];
  }

  // Sort: oldest first (ascending)
  const replies = await collection
    .find(filter)
    .sort({ createdAt: 1, _id: 1 }) // ASCENDING order for oldest-first
    .limit(limit + 1)
    .toArray();

  const hasMore = replies.length > limit;
  const data = hasMore ? replies.slice(0, limit) : replies;

  // Like status logic
  let likedReplyIds = new Set();

  if (currentUserId && data.length > 0) {
    const replyIds = data.map((reply) => reply._id);
    const likes = await db
      .collection("commentLikes")
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
  }));

  // Create next cursor from the LAST item in current page
  let nextCursor = null;

  if (hasMore) {
    const lastReply = data[data.length - 1];
    nextCursor = `${lastReply.createdAt.toISOString()}_${lastReply._id}`;
  }

  return { replies: finalData, nextCursor, hasMore };
};

// Get comments for a story
// const getCommentsByStory = async (
//   storyId,
//   currentUserId,
//   limit = 10,
//   cursor = null,
// ) => {
//   const collection = await getCollection();
//   const db = collection.db;
//   const filter = { storyId: new ObjectId(storyId), deletedAt: null };

//   if (cursor) {
//     const [createdAtStr, id] = cursor.split("_");

//     filter.$or = [
//       {
//         createdAt: { $lt: new Date(createdAtStr) },
//       },
//       {
//         createdAt: new Date(createdAtStr),
//         _id: { $lt: new ObjectId(id) },
//       },
//     ];
//   }

//   const comments = await collection
//     .find(filter)
//     .sort({ createdAt: -1, _id: -1 })
//     .limit(limit + 1)
//     .toArray();

//   const hasMore = comments.length > limit;
//   const data = hasMore ? comments.slice(0, limit) : comments;

//   let likedCommentIds = new Set();

//   if (currentUserId && data.length > 0) {
//     const commentIds = data.map((comment) => comment._id);

//     const likes = await db
//       .collection("commentLikes") // separate collection
//       .find({
//         userId: new ObjectId(currentUserId),
//         commentId: { $in: commentIds },
//       })
//       .project({ commentId: 1 })
//       .toArray();

//     likedCommentIds = new Set(likes.map((like) => like.commentId.toString()));
//   }

//   const finalData = data.map((comment) => ({
//     ...comment,
//     likedByCurrentUser: likedCommentIds.has(comment._id.toString()),
//     replyCount: comment.replyCount || 0, // safe fallback
//   }));

//   let nextCursor = null;

//   if (hasMore) {
//     const lastComment = data[data.length - 1];
//     nextCursor = `${lastComment.createdAt.toISOString()}_${lastComment._id}`;
//   }

//   return { comments: finalData, nextCursor, hasMore };
// };

// Get a single comment
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
    const like = await db.collection("commentLikes").findOne({
      userId: new ObjectId(currentUserId),
      commentId: comment._id,
    });
    likedByCurrentUser = !!like;
  }

  return {
    ...comment,
    likedByCurrentUser,
  };
};

// Edit comments
const updateComment = async (id, userId, updateData) => {
  const collection = await getCollection();

  const comment = await collection.findOne({
    _id: new ObjectId(id),
    deletedAt: null,
  });

  if (!comment) throw new Error("not found");

  // Ensure only the comment's owner can update
  if (comment.userId.toString() !== userId.toString()) {
    throw new Error("Unauthorized");
  }

  // Remove protected fields
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

// soft delete comment
const deleteComment = async (userId, id) => {
  const collection = await getCollection();
  const db = collection.db;

  const likesCollection = db.collection("commentLikes");
  const storiesCollection = db.collection("stories");

  const client = getClient();
  const session = client.startSession();

  const commentId = new ObjectId(id);

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

      // Soft delete the main comment
      await collection.updateOne(
        { _id: commentId, deletedAt: null },
        { $set: { deletedAt: now } },
        { session },
      );

      // Find replies
      const replies = await collection
        .find({ parentId: commentId, deletedAt: null }, { session })
        .project({ _id: 1 })
        .toArray();

      const replyIds = replies.map((r) => r._id);

      // Soft delete replies
      if (replyIds.length > 0) {
        await collection.updateMany(
          { _id: { $in: replyIds }, deletedAt: null },
          { $set: { deletedAt: now } },
          { session },
        );
      }

      // Update parent's replyCount if this comment is a reply
      if (comment.parentId) {
        await collection.updateOne(
          { _id: comment.parentId, replyCount: { $gt: 0 } },
          { $inc: { replyCount: -1 } },
          { session },
        );
      }

      // Delete likes for comment + replies
      const allIds = [commentId, ...replyIds];

      await likesCollection.deleteMany(
        {
          commentId: { $in: allIds },
        },
        { session },
      );

      const totalDeleted = 1 + replyIds.length;

      await storiesCollection.updateOne(
        { _id: comment.storyId },
        { $inc: { commentCount: -totalDeleted } },
        { session },
      );
    });

    return { success: true };
  } catch (error) {
    console.error("Transaction failed:", error);
    throw error;
  } finally {
    await session.endSession();
  }
};

// Soft delete comment
// const deleteComment = async (userId, id) => {
//   const collection = await getCollection();
//   const likesCollection = db.collection("commentLikes");
//   const storiesCollection = db.collection("stories");
//   const db = collection.db;

//   const commentId = new ObjectId(id);

//   const comment = await collection.findOne({
//     _id: commentId,
//     deletedAt: null,
//   });

//   if (!comment) throw new Error("not found");

//   if (comment.userId.toString() !== userId.toString()) {
//     throw new Error("Unauthorized");
//   }

//   const now = new Date();

//   // Soft delete the main comment
//   await collection.updateOne({ _id: commentId, deletedAt: null }, { $set: { deletedAt: now } });

//   // Find replies
//   const replies = await collection
//     .find({ parentId: commentId, deletedAt: null })
//     .project({ _id: 1 })
//     .toArray();

//   const replyIds = replies.map((r) => r._id);

//   // Soft delete replies
//   if (replyIds.length > 0) {
//     await collection.updateMany(
//       { _id: { $in: replyIds }, deletedAt: null },
//       { $set: { deletedAt: now } },
//     );
//   }

//   // Update parent's replyCount if this comment is a reply
//   if (comment.parentId) {
//     await collection.updateOne(
//       { _id: comment.parentId, replyCount: { $gt: 0 } },
//       { $inc: { replyCount: -1 } },
//     );
//   }

//   // Delete likes for comment + replies
//   const allIds = [commentId, ...replyIds];

//   await likesCollection.deleteMany({
//     commentId: { $in: allIds },
//   });

//   const totalDeleted = 1 + replyIds.length;

//   await storiesCollection
//     .updateOne(
//       { _id: comment.storyId },
//       { $inc: { commentCount: -totalDeleted } },
//     );

//   return { success: true };
// };

module.exports = {
  createComment,
  getCommentsByStory,
  getRepliesByComment,
  getCommentById,
  updateComment,
  deleteComment,
};
