const {
  connectToDatabase,
  getClient,
} = require("../../configuration/dbConfig");
const { ObjectId } = require("mongodb");

const toggleLikeComment = async (userId, commentId) => {
  const db = await connectToDatabase();
  const client = getClient();
  const session = client.startSession();

  const commentObjectId = new ObjectId(commentId);
  const userObjectId = new ObjectId(userId);

  const likesCollection = db.collection("momentCommentLikes");
  const commentsCollection = db.collection("momentComments");
  const momentsCollection = db.collection("moments");

  try {
    let toggleResult;

    await session.withTransaction(async () => {
      const comment = await commentsCollection.findOne(
        { _id: commentObjectId, deletedAt: null },
        { session, projection: { momentId: 1 } },
      );

      if (!comment) {
        const notFoundError = new Error("Comment not found");
        notFoundError.code = "COMMENT_NOT_FOUND";
        throw notFoundError;
      }

      // Mirrors createComment's enforcement (momentCommentModel.js) — a
      // comment whose parent story has expired or is pending deletion
      // shouldn't still be likeable, since the story (and this comment
      // along with it) is on its way out.
      const activeMoment = await momentsCollection.findOne(
        {
          _id: comment.momentId,
          expiresAt: { $gt: new Date() },
          pendingDeletion: { $ne: true },
        },
        { session, projection: { _id: 1 } },
      );

      if (!activeMoment) {
        const inactiveError = new Error("Story is no longer active");
        inactiveError.code = "MOMENT_NOT_ACTIVE";
        throw inactiveError;
      }

      const existingLike = await likesCollection.findOne(
        { userId: userObjectId, commentId: commentObjectId },
        { session },
      );

      if (existingLike) {
        await likesCollection.deleteOne(
          { userId: userObjectId, commentId: commentObjectId },
          { session },
        );

        const updateResult = await commentsCollection.updateOne(
          { _id: commentObjectId, deletedAt: null },
          [
            {
              $set: {
                likesCount: {
                  $cond: [
                    { $gt: ["$likesCount", 0] },
                    { $subtract: ["$likesCount", 1] },
                    0,
                  ],
                },
              },
            },
          ],
          { session },
        );

        if (updateResult.matchedCount === 0) {
          const notFoundError = new Error("Comment not found");
          notFoundError.code = "COMMENT_NOT_FOUND";
          throw notFoundError;
        }

        toggleResult = { likedByCurrentUser: false };
      } else {
        await likesCollection.insertOne(
          {
            userId: userObjectId,
            commentId: commentObjectId,
            createdAt: new Date(),
          },
          { session },
        );

        const updateResult = await commentsCollection.updateOne(
          { _id: commentObjectId, deletedAt: null },
          { $inc: { likesCount: 1 } },
          { session },
        );

        if (updateResult.matchedCount === 0) {
          const notFoundError = new Error("Comment not found");
          notFoundError.code = "COMMENT_NOT_FOUND";
          throw notFoundError;
        }

        toggleResult = { likedByCurrentUser: true };
      }
    });

    const comment = await commentsCollection.findOne(
      { _id: commentObjectId, deletedAt: null },
      { projection: { likesCount: 1 } },
    );

    if (!comment) {
      const notFoundError = new Error("Comment not found");
      notFoundError.code = "COMMENT_NOT_FOUND";
      throw notFoundError;
    }

    return {
      likedByCurrentUser: toggleResult.likedByCurrentUser,
      likesCount: comment.likesCount,
    };
  } catch (error) {
    // A concurrent duplicate request can race to insert the like row first
    // — the unique index on (userId, commentId) then rejects this one with
    // E11000. Treat that as a successful like rather than a 500.
    if (error.code === 11000) {
      const comment = await commentsCollection.findOne(
        { _id: commentObjectId, deletedAt: null },
        { projection: { likesCount: 1 } },
      );

      if (comment) {
        return { likedByCurrentUser: true, likesCount: comment.likesCount };
      }
    }

    console.error("Transaction failed:", error);
    throw error;
  } finally {
    await session.endSession();
  }
};

module.exports = { toggleLikeComment };
