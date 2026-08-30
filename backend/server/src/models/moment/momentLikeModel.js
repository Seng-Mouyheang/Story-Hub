const {
  connectToDatabase,
  getClient,
} = require("../../configuration/dbConfig");
const { ObjectId } = require("mongodb");

const toggleLikeMoment = async (userId, momentId) => {
  const db = await connectToDatabase();
  const client = getClient();
  const session = client.startSession();

  const momentObjectId = new ObjectId(momentId);
  const userObjectId = new ObjectId(userId);

  try {
    let result;

    await session.withTransaction(async () => {
      const likesCollection = db.collection("momentLikes");
      const momentsCollection = db.collection("moments");

      const existingLike = await likesCollection.findOne(
        { userId: userObjectId, momentId: momentObjectId },
        { session },
      );

      if (existingLike) {
        await likesCollection.deleteOne(
          { userId: userObjectId, momentId: momentObjectId },
          { session },
        );

        await momentsCollection.updateOne(
          { _id: momentObjectId, likesCount: { $gt: 0 } },
          { $inc: { likesCount: -1 } },
          { session },
        );

        result = { likedByCurrentUser: false };
      } else {
        await likesCollection.insertOne(
          {
            userId: userObjectId,
            momentId: momentObjectId,
            createdAt: new Date(),
          },
          { session },
        );

        const updateResult = await momentsCollection.updateOne(
          {
            _id: momentObjectId,
            expiresAt: { $gt: new Date() },
            pendingDeletion: { $ne: true },
          },
          { $inc: { likesCount: 1 } },
          { session },
        );

        if (updateResult.matchedCount === 0) {
          const notFoundError = new Error("Story not found");
          notFoundError.code = "MOMENT_NOT_FOUND";
          throw notFoundError;
        }

        result = { likedByCurrentUser: true };
      }
    });

    const moment = await db
      .collection("moments")
      .findOne({ _id: momentObjectId }, { projection: { likesCount: 1 } });

    return {
      likedByCurrentUser: result.likedByCurrentUser,
      likesCount: moment?.likesCount || 0,
    };
  } catch (error) {
    // A concurrent duplicate request (double-tap, retry, two tabs) can race
    // to insert the like row first and win — the unique index on
    // (userId, momentId) then rejects this one with E11000. Treat that as a
    // successful like rather than a 500, since the end state (liked, once)
    // is exactly what this request wanted anyway.
    if (error.code === 11000) {
      const moment = await db
        .collection("moments")
        .findOne({ _id: momentObjectId }, { projection: { likesCount: 1 } });

      return {
        likedByCurrentUser: true,
        likesCount: moment?.likesCount || 0,
      };
    }

    console.error("Transaction failed:", error);
    throw error;
  } finally {
    await session.endSession();
  }
};

const getLikedMomentIds = async (userId, momentIds) => {
  if (!momentIds || momentIds.length === 0) {
    return new Set();
  }

  const db = await connectToDatabase();
  const userObjectId = new ObjectId(userId);
  const momentObjectIds = momentIds.map((id) => new ObjectId(id));

  const likes = await db
    .collection("momentLikes")
    .find({ userId: userObjectId, momentId: { $in: momentObjectIds } })
    .project({ momentId: 1 })
    .toArray();

  return new Set(likes.map((like) => like.momentId.toString()));
};

module.exports = {
  toggleLikeMoment,
  getLikedMomentIds,
};
