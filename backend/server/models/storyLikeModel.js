const { connectToDatabase } = require("../configuration/dbConfig");
const { ObjectId } = require("mongodb");

const COLLECTION_NAME = "storyLikes";

const getCollection = async () => {
  const db = await connectToDatabase();
  return db.collection(COLLECTION_NAME);
};

const likeStory = async (userId, storyId) => {
  const collection = await getCollection();

  return collection.insertOne({
    userId: new ObjectId(userId),
    storyId: new ObjectId(storyId),
    createdAt: new Date(),
  });
};

const unlikeStory = async (userId, storyId) => {
  const collection = await getCollection();

  return collection.deleteOne({
    userId: new ObjectId(userId),
    storyId: new ObjectId(storyId),
  });
};

const countLikes = async (storyId) => {
  const collection = await getCollection();
  return collection.countDocuments({
    storyId: new ObjectId(storyId),
  });
};

const hasUserLiked = async (userId, storyId) => {
  const collection = await getCollection();

  const like = await collection.findOne({
    userId: new ObjectId(userId),
    storyId: new ObjectId(storyId),
  });

  return !!like; // Returns true if the user has liked the story, false otherwise
};

// Toggle function
const toggleLikeStory = async (userId, storyId) => {
  const db = await connectToDatabase();
  const liked = await hasUserLiked(userId, storyId);

  if (liked) {
    await unlikeStory(userId, storyId);
    if (result.deletedCount === 1) {
      await db
        .collection("stories")
        .updateOne({ _id: storyId }, { $inc: { likesCount: -1 } });
    }
  } else {
    await likeStory(userId, storyId);
    await db
      .collection("stories")
      .updateOne({ _id: storyId }, { $inc: { likesCount: 1 } });
  }

  const likesCount = await countLikes(storyId);
  return {
    likedByCurrentUser: !liked,
    likesCount,
  };
};

module.exports = {
  likeStory,
  unlikeStory,
  countLikes,
  hasUserLiked,
  toggleLikeStory,
};
