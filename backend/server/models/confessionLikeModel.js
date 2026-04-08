const { connectToDatabase, getClient } = require("../configuration/dbConfig");
const { ObjectId } = require("mongodb");

const toggleLikeConfession = async (userId, confessionId) => {
  const db = await connectToDatabase();
  const client = getClient();
  const session = client.startSession();

  const confessionObjectId = new ObjectId(confessionId);
  const userObjectId = new ObjectId(userId);

  try {
    let result;

    await session.withTransaction(async () => {
      const likesCollection = db.collection("confessionLikes");
      const confessionsCollection = db.collection("confessions");

      const existingLike = await likesCollection.findOne(
        { userId: userObjectId, confessionId: confessionObjectId },
        { session },
      );

      if (existingLike) {
        await likesCollection.deleteOne(
          { userId: userObjectId, confessionId: confessionObjectId },
          { session },
        );

        await confessionsCollection.updateOne(
          { _id: confessionObjectId, likesCount: { $gt: 0 } },
          { $inc: { likesCount: -1 } },
          { session },
        );

        result = { likedByCurrentUser: false };
      } else {
        await likesCollection.insertOne(
          {
            userId: userObjectId,
            confessionId: confessionObjectId,
            createdAt: new Date(),
          },
          { session },
        );

        const updateResult = await confessionsCollection.updateOne(
          { _id: confessionObjectId, deletedAt: null },
          { $inc: { likesCount: 1 } },
          { session },
        );

        if (updateResult.matchedCount === 0) {
          const notFoundError = new Error("Confession not found");
          notFoundError.code = "CONFESSION_NOT_FOUND";
          throw notFoundError;
        }

        result = { likedByCurrentUser: true };
      }
    });

    const confession = await db
      .collection("confessions")
      .findOne({ _id: confessionObjectId }, { projection: { likesCount: 1 } });

    return {
      likedByCurrentUser: result.likedByCurrentUser,
      likesCount: confession.likesCount,
    };
  } catch (error) {
    console.error("Transaction failed:", error);
    throw error;
  } finally {
    await session.endSession();
  }
};

module.exports = {
  toggleLikeConfession,
};
