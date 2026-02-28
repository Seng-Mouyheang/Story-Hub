const jwt = require("jsonwebtoken");

const optionalAuthenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(); // continue without user
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded; // attach user
  } catch (err) {
    // ignore invalid token, continue as guest
  }

  next();
};

module.exports = optionalAuthenticate;
