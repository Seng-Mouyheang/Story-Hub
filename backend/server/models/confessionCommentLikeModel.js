const { connectToDatabase, getClient } = require("../configuration/dbConfig");
const { ObjectId } = require("mongodb");

const toggleLikeComment = async (userId, commentId) => {
  const db = await connectToDatabase();
  const client = getClient();
  const session = client.startSession();

  const commentObjectId = new ObjectId(commentId);
  const userObjectId = new ObjectId(userId);

  const likesCollection = db.collection("confessionCommentLikes");
  const commentsCollection = db.collection("confessionComments");

  try {
    let toggleResult;

    await session.withTransaction(async () => {
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
          { $inc: { likesCount: -1 } },
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
    console.error("Transaction failed:", error);
    throw error;
  } finally {
    await session.endSession();
  }
};

module.exports = { toggleLikeComment };
