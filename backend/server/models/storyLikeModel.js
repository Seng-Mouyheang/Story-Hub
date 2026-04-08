const { connectToDatabase, getClient } = require("../configuration/dbConfig");
const { ObjectId } = require("mongodb");

const toggleLikeStory = async (userId, storyId) => {
  const db = await connectToDatabase();
  const client = getClient();
  const session = client.startSession();

  const storyObjectId = new ObjectId(storyId);
  const userObjectId = new ObjectId(userId);

  try {
    let result;

    await session.withTransaction(async () => {
      const likesCollection = db.collection("storyLikes");
      const storiesCollection = db.collection("stories");

      const existingLike = await likesCollection.findOne(
        { userId: userObjectId, storyId: storyObjectId },
        { session },
      );

      if (existingLike) {
        await likesCollection.deleteOne(
          { userId: userObjectId, storyId: storyObjectId },
          { session },
        );

        await storiesCollection.updateOne(
          { _id: storyObjectId, likesCount: { $gt: 0 } },
          { $inc: { likesCount: -1 } },
          { session },
        );

        result = { likedByCurrentUser: false };
      } else {
        await likesCollection.insertOne(
          {
            userId: userObjectId,
            storyId: storyObjectId,
            createdAt: new Date(),
          },
          { session },
        );

        const updateResult = await storiesCollection.updateOne(
          { _id: storyObjectId, deletedAt: null },
          { $inc: { likesCount: 1 } },
          { session },
        );

        if (updateResult.matchedCount === 0) {
          const notFoundError = new Error("Story not found");
          notFoundError.code = "STORY_NOT_FOUND";
          throw notFoundError;
        }

        result = { likedByCurrentUser: true };
      }
    });

    const story = await db
      .collection("stories")
      .findOne({ _id: storyObjectId }, { projection: { likesCount: 1 } });

    return {
      likedByCurrentUser: result.likedByCurrentUser,
      likesCount: story.likesCount,
    };
  } catch (error) {
    console.error("Transaction failed:", error);
    throw error;
  } finally {
    await session.endSession();
  }
};

module.exports = {
  toggleLikeStory,
};
