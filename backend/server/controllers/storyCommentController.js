const commentModel = require("../models/storyCommentModel");

// POST /stories/:id/comments
const addComment = async (req, res) => {
  try {
    const storyId = req.params.id;
    const userId = req.user.userId;
    const { content, parentId } = req.body;

    const commentId = await commentModel.createComment({
      userId,
      storyId,
      content,
      parentId,
    });

    res.status(201).json({ commentId });
  } catch (error) {
    if (error.message === "Invalid parent comment") {
      return res.status(400).json({ message: error.message });
    }
    console.error(error);
    res.status(500).json({ message: "Failed to add comment" });
  }
};

// GET /stories/:id/comments
const getComments = async (req, res) => {
  try {
    const storyId = req.params.id;
    const { cursor } = req.query;
    const limit = parseInt(req.query.limit, 10) || 10;

    const result = await commentModel.getCommentsByStory(
      storyId,
      req.user?.userId,
      limit,
      cursor,
    );

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch comments" });
  }
};

// PUT /comments/:id
const updateComment = async (req, res) => {
  try {
    await commentModel.updateComment(req.params.id, req.user.userId, req.body);

    res.json({ message: "Comment updated" });
  } catch (error) {
    if (error.message === "not found") {
      return res.status(404).json({ message: "comment not found" });
    }
    if (error.message === "Unauthorized") {
      return res.status(403).json({ message: "Forbidden" });
    }
    res.status(500).json({ message: "Failed to update comment" });
  }
};

// DELETE /comments/:id
const deleteComment = async (req, res) => {
  try {
    await commentModel.deleteComment(req.user.userId, req.params.id);
    res.json({ message: "Comment deleted" });
  } catch (error) {
    if (error.message === "not found") {
      return res.status(404).json({ message: "Comment not found" });
    }
    if (error.message === "Unauthorized") {
      return res.status(403).json({ message: "Forbidden" });
    }
    console.error(error);
    res.status(500).json({ message: "Failed to delete comment" });
  }
};

module.exports = {
  addComment,
  getComments,
  updateComment,
  deleteComment,
};
