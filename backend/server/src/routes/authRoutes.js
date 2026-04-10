const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth/authController");
const authenticate = require("../middleware/authMiddleware");
const {
  loginRateLimiter,
  signupRateLimiter,
} = require("../middleware/authRateLimitMiddleware");
const {
  validateUserRegistration,
  validateUserLogin,
  validateUpdateEmail,
  validateUpdatePassword,
  validateDeleteAccount,
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

router.post(
  "/recover",
  loginRateLimiter,
  validateUserLogin,
  authController.recoverAccount,
);

router.post("/logout", authenticate, authController.logout);

router.patch(
  "/email",
  authenticate,
  validateUpdateEmail,
  authController.updateEmail,
);

router.patch(
  "/password",
  authenticate,
  validateUpdatePassword,
  authController.updatePassword,
);

router.delete(
  "/account",
  authenticate,
  validateDeleteAccount,
  authController.deleteAccount,
);

module.exports = router;
