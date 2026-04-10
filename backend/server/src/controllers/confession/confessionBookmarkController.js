const confessionBookmarkModel = require("../../models/confession/confessionBookmarkModel");
const confessionModel = require("../../models/confession/confessionModel");

const toggleConfessionBookmark = async (req, res) => {
  try {
    const confession = await confessionModel.getConfessionById(req.params.id);

    if (confession?.visibility !== "public" || confession.deletedAt) {
      return res
        .status(403)
        .json({ message: "Cannot bookmark this confession" });
    }

    const result = await confessionBookmarkModel.toggleConfessionBookmark(
      req.user.userId,
      req.params.id,
    );

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to toggle bookmark" });
  }
};

const removeConfessionBookmark = async (req, res) => {
  try {
    const result = await confessionBookmarkModel.removeConfessionBookmark(
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
    const savedByCurrentUser =
      await confessionBookmarkModel.hasUserBookmarkedConfession(
        req.user.userId,
        req.params.id,
      );

    res.json({
      confessionId: req.params.id,
      savedByCurrentUser,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch bookmark status" });
  }
};

const getMyBookmarkedConfessions = async (req, res) => {
  try {
    const { cursor } = req.query;
    const limit = Number.parseInt(req.query.limit, 10) || 10;

    const result = await confessionBookmarkModel.getUserBookmarkedConfessions(
      req.user.userId,
      cursor,
      limit,
    );

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch bookmarked confessions" });
  }
};

module.exports = {
  toggleConfessionBookmark,
  removeConfessionBookmark,
  getBookmarkStatus,
  getMyBookmarkedConfessions,
};
