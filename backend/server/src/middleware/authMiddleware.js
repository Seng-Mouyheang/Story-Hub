const authService = require("../services/authService");
const revokedTokenModel = require("../models/auth/revokedTokenModel");
const userModel = require("../models/auth/userModel");

const JWT_AUTH_ERROR_NAMES = new Set([
  "TokenExpiredError",
  "JsonWebTokenError",
  "NotBeforeError",
]);

const isDatabaseOrTransientError = (err) => {
  if (!err || typeof err !== "object") {
    return false;
  }

  const errorName = typeof err.name === "string" ? err.name.toLowerCase() : "";
  const errorMessage =
    typeof err.message === "string" ? err.message.toLowerCase() : "";
  const errorCode = err.code;

  if (errorName.includes("mongo")) {
    return true;
  }

  if (Array.isArray(err.errorLabels) && err.errorLabels.length > 0) {
    return true;
  }

  if (typeof errorCode === "string") {
    const upperCode = errorCode.toUpperCase();
    if (
      upperCode.startsWith("ECONN") ||
      upperCode === "ETIMEDOUT" ||
      upperCode === "EHOSTUNREACH"
    ) {
      return true;
    }
  }

  if (typeof errorCode === "number") {
    return true;
  }

  return /(mongo|mongodb|server selection|topology|connection|network|timed out|econn)/.test(
    errorMessage,
  );
};

const isJwtAuthError = (err) => JWT_AUTH_ERROR_NAMES.has(err?.name);

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = authService.verifyToken(token);
    const tokenHash = authService.hashToken(token);
    const revoked = await revokedTokenModel.isTokenRevoked(tokenHash);

    if (revoked) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    let activeUser;
    try {
      activeUser = await userModel.findActiveUserById(decoded.userId);
    } catch (error) {
      console.error("Auth user lookup failed:", error);
      return res
        .status(500)
        .json({ message: "Authentication service unavailable" });
    }

    if (!activeUser) {
      return res.status(401).json({ message: "Account is unavailable" });
    }

    req.user = decoded;
    req.authToken = token;
    next();
  } catch (err) {
    console.error("Auth middleware error:", err);

    if (isDatabaseOrTransientError(err)) {
      return res
        .status(500)
        .json({ message: "Authentication service unavailable" });
    }

    if (isJwtAuthError(err)) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

module.exports = authenticate;
