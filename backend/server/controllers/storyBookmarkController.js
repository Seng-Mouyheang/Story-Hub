const storyBookmarkModel = require("../models/storyBookmarkModel");
const storyModel = require("../models/storyModel");

const toggleStoryBookmark = async (req, res) => {
  try {
    const story = await storyModel.getStoryById(req.params.id);

    if (
      story?.status !== "published" ||
      story.visibility !== "public" ||
      story.deletedAt
    ) {
      return res.status(403).json({ message: "Cannot bookmark this story" });
    }

    const result = await storyBookmarkModel.toggleStoryBookmark(
      req.user.userId,
      req.params.id,
    );

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to toggle bookmark" });
  }
};

const removeStoryBookmark = async (req, res) => {
  try {
    const result = await storyBookmarkModel.removeStoryBookmark(
      req.user.userId,
      req.params.id,
    );

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to remove bookmark" });
  }
};

const getBookmarkStatus = async (req, res) => {
  try {
    const savedByCurrentUser = await storyBookmarkModel.hasUserBookmarkedStory(
      req.user.userId,
      req.params.id,
    );

    res.json({
      storyId: req.params.id,
      savedByCurrentUser,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch bookmark status" });
  }
};

const getMyBookmarkedStories = async (req, res) => {
  try {
    const { cursor } = req.query;
    const limit = Number.parseInt(req.query.limit, 10) || 10;

    const result = await storyBookmarkModel.getUserBookmarkedStories(
      req.user.userId,
      cursor,
      limit,
    );

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch bookmarked stories" });
  }
};

module.exports = {
  toggleStoryBookmark,
  removeStoryBookmark,
  getBookmarkStatus,
  getMyBookmarkedStories,
};
