const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authMiddleware");
const optionalAuthenticate = require("../middleware/optionalAuthMiddleware");
const storyController = require("../controllers/storyController");
const storyLikeController = require("../controllers/storyLikeController");
const storyCommentController = require("../controllers/storyCommentController");
const validate = require("../middleware/validate");

const {
  createStorySchema,
  updateStorySchema,
  idParamSchema,
  // paginationSchema,
  cursorPaginationSchema,
} = require("../validators/storyValidator");

const {
  createCommentSchema,
  updateCommentSchema,
} = require("../validators/commentValidator");

/* ============================= */
/*            PUBLIC             */
/* ============================= */

// Offset Pagination
// router.get(
//   "/",
//   validate(paginationSchema, "query"),
//   storyController.getAllStories,
// );

// Cursor Pagination
router.get(
  "/",
  optionalAuthenticate,
  validate(cursorPaginationSchema, "query"),
  storyController.getAllStories,
);

// Get my stories (auth required)
router.get(
  "/me",
  authenticate,
  validate(cursorPaginationSchema, "query"),
  storyController.getMyStories,
);

// Public single story (auth optional)
router.get("/:id", validate(idParamSchema, "params"), storyController.getStory);

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

// Like a story
// router.post(
//   "/:id/like",
//   authenticate,
//   validate(idParamSchema, "params"),
//   storyLikeController.likeStory,
// );

// Unlike a story
// router.delete(
//   "/:id/like",
//   authenticate,
//   validate(idParamSchema, "params"),
//   storyLikeController.unlikeStory,
// );

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

// Toggle likes
router.post(
  "/:id/toggle-like",
  authenticate, // must be logged in
  validate(idParamSchema, "params"),
  storyLikeController.toggleLikeStory,
);

/* ============================= */
/*      PUBLIC COMMENT ROUTE     */
/* ============================= */

// Get comments
router.get(
  "/:id/comments",
  optionalAuthenticate,
  validate(cursorPaginationSchema, "query"),
  storyCommentController.getComments,
);

/* ============================= */
/*    PROTECTED COMMENT ROUTE    */
/* ============================= */

// Add a comment
router.post(
  "/:id/comments",
  authenticate,
  validate(idParamSchema, "params"),
  validate(createCommentSchema),
  storyCommentController.addComment,
);

// Update comment
router.put(
  "/comments/:id",
  authenticate,
  validate(idParamSchema, "params"),
  validate(updateCommentSchema),
  storyCommentController.updateComment,
);

// Delete a comment
router.delete(
  "/comments/:id",
  authenticate,
  validate(idParamSchema, "params"),
  storyCommentController.deleteComment,
);

module.exports = router;
