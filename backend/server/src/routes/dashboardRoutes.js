const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authMiddleware");
const validate = require("../middleware/validate");
const dashboardController = require("../controllers/dashboard/dashboardController");
const {
  storyDashboardQuerySchema,
  confessionDashboardQuerySchema,
} = require("../validators/dashboardValidator");

router.get("/stats", authenticate, dashboardController.getDashboardStats);

router.get(
  "/stories",
  authenticate,
  validate(storyDashboardQuerySchema, "query"),
  dashboardController.getDashboardStories,
);

router.get(
  "/confessions",
  authenticate,
  validate(confessionDashboardQuerySchema, "query"),
  dashboardController.getDashboardConfessions,
);

module.exports = router;
