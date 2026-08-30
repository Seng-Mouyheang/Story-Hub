const commentLikeModel = require("../../models/moment/momentCommentLikeModel");

const toggleLikeComment = async (req, res) => {
  try {
    const commentId = req.params.id;
    const userId = req.user.userId;

    const result = await commentLikeModel.toggleLikeComment(userId, commentId);

    res.json(result);
  } catch (error) {
    console.error("Toggle comment like failed:", error);

    if (error.code === "COMMENT_NOT_FOUND") {
      return res.status(404).json({ message: "Comment not found" });
    }

    if (error.code === "MOMENT_NOT_ACTIVE") {
      return res.status(403).json({ message: "Cannot like this comment" });
    }

    res.status(500).json({ message: "Failed to toggle like" });
  }
};

module.exports = {
  toggleLikeComment,
};
