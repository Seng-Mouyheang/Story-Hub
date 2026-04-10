const path = require("node:path");
require("dotenv").config({ path: path.resolve(__dirname, "../../../../.env") });

const {
  createRouteHandler,
  createUploadthing,
} = require("uploadthing/express");
const { UploadThingError } = require("uploadthing/server");
const authService = require("../../services/authService");
const revokedTokenModel = require("../../models/auth/revokedTokenModel");
const userModel = require("../../models/auth/userModel");

const f = createUploadthing();

const requireAuthenticatedUser = async (req) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    throw new UploadThingError({
      code: "FORBIDDEN",
      message: "Unauthorized",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = authService.verifyToken(token);
    const tokenHash = authService.hashToken(token);
    const revoked = await revokedTokenModel.isTokenRevoked(tokenHash);

    if (revoked) {
      throw new UploadThingError({
        code: "FORBIDDEN",
        message: "Invalid or expired token",
      });
    }

    const activeUser = await userModel.findActiveUserById(decoded.userId);

    if (!activeUser) {
      throw new UploadThingError({
        code: "FORBIDDEN",
        message: "Account is unavailable",
      });
    }

    return {
      userId: decoded.userId,
    };
  } catch (error) {
    if (error instanceof UploadThingError) {
      throw error;
    }

    throw new UploadThingError({
      code: "FORBIDDEN",
      message: "Invalid or expired token",
    });
  }
};

const uploadRouter = {
  profileImage: f({
    image: {
      maxFileCount: 1,
      maxFileSize: "4MB",
    },
  })
    .middleware(async ({ req }) => requireAuthenticatedUser(req))
    .onUploadComplete(async ({ file, metadata }) => ({
      uploadedBy: metadata.userId,
      url: file.ufsUrl || file.url,
    })),

  coverImage: f({
    image: {
      maxFileCount: 1,
      maxFileSize: "8MB",
    },
  })
    .middleware(async ({ req }) => requireAuthenticatedUser(req))
    .onUploadComplete(async ({ file, metadata }) => ({
      uploadedBy: metadata.userId,
      url: file.ufsUrl || file.url,
    })),
};

module.exports = createRouteHandler({
  router: uploadRouter,
  config: {
    logLevel: process.env.NODE_ENV === "production" ? "error" : "info",
  },
});
