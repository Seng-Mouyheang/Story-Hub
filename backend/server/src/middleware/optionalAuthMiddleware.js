const authService = require("../services/authService");
const revokedTokenModel = require("../models/auth/revokedTokenModel");

const optionalAuthenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const [scheme, token] = authHeader?.trim()?.split(/\s+/, 2) ?? [];

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return next(); // continue without user
  }

  try {
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
