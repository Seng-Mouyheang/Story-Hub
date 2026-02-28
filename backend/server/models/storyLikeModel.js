const { connectToDatabase, getClient } = require("../configuration/dbConfig");
const { ObjectId } = require("mongodb");

// const COLLECTION_NAME = "storyLikes";

// const getCollection = async () => {
//   const db = await connectToDatabase();
//   return db.collection(COLLECTION_NAME);
// };

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
        { session }
      );

      if (existingLike) {
        await likesCollection.deleteOne(
          { userId: userObjectId, storyId: storyObjectId },
          { session }
        );

        await storiesCollection.updateOne(
          { _id: storyObjectId, likesCount: { $gt: 0 } },
          { $inc: { likesCount: -1 } },
          { session }
        );

        result = { likedByCurrentUser: false };
      } else {
        await likesCollection.insertOne(
          {
            userId: userObjectId,
            storyId: storyObjectId,
            createdAt: new Date(),
          },
          { session }
        );

        await storiesCollection.updateOne(
          { _id: storyObjectId },
          { $inc: { likesCount: 1 } },
          { session }
        );

        result = { likedByCurrentUser: true };
      }
    });

    const story = await db.collection("stories").findOne(
      { _id: storyObjectId },
      { projection: { likesCount: 1 } }
    );

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

// const likeStory = async (userId, storyId) => {
//   const collection = await getCollection();

//   return collection.insertOne({
//     userId: new ObjectId(userId),
//     storyId: new ObjectId(storyId),
//     createdAt: new Date(),
//   });
// };

// const unlikeStory = async (userId, storyId) => {
//   const collection = await getCollection();

//   return collection.deleteOne({
//     userId: new ObjectId(userId),
//     storyId: new ObjectId(storyId),
//   });
// };

// const countLikes = async (storyId) => {
//   const collection = await getCollection();
//   return collection.countDocuments({
//     storyId: new ObjectId(storyId),
//   });
// };

// const hasUserLiked = async (userId, storyId) => {
//   const collection = await getCollection();

//   const like = await collection.findOne({
//     userId: new ObjectId(userId),
//     storyId: new ObjectId(storyId),
//   });

//   return !!like; // Returns true if the user has liked the story, false otherwise
// };

// // Toggle function
// const toggleLikeStory = async (userId, storyId) => {
//   const db = await connectToDatabase();
//   const liked = await hasUserLiked(userId, storyId);

//   if (liked) {
//     await unlikeStory(userId, storyId);
//     if (result.deletedCount === 1) {
//       await db
//         .collection("stories")
//         .updateOne({ _id: storyId }, { $inc: { likesCount: -1 } });
//     }
//   } else {
//     await likeStory(userId, storyId);
//     await db
//       .collection("stories")
//       .updateOne({ _id: storyId }, { $inc: { likesCount: 1 } });
//   }

//   const likesCount = await countLikes(storyId);
//   return {
//     likedByCurrentUser: !liked,
//     likesCount,
//   };
// };

module.exports = {
  // likeStory,
  // unlikeStory,
  // countLikes,
  // hasUserLiked,
  toggleLikeStory,
};
