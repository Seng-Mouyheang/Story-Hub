const express = require("express");
const router = express.Router();
const optionalAuthenticate = require("../middleware/optionalAuthMiddleware");
const validate = require("../middleware/validate");
const searchController = require("../controllers/search/searchController");
const { globalSearchQuerySchema } = require("../validators/searchValidator");

router.get(
  "/",
  optionalAuthenticate,
  validate(globalSearchQuerySchema, "query"),
  searchController.globalSearch,
);

module.exports = router;
