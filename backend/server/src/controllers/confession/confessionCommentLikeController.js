const commentLikeModel = require("../../models/confession/confessionCommentLikeModel");
const commentModel = require("../../models/confession/confessionCommentModel");

const toggleLikeComment = async (req, res) => {
  try {
    const commentId = req.params.id;
    const userId = req.user.userId;

    await commentLikeModel.toggleLikeComment(userId, commentId);

    const updatedComment = await commentModel.getCommentById(commentId, userId);

    if (!updatedComment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    res.json(updatedComment);
  } catch (error) {
    console.error("Toggle comment like failed:", error);

    if (error.code === "COMMENT_NOT_FOUND") {
      return res.status(404).json({ message: "Comment not found" });
    }

    res.status(500).json({ message: "Failed to toggle like" });
  }
};

module.exports = {
  toggleLikeComment,
};
