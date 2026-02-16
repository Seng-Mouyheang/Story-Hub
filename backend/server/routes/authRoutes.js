const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const {
  validateUserRegistration,
  validateUserLogin,
} = require("../middleware/validationMiddleware");

router.post("/signup", validateUserRegistration, authController.register);
router.post("/login", validateUserLogin, authController.login);

module.exports = router;
