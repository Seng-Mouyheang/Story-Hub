const { connectToDatabase, getClient } = require("../configuration/dbConfig");
const { ObjectId } = require("mongodb");

const toggleLikeComment = async (userId, commentId) => {
  const db = await connectToDatabase();
  const client = getClient();
  const session = client.startSession();

  const commentObjectId = new ObjectId(commentId);
  const userObjectId = new ObjectId(userId);

  try {
    let toggleResult;

    await session.withTransaction(async () => {
      const likesCollection = db.collection("commentLikes");
      const commentsCollection = db.collection("storyComments");

      const existingLike = await likesCollection.findOne(
        { userId: userObjectId, commentId: commentObjectId },
        { session },
      );

      if (existingLike) {
        await likesCollection.deleteOne(
          { userId: userObjectId, commentId: commentObjectId },
          { session },
        );

        await commentsCollection.updateOne(
          { _id: commentObjectId, likesCount: { $gt: 0 } },
          { $inc: { likesCount: -1 } },
          { session },
        );

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

        await commentsCollection.updateOne(
          { _id: commentObjectId, deletedAt: null },
          { $inc: { likesCount: 1 } },
          { session },
        );

        toggleResult = { likedByCurrentUser: true };
      }
    });

    const comment = await commentsCollection.findOne(
      { _id: commentObjectId, deletedAt: null },
      { projection: { likesCount: 1 } },
    );

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
