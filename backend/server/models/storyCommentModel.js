const { connectToDatabase } = require("../configuration/dbConfig");
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

    await collection.updateOne(
      { _id: new ObjectId(commentData.parentId) },
      { $inc: { replyCount: 1 } }
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

// Get comments for a story
const getCommentsByStory = async (
  storyId,
  currentUserId,
  limit = 10,
  cursor = null,
) => {
  const db = await connectToDatabase();
  const collection = await getCollection();
  const filter = { storyId: new ObjectId(storyId), deletedAt: null };

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
      .collection("commentLikes") // separate collection
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
    replyCount: comment.replyCount || 0, // safe fallback
  }));

  let nextCursor = null;

  if (hasMore) {
    const lastComment = data[data.length - 1];
    nextCursor = `${lastComment.createdAt.toISOString()}_${lastComment._id}`;
  }

  return { comments: finalData, nextCursor, hasMore };
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

// Soft delete comment
const deleteComment = async (userId, id) => {
  const db = await connectToDatabase();
  const collection = await getCollection();

  const commentId = new ObjectId(id);

  const comment = await collection.findOne({
    _id: commentId,
    deletedAt: null,
  });

  if (!comment) throw new Error("not found");

  if (comment.userId.toString() !== userId.toString()) {
    throw new Error("Unauthorized");
  }

  const now = new Date();

  // Soft delete the main comment
  await collection.updateOne(
    { _id: commentId },
    { $set: { deletedAt: now } }
  );

  // Find replies
  const replies = await collection
    .find({ parentId: commentId, deletedAt: null })
    .project({ _id: 1 })
    .toArray();

  const replyIds = replies.map((r) => r._id);

  // Soft delete replies
  if (replyIds.length > 0) {
    await collection.updateMany(
      { _id: { $in: replyIds } },
      { $set: { deletedAt: now } }
    );
  }

  // Update parent's replyCount if this comment is a reply
  if (comment.parentId) {
    await collection.updateOne(
      { _id: comment.parentId },
      { $inc: { replyCount: -1 } }
    );
  }

  // Delete likes for comment + replies
  const allIds = [commentId, ...replyIds];

  await db.collection("commentLikes").deleteMany({
    commentId: { $in: allIds },
  });

  return { success: true };
};

// Soft delete comment
// const deleteComment = async (userId, id) => {
//   const db = await connectToDatabase();
//   const collection = await getCollection();

//   const comment = await collection.findOne({
//     _id: new ObjectId(id),
//     deletedAt: null,
//   });

//   if (!comment) throw new Error("not found");
//   if (comment.userId.toString() !== userId.toString())
//     throw new Error("Unauthorized");

//   await collection.updateOne(
//     { _id: new ObjectId(id) },
//     { $set: { deletedAt: new Date() } },
//   );

//   // If it's a reply, decrement parent's replyCount
//   if (comment.parentId) {
//     await collection.updateOne(
//       { _id: new ObjectId(comment.parentId) },
//       { $inc: { replyCount: -1 } }
//     );
//   }

//   await collection.updateMany(
//     { parentId: new ObjectId(id) },
//     { $set: { deletedAt: new Date() } },
//   );

//   const replies = await collection
//     .find({ parentId: new ObjectId(id), deletedAt: null })
//     .project({ _id: 1 })
//     .toArray();

//   const totalToDelete = 1 + replies.length;

//   const replyIds = replies.map((r) => r._id);

//   await db.collection("commentLikes").deleteMany({
//     commentId: { $in: [new ObjectId(id), ...replyIds] },
//   });

//   await db
//     .collection("stories")
//     .updateOne(
//       { _id: comment.storyId },
//       { $inc: { commentCount: -totalToDelete } },
//     );

//   return { success: true };
// };

module.exports = {
  createComment,
  getCommentsByStory,
  updateComment,
  deleteComment,
};
