const storyLikeModel = require("../models/storyLikeModel");
const storyModel = require("../models/storyModel");

// const likeStory = async (req, res) => {
//   try {
//     const story = await storyModel.getStoryById(req.params.id);

//     if (!story) {
//       return res.status(404).json({ message: "Story not found" });
//     }

//     // Only allow liking public published stories
//     if (
//       story.status !== "published" ||
//       story.visibility !== "public" ||
//       story.deletedAt !== null
//     ) {
//       return res.status(403).json({ message: "Cannot like this story" });
//     }

//     await storyLikeModel.likeStory(req.user.userId, req.params.id);

//     res.json({ message: "Story liked" });
//   } catch (error) {
//     if (error.code === 11000) {
//       return res.status(400).json({ message: "Already liked" });
//     }

//     console.error(error);
//     res.status(500).json({ message: "Failed to like story" });
//   }
// };

// const unlikeStory = async (req, res) => {
//   try {
//     await storyLikeModel.unlikeStory(req.user.userId, req.params.id);

//     res.json({ message: "Story unliked" });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Failed to unlike story" });
//   }
// };

const getStoryLikes = async (req, res) => {
  try {
    const storyId = req.params.id;
    const story = await storyModel.getStoryById(storyId);
    // const userId = req.user?.userId;

    if (!story) {
      return res.status(404).json({ message: "Story not found" });
    }

    const likesCount = story.likesCount;

    // const likesCount = await storyLikeModel.countLikes(storyId);

    // const likedByCurrentUser = userId
    //   ? await storyLikeModel.hasUserLiked(userId, storyId)
    //   : false;

    res.json({
      likesCount,
      // likedByCurrentUser,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch likes" });
  }
};

const toggleLikeStory = async (req, res) => {
  try {
    const story = await storyModel.getStoryById(req.params.id);

    if (
      !story ||
      story.status !== "published" ||
      story.visibility !== "public" ||
      story.deletedAt
    ) {
      return res.status(403).json({ message: "Cannot like this story" });
    }

    const userId = req.user.userId;
    const storyId = req.params.id;

    const result = await storyLikeModel.toggleLikeStory(userId, storyId);

    res.json(result); // { likedByCurrentUser, likesCount }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to toggle like" });
  }
};

module.exports = {
  // likeStory,
  // unlikeStory,
  getStoryLikes,
  toggleLikeStory,
};
