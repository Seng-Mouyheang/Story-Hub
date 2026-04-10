const storyLikeModel = require("../../models/story/storyLikeModel");
const storyModel = require("../../models/story/storyModel");

const getStoryLikes = async (req, res) => {
  try {
    const storyId = req.params.id;
    const story = await storyModel.getStoryById(storyId);

    if (!story) {
      return res.status(404).json({ message: "Story not found" });
    }

    const likesCount = story.likesCount;

    res.json({
      likesCount,
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
      story?.status !== "published" ||
      story.visibility !== "public" ||
      story.deletedAt
    ) {
      return res.status(403).json({ message: "Cannot like this story" });
    }

    const userId = req.user.userId;
    const storyId = req.params.id;

    const result = await storyLikeModel.toggleLikeStory(userId, storyId);

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to toggle like" });
  }
};

module.exports = {
  getStoryLikes,
  toggleLikeStory,
};
