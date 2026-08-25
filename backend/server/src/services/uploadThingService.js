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
 * Records that the requesting user owns a just-uploaded file, so a later
 * delete request for it can be authorized. Called by the frontend right
 * after a successful upload — this is the reliable path, since uploadthing's
 * own `onUploadComplete` webhook can't reach a non-publicly-reachable
 * backend (e.g. local dev) and isn't guaranteed to fire promptly even when
 * it can. First-claim-wins (see the model): this can never steal ownership
 * of a fileKey someone else already legitimately claimed.
 */
const confirmUploadOwnership = async (url, requestingUserId) => {
  const fileKey = extractFileKey(url);

  if (!fileKey) {
    return { confirmed: false };
  }

  await uploadOwnershipModel.recordUpload(fileKey, requestingUserId);
  return { confirmed: true };
};

/**
 * Deletes an uploadthing file by its URL, but only if the requesting user
 * is the one who uploaded it — otherwise any authenticated user could
 * delete another user's live profile/cover image by copying its (public)
 * URL from their profile page.
 */
const deleteUploadedFileByUrl = async (url, requestingUserId) => {
  const fileKey = extractFileKey(url);

  if (!fileKey) {
    return { deleted: false, reason: "invalid_url" };
  }

  const owns = await uploadOwnershipModel.isOwner(fileKey, requestingUserId);

  if (!owns) {
    return { deleted: false, reason: "forbidden" };
  }

  await utapi.deleteFiles(fileKey);
  await uploadOwnershipModel.removeRecord(fileKey);

  return { deleted: true };
};

module.exports = { confirmUploadOwnership, deleteUploadedFileByUrl };
