const searchModel = require("../models/searchModel");

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

module.exports = {
  globalSearch,
};
