const path = require("node:path");
require("dotenv").config({ path: path.resolve(__dirname, "../../../.env") });

const crypto = require("node:crypto");
const {
  createRouteHandler,
  createUploadthing,
  UTFiles,
} = require("uploadthing/express");
const { UploadThingError } = require("uploadthing/server");
const authService = require("../services/authService");
const revokedTokenModel = require("../models/auth/revokedTokenModel");
const userModel = require("../models/auth/userModel");
const uploadOwnershipModel = require("../models/profile/uploadOwnershipModel");

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

/**
 * Mints a per-file customId and records its ownership *before* any bytes
 * are uploaded — this is the only trustworthy place to establish ownership,
 * since it runs inside our own authenticated request handling rather than
 * depending on uploadthing's onUploadComplete webhook (unreachable from a
 * non-public backend, e.g. local dev) or a client-asserted claim made after
 * the fact.
 */
const authenticateAndTagFiles = async ({ req, files }) => {
  const { userId } = await requireAuthenticatedUser(req);

  const taggedFiles = await Promise.all(
    files.map(async (file) => {
      const customId = crypto.randomUUID();
      await uploadOwnershipModel.recordUpload(customId, userId);
      return { ...file, customId };
    }),
  );

  return { userId, [UTFiles]: taggedFiles };
};

const uploadRouter = {
  profileImage: f({
    image: {
      maxFileCount: 1,
      maxFileSize: "4MB",
    },
  })
    .middleware(authenticateAndTagFiles)
    .onUploadComplete(async ({ file, metadata }) => ({
      uploadedBy: metadata.userId,
      ufsUrl: file.ufsUrl,
    })),

  coverImage: f({
    image: {
      maxFileCount: 1,
      maxFileSize: "8MB",
    },
  })
    .middleware(authenticateAndTagFiles)
    .onUploadComplete(async ({ file, metadata }) => ({
      uploadedBy: metadata.userId,
      ufsUrl: file.ufsUrl,
    })),

  momentImage: f({
    image: {
      maxFileCount: 1,
      maxFileSize: "8MB",
    },
  })
    .middleware(authenticateAndTagFiles)
    .onUploadComplete(async ({ file, metadata }) => {
      // Bind the customId to its real URL here, server-side, so
      // momentController.createMoment can trust this URL instead of
      // whatever URL the client separately claims alongside the customId.
      await uploadOwnershipModel.attachFileUrl(file.customId, file.ufsUrl);
      return {
        uploadedBy: metadata.userId,
        ufsUrl: file.ufsUrl,
      };
    }),
};

module.exports = createRouteHandler({
  router: uploadRouter,
});
