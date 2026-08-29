const { UTApi } = require("uploadthing/server");
const uploadOwnershipModel = require("../models/profile/uploadOwnershipModel");

const utapi = new UTApi();

const ALLOWED_HOST_PATTERNS = [/\.ufs\.sh$/i, /^utfs\.io$/i];

const extractFileKey = (url) => {
  let parsedUrl;

  try {
    parsedUrl = new URL(url);
  } catch {
    return null;
  }

  const isAllowedHost = ALLOWED_HOST_PATTERNS.some((pattern) =>
    pattern.test(parsedUrl.hostname),
  );

  if (!isAllowedHost) {
    return null;
  }

  const match = parsedUrl.pathname.match(/\/f\/([^/]+)\/?$/);
  return match ? match[1] : null;
};

/**
 * Deletes a file by a URL the *server itself* already trusts — e.g. the
 * value just read out of the caller's own profile document before it was
 * overwritten. No client input is trusted here; callers must only pass a
 * URL they sourced from their own authenticated data, never from a
 * request body.
 *
 * Returns whether a file was actually deleted, so callers can tell "key
 * couldn't be parsed" apart from "deleted successfully" instead of treating
 * both as success.
 */
const deleteFileByTrustedUrl = async (url) => {
  const fileKey = extractFileKey(url);

  if (!fileKey) {
    return false;
  }

  const result = await utapi.deleteFiles(fileKey);
  return result.success;
};

/**
 * Deletes a file by the customId it was tagged with at upload time (see
 * `authenticateAndTagFiles` in uploadThingRoute.js). Ownership of a customId
 * must already have been verified by the caller — this function only
 * performs the deletion.
 */
const deleteFileByCustomId = async (customId) => {
  if (!customId) {
    return false;
  }

  const result = await utapi.deleteFiles(customId, { keyType: "customId" });
  return result.success;
};

/**
 * Deletes a file the requesting user was granted ownership of via
 * `customId` at upload-request time (see uploadThingRoute.js's
 * `.middleware()`) — used for cleaning up an in-progress upload that was
 * replaced or abandoned before ever being saved to a profile. Rejects if
 * the requesting user isn't the one the ownership record names.
 */
const deleteOwnedUploadByCustomId = async (customId, requestingUserId) => {
  if (!customId) {
    return { deleted: false, reason: "invalid_id" };
  }

  const owns = await uploadOwnershipModel.isOwner(customId, requestingUserId);

  if (!owns) {
    return { deleted: false, reason: "forbidden" };
  }

  await utapi.deleteFiles(customId, { keyType: "customId" });
  await uploadOwnershipModel.removeRecord(customId);

  return { deleted: true };
};

module.exports = {
  deleteFileByTrustedUrl,
  deleteFileByCustomId,
  deleteOwnedUploadByCustomId,
};
