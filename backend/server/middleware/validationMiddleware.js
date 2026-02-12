const validator = require("validator");

const validateUsername = (username) => {
  const trimmedUsername = username ? username.trim() : "";
  if (!trimmedUsername) return "Username is required";
  if (!validator.isAlphanumeric(trimmedUsername))
    return "Username must be alphanumeric";
  if (!validator.isLength(trimmedUsername, { min: 3, max: 30 }))
    return "Username must be between 3 to 30 characters";
  return null;
};

const validatePassword = (password) => {
  if (!password) return "Password is required";
  if (
    !validator.isStrongPassword(password, {
      minLength: 8,
      minNumbers: 1,
      minUppercase: 1,
      minSymbols: 1,
    })
  ) {
    return "Password must contain uppercase, number, and symbol";
  }
  return null;
};

const validateUserLogin = (req, res, next) => {
  const { email, password } = req.body;

  if (!email) return res.status(400).json({ message: "Email is required" });
  if (!validator.isEmail(email))
    return res.status(400).json({ message: "Invalid email format" });

  const passwordError = validatePassword(password);
  if (passwordError) return res.status(400).json({ message: passwordError });

  next();
};

const validateUserRegistration = (req, res, next) => {
  const { username, password, email } = req.body;

  const usernameError = validateUsername(username);
  if (usernameError) return res.status(400).json({ message: usernameError });

  const passwordError = validatePassword(password);
  if (passwordError) return res.status(400).json({ message: passwordError });

  if (!email) return res.status(400).json({ message: "Email is required" });
  if (!validator.isEmail(email))
    return res.status(400).json({ message: "Invalid email format" });

  next();
};

module.exports = {
  validateUserLogin,
  validateUserRegistration,
};
