const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authMiddleware");
const storyController = require("../controllers/storyController");
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

module.exports = router;
