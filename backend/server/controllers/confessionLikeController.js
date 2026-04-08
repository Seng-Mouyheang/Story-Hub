const confessionLikeModel = require("../models/confessionLikeModel");
const confessionModel = require("../models/confessionModel");

const getConfessionLikes = async (req, res) => {
  try {
    const confessionId = req.params.id;
    const confession = await confessionModel.getConfessionById(confessionId);

    if (!confession) {
      return res.status(404).json({ message: "Confession not found" });
    }

    const likesCount = confession.likesCount;

    res.json({
      likesCount,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch likes" });
  }
};

const toggleLikeConfession = async (req, res) => {
  try {
    const confession = await confessionModel.getConfessionById(req.params.id);

    if (!confession) {
      return res.status(404).json({ message: "Confession not found" });
    }

    if (confession.visibility !== "public") {
      return res.status(403).json({ message: "Cannot like this confession" });
    }

    const userId = req.user.userId;
    const confessionId = req.params.id;

    const result = await confessionLikeModel.toggleLikeConfession(
      userId,
      confessionId,
    );

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to toggle like" });
  }
};

module.exports = {
  getConfessionLikes,
  toggleLikeConfession,
};
