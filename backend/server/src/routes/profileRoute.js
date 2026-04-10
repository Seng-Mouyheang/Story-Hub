const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authMiddleware");
const profileController = require("../controllers/profile/profileController");
const followController = require("../controllers/profile/followController");
const validate = require("../middleware/validate");
const {
  updateProfileSchema,
  userIdParamSchema,
  followListQuerySchema,
  accountSearchQuerySchema,
} = require("../validators/profileValidator");

/* ============================= */
/*            PUBLIC             */
/* ============================= */

router.get(
  "/search/accounts",
  validate(accountSearchQuerySchema, "query"),
  profileController.searchAccounts,
);

router.get(
  "/:userId/stats",
  validate(userIdParamSchema, "params"),
  profileController.getUserStats,
);

router.get(
  "/:userId",
  validate(userIdParamSchema, "params"),
  profileController.getProfile,
);

router.get(
  "/:userId/followers",
  validate(userIdParamSchema, "params"),
  validate(followListQuerySchema, "query"),
  followController.getFollowers,
);

router.get(
  "/:userId/following",
  validate(userIdParamSchema, "params"),
  validate(followListQuerySchema, "query"),
  followController.getFollowing,
);

/* ============================= */
/*            PROTECTED          */
/* ============================= */

router.put(
  "/",
  authenticate,
  validate(updateProfileSchema),
  profileController.updateProfile,
);

router.post(
  "/:userId/follow",
  authenticate,
  validate(userIdParamSchema, "params"),
  followController.followUser,
);

router.delete(
  "/:userId/follow",
  authenticate,
  validate(userIdParamSchema, "params"),
  followController.unfollowUser,
);

router.get(
  "/:userId/follow/status",
  authenticate,
  validate(userIdParamSchema, "params"),
  followController.getFollowStatus,
);

module.exports = router;
