const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authMiddleware");
const optionalAuthenticate = require("../middleware/optionalAuthMiddleware");
const validate = require("../middleware/validate");
const searchController = require("../controllers/search/searchController");
const {
  globalSearchQuerySchema,
  myStorySearchQuerySchema,
} = require("../validators/searchValidator");

router.get(
  "/",
  optionalAuthenticate,
  validate(globalSearchQuerySchema, "query"),
  searchController.globalSearch,
);

router.get(
  "/stories/me",
  authenticate,
  validate(myStorySearchQuerySchema, "query"),
  searchController.searchMyStories,
);

module.exports = router;
