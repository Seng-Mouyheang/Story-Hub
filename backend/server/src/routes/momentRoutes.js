const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authMiddleware");
const optionalAuthenticate = require("../middleware/optionalAuthMiddleware");
const validate = require("../middleware/validate");
const momentController = require("../controllers/moment/momentController");
const momentLikeController = require("../controllers/moment/momentLikeController");
const momentCommentController = require("../controllers/moment/momentCommentController");
const momentCommentLikeController = require("../controllers/moment/momentCommentLikeController");
const {
  createMomentSchema,
  idParamSchema,
  cursorPaginationSchema,
} = require("../validators/momentValidator");
const {
  createCommentSchema,
  updateCommentSchema,
} = require("../validators/commentValidator");

// Get the current user's home feed of active (24h) stories
router.get("/feed", authenticate, momentController.getFeedMoments);

// Get one author's active stories, for the full-screen viewer
router.get(
  "/author/:id",
  authenticate,
  validate(idParamSchema, "params"),
  momentController.getMomentsByAuthor,
);

// Post a new story (image or text)
router.post(
  "/",
  authenticate,
  validate(createMomentSchema),
  momentController.createMoment,
);

// Mark a story as viewed by the current user
router.post(
  "/:id/view",
  authenticate,
  validate(idParamSchema, "params"),
  momentController.viewMoment,
);

// Delete one of the current user's own stories
router.delete(
  "/:id",
  authenticate,
  validate(idParamSchema, "params"),
  momentController.deleteMoment,
);

/* ============================= */
/*       PUBLIC LIKE ROUTE       */
/* ============================= */

// Get story likes (auth optional to show if current user liked it)
router.get(
  "/:id/likes",
  optionalAuthenticate,
  validate(idParamSchema, "params"),
  momentLikeController.getMomentLikes,
);

/* ============================= */
/*      PROTECTED LIKE ROUTE     */
/* ============================= */

// Toggle likes on a story
router.post(
  "/:id/toggle-like",
  authenticate,
  validate(idParamSchema, "params"),
  momentLikeController.toggleLikeMoment,
);

/* ============================= */
/*      PUBLIC COMMENT ROUTE     */
/* ============================= */

// Get comments for a story (story Id in params)
router.get(
  "/:id/comments",
  optionalAuthenticate,
  validate(idParamSchema, "params"),
  validate(cursorPaginationSchema, "query"),
  momentCommentController.getComments,
);

// Get replies for a comment (comment Id in params)
router.get(
  "/comments/:id/replies",
  optionalAuthenticate,
  validate(idParamSchema, "params"),
  validate(cursorPaginationSchema, "query"),
  momentCommentController.getReplies,
);

/* ============================= */
/*    PROTECTED COMMENT ROUTE    */
/* ============================= */

// Add a comment (story Id in params)
router.post(
  "/:id/comments",
  authenticate,
  validate(idParamSchema, "params"),
  validate(createCommentSchema),
  momentCommentController.addComment,
);

// Update comment (comment Id in params)
router.put(
  "/comments/:id",
  authenticate,
  validate(idParamSchema, "params"),
  validate(updateCommentSchema),
  momentCommentController.updateComment,
);

// Delete a comment (comment Id in params)
router.delete(
  "/comments/:id",
  authenticate,
  validate(idParamSchema, "params"),
  momentCommentController.deleteComment,
);

/* ============================= */
/* PROTECTED COMMENT LIKE ROUTE  */
/* ============================= */

// Toggle likes on a comment
router.post(
  "/comments/:id/toggle-like",
  authenticate,
  validate(idParamSchema, "params"),
  momentCommentLikeController.toggleLikeComment,
);

module.exports = router;
