const momentModel = require("../../models/moment/momentModel");
const followModel = require("../../models/profile/followModel");

const getAllFollowingIds = async (userId) => {
  const ids = [];
  let cursor = null;

  for (;;) {
    const { data, nextCursor, hasMore } = await followModel.getFollowingUserIds(
      userId,
      { cursor, limit: 200 },
    );
    ids.push(...data);

    if (!hasMore) break;
    cursor = nextCursor;
  }

  return ids;
};

const createMoment = async (req, res) => {
  try {
    const { type, text, backgroundColor, imageUrl } = req.body;

    const momentId = await momentModel.createMoment({
      authorId: req.user.userId,
      type,
      text,
      backgroundColor,
      imageUrl,
    });

    res.status(201).json({ momentId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to post story" });
  }
};

const getFeedMoments = async (req, res) => {
  try {
    const userId = req.user.userId;
    const followingIds = await getAllFollowingIds(userId);
    const authorIds = [...new Set([userId, ...followingIds])];

    const groups = await momentModel.getFeedMoments(userId, authorIds);

    res.json({ groups });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to load stories" });
  }
};

const getMomentsByAuthor = async (req, res) => {
  try {
    const group = await momentModel.getMomentsByAuthor(
      req.params.id,
      req.user?.userId || null,
    );

    res.json(group);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to load story" });
  }
};

const viewMoment = async (req, res) => {
  try {
    await momentModel.markViewed(req.params.id, req.user.userId);
    res.json({ viewed: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update story" });
  }
};

const deleteMoment = async (req, res) => {
  try {
    const deleted = await momentModel.deleteMoment(
      req.params.id,
      req.user.userId,
    );

    if (!deleted) {
      return res.status(404).json({ message: "Story not found" });
    }

    res.json({ deleted: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete story" });
  }
};

module.exports = {
  createMoment,
  getFeedMoments,
  getMomentsByAuthor,
  viewMoment,
  deleteMoment,
};
