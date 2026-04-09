const authService = require("../services/authService");
const revokedTokenModel = require("../models/revokedTokenModel");
const userModel = require("../models/userModel");

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

    const activeUser = await userModel.findActiveUserById(decoded.userId);
    if (!activeUser) {
      return res.status(401).json({ message: "Account is unavailable" });
    }

    req.user = decoded;
    req.authToken = token;
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

module.exports = authenticate;
