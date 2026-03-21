const authService = require("../services/authService");
const revokedTokenModel = require("../models/revokedTokenModel");

const optionalAuthenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return next(); // continue without user
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = authService.verifyToken(token);
    const tokenHash = authService.hashToken(token);
    const revoked = await revokedTokenModel.isTokenRevoked(tokenHash);

    if (!revoked) {
      req.user = decoded; // attach user
      req.authToken = token;
    }
  } catch {
    // ignore invalid token, continue as guest
  }

  next();
};

module.exports = optionalAuthenticate;
