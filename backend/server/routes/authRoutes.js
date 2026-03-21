const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const authenticate = require("../middleware/authMiddleware");
const {
  loginRateLimiter,
  signupRateLimiter,
} = require("../middleware/authRateLimitMiddleware");
const {
  validateUserRegistration,
  validateUserLogin,
} = require("../middleware/validationMiddleware");

router.post(
  "/signup",
  signupRateLimiter,
  validateUserRegistration,
  authController.register,
);
router.post(
  "/login",
  loginRateLimiter,
  validateUserLogin,
  authController.login,
);
router.post("/logout", authenticate, authController.logout);

module.exports = router;
