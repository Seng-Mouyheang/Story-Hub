const express = require("express");

const router = express.Router();
const authenticate = require("../middleware/authMiddleware");
const validate = require("../middleware/validate");
const recommendationController = require("../controllers/recommendation/recommendationController");
const {
  recommendationAuthorQuerySchema,
} = require("../validators/recommendationValidator");

router.get(
  "/authors",
  authenticate,
  validate(recommendationAuthorQuerySchema, "query"),
  recommendationController.getAuthorRecommendations,
);

module.exports = router;
