const searchModel = require("../../models/search/searchModel");

const globalSearch = async (req, res) => {
  try {
    const { q, limit = 8 } = req.query;

    const result = await searchModel.searchGlobal(q, limit, req.user?.userId);

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to perform search" });
  }
};

const searchMyStories = async (req, res) => {
  try {
    const {
      title,
      category,
      tag,
      includeDeleted = false,
      limit = 20,
    } = req.query;

    const result = await searchModel.searchMyStories(
      {
        title,
        category,
        tag,
        includeDeleted,
        limit,
      },
      req.user.userId,
    );

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to search user stories" });
  }
};

module.exports = {
  globalSearch,
  searchMyStories,
};
