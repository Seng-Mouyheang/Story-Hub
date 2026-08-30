const momentLikeModel = require("../../models/moment/momentLikeModel");
const momentModel = require("../../models/moment/momentModel");

const { isMomentActive } = momentModel;

const getMomentLikes = async (req, res) => {
  try {
    const moment = await momentModel.getMomentById(req.params.id);

    if (!isMomentActive(moment)) {
      return res.status(404).json({ message: "Story not found" });
    }

    const likedByCurrentUser = req.user?.userId
      ? (
          await momentLikeModel.getLikedMomentIds(req.user.userId, [
            req.params.id,
          ])
        ).has(req.params.id)
      : false;

    res.json({ likesCount: moment.likesCount || 0, likedByCurrentUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch likes" });
  }
};

const toggleLikeMoment = async (req, res) => {
  try {
    const moment = await momentModel.getMomentById(req.params.id);

    if (!isMomentActive(moment)) {
      return res.status(403).json({ message: "Cannot like this story" });
    }

    const result = await momentLikeModel.toggleLikeMoment(
      req.user.userId,
      req.params.id,
    );

    res.json(result);
  } catch (error) {
    if (error.code === "MOMENT_NOT_FOUND") {
      return res.status(403).json({ message: "Cannot like this story" });
    }
    console.error(error);
    res.status(500).json({ message: "Failed to toggle like" });
  }
};

module.exports = {
  getMomentLikes,
  toggleLikeMoment,
};
