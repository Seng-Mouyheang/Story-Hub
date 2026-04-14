const storyModel = require("../../models/story/storyModel");
const profileModel = require("../../models/profile/profileModel");

const parseCategoryQuery = (categoriesInput) => {
  if (Array.isArray(categoriesInput)) {
    return [...new Set(categoriesInput.map((item) => item.trim()))].filter(
      Boolean,
    );
  }

  if (typeof categoriesInput !== "string") {
    return [];
  }

  return [...new Set(categoriesInput.split(",").map((item) => item.trim()))]
    .filter(Boolean)
    .slice(0, 20);
};

const createStory = (req, res) => {
  storyModel
    .createStory({
      ...req.body,
      authorId: req.user.userId,
    })
    .then((storyId) => {
      res.status(201).json({ storyId });
    })
    .catch(() => {
      res.status(500).json({ message: "Failed to create story" });
    });
};

// Cursor Pagination
const getAllStories = async (req, res) => {
  try {
    const { cursor } = req.query;
    const limit = Number.parseInt(req.query.limit, 10) || 10;

    const result = await storyModel.getPublishedStories(
      cursor,
      limit,
      req.user?.userId,
    );

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

const getStoriesByTag = async (req, res) => {
  try {
    const { cursor } = req.query;
    const limit = Number.parseInt(req.query.limit, 10) || 10;

    const result = await storyModel.getPublishedStoriesByTag(
      req.params.tag,
      cursor,
      limit,
      req.user?.userId,
    );

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch stories by tag" });
  }
};

const getStoriesByCategories = async (req, res) => {
  try {
    const { cursor, categories } = req.query;
    const limit = Number.parseInt(req.query.limit, 10) || 10;
    const parsedCategories = parseCategoryQuery(categories);

    const result = await storyModel.getPublishedStoriesByCategories(
      parsedCategories,
      cursor,
      limit,
      req.user?.userId,
    );

    res.json({
      ...result,
      categories: parsedCategories,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch stories by categories" });
  }
};

const getStoriesByMyInterests = async (req, res) => {
  try {
    const { cursor } = req.query;
    const limit = Number.parseInt(req.query.limit, 10) || 10;

    const profile = await profileModel.getProfileByUserId(req.user.userId);
    const interests = parseCategoryQuery(profile?.interest || []);

    if (!interests.length) {
      return res.json({
        data: [],
        nextCursor: null,
        hasMore: false,
        interests,
      });
    }

    const result = await storyModel.getPublishedStoriesByCategories(
      interests,
      cursor,
      limit,
      req.user.userId,
    );

    res.json({
      ...result,
      interests,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch stories by interests" });
  }
};

const getStoriesByTitle = async (req, res) => {
  try {
    const { cursor, q } = req.query;
    const limit = Number.parseInt(req.query.limit, 10) || 10;

    const result = await storyModel.getPublishedStoriesByTitle(
      q,
      cursor,
      limit,
      req.user?.userId,
    );

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch stories by title" });
  }
};

const getStory = async (req, res) => {
  try {
    const story = await storyModel.getStoryById(
      req.params.id,
      req.user?.userId,
    );

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
  } catch {
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

const restoreStory = async (req, res) => {
  try {
    await storyModel.restoreStory(req.params.id, req.user.userId);

    res.json({ message: "Story restored" });
  } catch (error) {
    if (error.message === "not found") {
      return res.status(404).json({ message: "Story not found" });
    }
    if (error.message === "Unauthorized") {
      return res.status(403).json({ message: "Forbidden" });
    }
    if (error.message === "Already active") {
      return res.status(400).json({ message: "Story is already active" });
    }
    res.status(500).json({ message: "Failed to restore story" });
  }
};

const getMyStories = async (req, res) => {
  try {
    const { cursor } = req.query;
    const limit = Number.parseInt(req.query.limit, 10) || 10;

    const result = await storyModel.getUserStories(
      req.user.userId,
      cursor,
      limit,
    );

    res.json(result);
  } catch {
    res.status(500).json({ message: "Failed to fetch user stories" });
  }
};

const getMyDeletedStories = async (req, res) => {
  try {
    const { cursor } = req.query;
    const limit = Number.parseInt(req.query.limit, 10) || 10;

    const result = await storyModel.getDeletedUserStories(
      req.user.userId,
      cursor,
      limit,
    );

    res.json(result);
  } catch {
    res.status(500).json({ message: "Failed to fetch deleted stories" });
  }
};

module.exports = {
  createStory,
  getAllStories,
  getStoriesByTag,
  getStoriesByCategories,
  getStoriesByMyInterests,
  getStoriesByTitle,
  getStory,
  updateStory,
  deleteStory,
  restoreStory,
  getMyStories,
  getMyDeletedStories,
};
