const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authMiddleware");
const optionalAuthenticate = require("../middleware/optionalAuthMiddleware");
const confessionController = require("../controllers/confession/confessionController");
const confessionLikeController = require("../controllers/confession/confessionLikeController");
const confessionBookmarkController = require("../controllers/confession/confessionBookmarkController");
const confessionCommentController = require("../controllers/confession/confessionCommentController");
const confessionCommentLikeController = require("../controllers/confession/confessionCommentLikeController");
const validate = require("../middleware/validate");

const {
  createConfessionSchema,
  updateConfessionSchema,
  idParamSchema,
  tagParamSchema,
  // paginationSchema,
  cursorPaginationSchema,
} = require("../validators/confessionValidator");

const {
  createCommentSchema,
  updateCommentSchema,
} = require("../validators/commentValidator");

/* ============================= */
/*            PUBLIC             */
/* ============================= */

// Cursor Pagination
router.get(
  "/",
  optionalAuthenticate,
  validate(cursorPaginationSchema, "query"),
  confessionController.getAllConfessions,
);

router.get(
  "/tags/:tag",
  optionalAuthenticate,
  validate(tagParamSchema, "params"),
  validate(cursorPaginationSchema, "query"),
  confessionController.getConfessionsByTag,
);

// Get my confessions (auth required)
router.get(
  "/me",
  authenticate,
  validate(cursorPaginationSchema, "query"),
  confessionController.getMyConfessions,
);

// Get current user's deleted confessions
router.get(
  "/me/deleted",
  authenticate,
  validate(cursorPaginationSchema, "query"),
  confessionController.getMyDeletedConfessions,
);

// Get current user's bookmarked confessions
router.get(
  "/bookmarks/me",
  authenticate,
  validate(cursorPaginationSchema, "query"),
  confessionBookmarkController.getMyBookmarkedConfessions,
);

// Public single confession (auth optional)
router.get(
  "/:id",
  optionalAuthenticate,
  validate(idParamSchema, "params"),
  confessionController.getConfession,
);

/* ============================= */
/*            PROTECTED          */
/* ============================= */

// Create confession
router.post(
  "/",
  authenticate,
  validate(createConfessionSchema),
  confessionController.createConfession,
);

// Update confession
router.put(
  "/:id",
  authenticate,
  validate(idParamSchema, "params"),
  validate(updateConfessionSchema),
  confessionController.updateConfession,
);

// Delete confession
router.delete(
  "/:id",
  authenticate,
  validate(idParamSchema, "params"),
  confessionController.deleteConfession,
);

// Restore deleted confession
router.post(
  "/:id/restore",
  authenticate,
  validate(idParamSchema, "params"),
  confessionController.restoreConfession,
);

/* ============================= */
/*       PUBLIC LIKE ROUTE       */
/* ============================= */

// Get confession likes
router.get(
  "/:id/likes",
  optionalAuthenticate, // important
  validate(idParamSchema, "params"),
  confessionLikeController.getConfessionLikes,
);

/* ============================= */
/*      PROTECTED LIKE ROUTE     */
/* ============================= */

// Toggle likes on a confession
router.post(
  "/:id/toggle-like",
  authenticate, // must be logged in
  validate(idParamSchema, "params"),
  confessionLikeController.toggleLikeConfession,
);

// Toggle bookmark on a confession
router.post(
  "/:id/toggle-bookmark",
  authenticate,
  validate(idParamSchema, "params"),
  confessionBookmarkController.toggleConfessionBookmark,
);

// Remove bookmark from a confession
router.delete(
  "/:id/bookmark",
  authenticate,
  validate(idParamSchema, "params"),
  confessionBookmarkController.removeConfessionBookmark,
);

// Check current user's bookmark status for a confession
router.get(
  "/:id/bookmark-status",
  authenticate,
  validate(idParamSchema, "params"),
  confessionBookmarkController.getBookmarkStatus,
);

/* ============================= */
/*      PUBLIC COMMENT ROUTE     */
/* ============================= */

// Get comments for a confession (confession ID in params)
router.get(
  "/:id/comments",
  optionalAuthenticate,
  validate(idParamSchema, "params"),
  validate(cursorPaginationSchema, "query"),
  confessionCommentController.getComments,
);

// Get replies for a comment (comment Id in params)
router.get(
  "/comments/:id/replies",
  optionalAuthenticate,
  validate(idParamSchema, "params"),
  validate(cursorPaginationSchema, "query"),
  confessionCommentController.getReplies,
);

/* ============================= */
/*    PROTECTED COMMENT ROUTE    */
/* ============================= */

// Add a comment (confession ID in params)
router.post(
  "/:id/comments",
  authenticate,
  validate(idParamSchema, "params"),
  validate(createCommentSchema),
  confessionCommentController.addComment,
);

// Update comment (comment Id in params)
router.put(
  "/comments/:id",
  authenticate,
  validate(idParamSchema, "params"),
  validate(updateCommentSchema),
  confessionCommentController.updateComment,
);

// Delete a comment (comment Id in params)
router.delete(
  "/comments/:id",
  authenticate,
  validate(idParamSchema, "params"),
  confessionCommentController.deleteComment,
);

/* ============================= */
/* PROTECTED COMMENT LIKE ROUTE  */
/* ============================= */

// Toggle likes on a comment
router.post(
  "/comments/:id/toggle-like",
  authenticate, // must be logged in
  validate(idParamSchema, "params"),
  confessionCommentLikeController.toggleLikeComment,
);

module.exports = router;
