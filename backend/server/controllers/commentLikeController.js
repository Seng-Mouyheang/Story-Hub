const commentLikeModel = require("../models/commentLikeModel");
const commentModel = require("../models/storyCommentModel");

// const getCommentLikes = async (req, res) => {
//   try {
//     const commentId = req.params.id;
//     const comment = await commentModel.getCommentById(commentId);

//     if (!comment) {
//       return res.status(404).json({ message: "Comment not found" });
//     }

//     res.json({
//       likedByCurrentUser: null,
//       likesCount: comment.likesCount,
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Failed to fetch comment likes" });
//   }
// };

const toggleLikeComment = async (req, res) => {
  try {
    const commentId = req.params.id;
    const comment = await commentModel.getCommentById(commentId);

    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    const userId = req.user.userId;

    await commentLikeModel.toggleLikeComment(userId, commentId);
  
    const updatedComment = await commentModel.getCommentById(commentId, userId);

    res.json(updatedComment);
  } catch (error) {
    console.error("Toggle comment like failed:", error);
    res.status(500).json({ message: "Failed to toggle like" });
  }
};

module.exports = {
  // getCommentLikes,
  toggleLikeComment,
};
