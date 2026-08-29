const commentModel = require("../../models/moment/momentCommentModel");
const momentModel = require("../../models/moment/momentModel");

const isMomentActive = (moment) =>
  Boolean(moment) &&
  !moment.pendingDeletion &&
  new Date(moment.expiresAt) > new Date();

// POST /moments/:id/comments
const addComment = async (req, res) => {
  try {
    const momentId = req.params.id;
    const userId = req.user.userId;
    const { content, parentId } = req.body;

    const moment = await momentModel.getMomentById(momentId);

    if (!isMomentActive(moment)) {
      return res.status(403).json({ message: "Cannot comment on this story" });
    }

    const commentId = await commentModel.createComment({
      userId,
      momentId,
      content,
      parentId,
    });

    res.status(201).json({ commentId });
  } catch (error) {
    const validationMessages = [
      "Invalid parent comment",
      "Nested replies not allowed",
      "Content is required",
    ];
    if (validationMessages.includes(error.message)) {
      return res.status(400).json({ message: error.message });
    }
    console.error(error);
    res.status(500).json({ message: "Failed to add comment" });
  }
};

// GET /moments/:id/comments
const getComments = async (req, res) => {
  try {
    const momentId = req.params.id;
    const { cursor } = req.query || null;
    const limit = Number.parseInt(req.query.limit, 10) || 10;
    const userId = req.user?.userId || null;

    const moment = await momentModel.getMomentById(momentId);

    if (!isMomentActive(moment)) {
      return res.status(404).json({ message: "Story not found" });
    }

    const result = await commentModel.getCommentsByMoment(
      momentId,
      userId,
      limit,
      cursor,
    );

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch comments" });
  }
};

// GET /moments/comments/:id/replies
const getReplies = async (req, res) => {
  try {
    const commentId = req.params.id;
    const { cursor } = req.query || null;
    const limit = Number.parseInt(req.query.limit, 10) || 10;
    const userId = req.user?.userId || null;

    const comment = await commentModel.getCommentById(commentId);

    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    const moment = await momentModel.getMomentById(comment.momentId);

    if (!isMomentActive(moment)) {
      return res.status(404).json({ message: "Comment not found" });
    }

    const result = await commentModel.getRepliesByComment(
      commentId,
      userId,
      limit,
      cursor,
    );

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch replies" });
  }
};

// PUT /moments/comments/:id
const updateComment = async (req, res) => {
  try {
    const commentId = req.params.id;
    const comment = await commentModel.getCommentById(commentId);

    if (!comment || comment.deletedAt) {
      return res.status(404).json({ message: "Comment not found" });
    }

    await commentModel.updateComment(commentId, req.user.userId, req.body);

    res.json({ message: "Comment updated" });
  } catch (error) {
    if (error.message === "not found") {
      return res.status(404).json({ message: "comment not found" });
    }
    if (error.message === "Unauthorized") {
      return res.status(403).json({ message: "Forbidden" });
    }
    console.error(error);
    res.status(500).json({ message: "Failed to update comment" });
  }
};

// DELETE /moments/comments/:id
const deleteComment = async (req, res) => {
  try {
    const commentId = req.params.id;
    const comment = await commentModel.getCommentById(commentId);

    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    await commentModel.deleteComment(req.user.userId, commentId);

    res.json({ message: "Comment deleted" });
  } catch (error) {
    if (error.message === "not found") {
      return res.status(404).json({ message: "comment not found" });
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
  getReplies,
  updateComment,
  deleteComment,
};
