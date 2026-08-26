const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authMiddleware");
const validate = require("../middleware/validate");
const momentController = require("../controllers/moment/momentController");
const {
  createMomentSchema,
  idParamSchema,
} = require("../validators/momentValidator");

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

module.exports = router;
