const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authMiddleware");
const profileController = require("../controllers/profileController");
const validate = require("../middleware/validate");
const {
  updateProfileSchema,
  userIdParamSchema,
} = require("../validators/profileValidator");

/* ============================= */
/*            PUBLIC             */
/* ============================= */

router.get(
  "/:userId",
  validate(userIdParamSchema, "params"),
  profileController.getProfile,
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

module.exports = router;
