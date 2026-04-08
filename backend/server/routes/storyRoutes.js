const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authMiddleware");
const optionalAuthenticate = require("../middleware/optionalAuthMiddleware");
const storyController = require("../controllers/storyController");
const storyLikeController = require("../controllers/storyLikeController");
const storyBookmarkController = require("../controllers/storyBookmarkController");
const storyCommentController = require("../controllers/storyCommentController");
const commentLikeController = require("../controllers/commentLikeController");
const validate = require("../middleware/validate");

const {
  createStorySchema,
  updateStorySchema,
  idParamSchema,
  tagParamSchema,
  categorySearchQuerySchema,
  titleSearchQuerySchema,
  cursorPaginationSchema,
} = require("../validators/storyValidator");

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
  storyController.getAllStories,
);

router.get(
  "/tags/:tag",
  optionalAuthenticate,
  validate(tagParamSchema, "params"),
  validate(cursorPaginationSchema, "query"),
  storyController.getStoriesByTag,
);

router.get(
  "/categories",
  optionalAuthenticate,
  validate(categorySearchQuerySchema, "query"),
  storyController.getStoriesByCategories,
);

router.get(
  "/interests/me",
  authenticate,
  validate(cursorPaginationSchema, "query"),
  storyController.getStoriesByMyInterests,
);

router.get(
  "/search/title",
  optionalAuthenticate,
  validate(titleSearchQuerySchema, "query"),
  storyController.getStoriesByTitle,
);

// Get my stories (auth required)
router.get(
  "/me",
  authenticate,
  validate(cursorPaginationSchema, "query"),
  storyController.getMyStories,
);

// Get current user's bookmarked stories
router.get(
  "/bookmarks/me",
  authenticate,
  validate(cursorPaginationSchema, "query"),
  storyBookmarkController.getMyBookmarkedStories,
);

// Public single story (auth optional)
router.get(
  "/:id",
  optionalAuthenticate,
  validate(idParamSchema, "params"),
  storyController.getStory,
);

/* ============================= */
/*            PROTECTED          */
/* ============================= */

// Create story
router.post(
  "/",
  authenticate,
  validate(createStorySchema),
  storyController.createStory,
);

// Update story
router.put(
  "/:id",
  authenticate,
  validate(idParamSchema, "params"),
  validate(updateStorySchema),
  storyController.updateStory,
);

// Delete story
router.delete(
  "/:id",
  authenticate,
  validate(idParamSchema, "params"),
  storyController.deleteStory,
);

/* ============================= */
/*       PUBLIC LIKE ROUTE       */
/* ============================= */

// Get story likes (auth optional to show if current user liked it)
router.get(
  "/:id/likes",
  optionalAuthenticate, // important
  validate(idParamSchema, "params"),
  storyLikeController.getStoryLikes,
);

/* ============================= */
/*      PROTECTED LIKE ROUTE     */
/* ============================= */

// Toggle likes on a story
router.post(
  "/:id/toggle-like",
  authenticate, // must be logged in
  validate(idParamSchema, "params"),
  storyLikeController.toggleLikeStory,
);

// Toggle bookmark on a story
router.post(
  "/:id/toggle-bookmark",
  authenticate,
  validate(idParamSchema, "params"),
  storyBookmarkController.toggleStoryBookmark,
);

// Remove bookmark from a story
router.delete(
  "/:id/bookmark",
  authenticate,
  validate(idParamSchema, "params"),
  storyBookmarkController.removeStoryBookmark,
);

// Check current user's bookmark status for a story
router.get(
  "/:id/bookmark-status",
  authenticate,
  validate(idParamSchema, "params"),
  storyBookmarkController.getBookmarkStatus,
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
  storyCommentController.getComments,
);

// Get replies for a comment (comment Id in params)
router.get(
  "/comments/:id/replies",
  optionalAuthenticate,
  validate(idParamSchema, "params"),
  validate(cursorPaginationSchema, "query"),
  storyCommentController.getReplies,
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
  storyCommentController.addComment,
);

// Update comment (comment Id in params)
router.put(
  "/comments/:id",
  authenticate,
  validate(idParamSchema, "params"),
  validate(updateCommentSchema),
  storyCommentController.updateComment,
);

// Delete a comment (comment Id in params)
router.delete(
  "/comments/:id",
  authenticate,
  validate(idParamSchema, "params"),
  storyCommentController.deleteComment,
);

/* ============================= */
/* PROTECTED COMMENT LIKE ROUTE  */
/* ============================= */

// Toggle likes on a comment
router.post(
  "/comments/:id/toggle-like",
  authenticate, // must be logged in
  validate(idParamSchema, "params"),
  commentLikeController.toggleLikeComment,
);

module.exports = router;
