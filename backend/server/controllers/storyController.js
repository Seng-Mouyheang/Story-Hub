const storyModel = require("../models/storyModel");

const createStory = async (req, res) => {
  try {
    const storyId = await storyModel.createStory({
      ...req.body,
      authorId: req.user.userId,
    });

    res.status(201).json({ storyId });
  } catch (error) {
    res.status(500).json({ message: "Failed to create story" });
  }
};

// Offset Pagination
// const getAllStories = async (req, res) => {
//   try {
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 10;

//     const stories = await storyModel.getPublishedStories(page, limit);

//     res.json(stories);
//   } catch (error) {
//     res.status(500).json({ message: "Failed to fetch stories" });
//   }
// };

// Cursor Pagination
const getAllStories = async (req, res) => {
  try {
    const { cursor } = req.query;
    const limit = parseInt(req.query.limit, 10) || 10;

    const result = await storyModel.getPublishedStories(cursor, limit);

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

const getStory = async (req, res) => {
  try {
    const story = await storyModel.getStoryById(req.params.id);

    if (!story) {
      return res.status(404).json({ message: "Story not found" });
    }

    // If draft → only author can view
    if (story.status === "draft") {
      if (!req.user || story.authorId.toString() !== req.user.userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
    }

    if (story.visibility === "private") {
      if (!req.user || story.authorId.toString() !== req.user.userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
    }

    if (story.status === "published" && story.visibility === "public") {
      await storyModel.incrementViews(story._id);
    }

    res.json(story);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch story" });
  }
};

const updateStory = async (req, res) => {
  try {
    await storyModel.updateStory(req.params.id, req.user.userId, req.body);

    res.json({ message: "Story updated" });
  } catch (error) {
    if (error.message === "not found") {
      return res.status(404).json({ message: "Story not found" });
    }
    if (error.message === "Unauthorized") {
      return res.status(403).json({ message: "Forbidden" });
    }
    res.status(500).json({ message: "Failed to update story" });
  }
};

const deleteStory = async (req, res) => {
  try {
    await storyModel.deleteStory(req.params.id, req.user.userId);

    res.json({ message: "Story deleted" });
  } catch (error) {
    if (error.message === "not found") {
      return res.status(404).json({ message: "Story not found" });
    }
    if (error.message === "Unauthorized") {
      return res.status(403).json({ message: "Forbidden" });
    }
    res.status(500).json({ message: "Failed to delete story" });
  }
};

const getMyStories = async (req, res) => {
  try {
    const { cursor } = req.query;
    const limit = parseInt(req.query.limit, 10) || 10;

    const result = await storyModel.getUserStories(
      req.user.userId,
      limit,
      cursor,
    );

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch user stories" });
  }
};

module.exports = {
  createStory,
  getAllStories,
  getStory,
  updateStory,
  deleteStory,

  getMyStories,
};
