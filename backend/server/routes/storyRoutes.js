const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authMiddleware");
const optionalAuthenticate = require("../middleware/optionalAuthMiddleware");
const storyController = require("../controllers/storyController");
const storyLikeController = require("../controllers/storyLikeController");
const validate = require("../middleware/validate");

const {
  createStorySchema,
  updateStorySchema,
  idParamSchema,
  // paginationSchema,
  cursorPaginationSchema,
} = require("../validators/storyValidator");

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
/*      PROTECTED LIKE ROUTE     */
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

// Toggle likes
router.post(
  "/:id/toggle-like",
  authenticate, // must be logged in
  validate(idParamSchema, "params"),
  storyLikeController.toggleLikeStory,
);

module.exports = router;
