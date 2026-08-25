import { uploadFiles } from "../../lib/uploadthing";
import { compressImage } from "../../lib/compressImage";

const PROFILE_IMAGE_MAX_SIZE_BYTES = 4 * 1024 * 1024;
const COVER_IMAGE_MAX_SIZE_BYTES = 8 * 1024 * 1024;

const PROFILE_COMPRESS_OPTIONS = {
  maxWidth: 800,
  maxHeight: 800,
  quality: 0.85,
};
const COVER_COMPRESS_OPTIONS = {
  maxWidth: 1920,
  maxHeight: 1080,
  quality: 0.85,
};

const isImageFile = (file) =>
  typeof file?.type === "string" && file.type.startsWith("image/");

/**
 * Validates and compresses a file entirely client-side — no network call.
 * Used to prepare a local preview immediately on file selection, without
 * uploading anything until the user actually saves.
 */
const prepareFile = async (
  file,
  maxSizeBytes,
  sizeMessage,
  compressOptions,
) => {
  if (!file) {
    throw new Error("Image file is required");
  }

  if (!isImageFile(file)) {
    throw new Error("Please select a valid image file.");
  }

  const compressedFile = await compressImage(file, compressOptions);

  if (compressedFile.size > maxSizeBytes) {
    throw new Error(sizeMessage);
  }

  return compressedFile;
};

const confirmUploadOwnership = async (url) => {
  const token = localStorage.getItem("token");

  if (!token) {
    return;
  }

  try {
    await fetch("/api/profile/uploads", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ url }),
    });
  } catch {
    // Best-effort — if this fails, a later delete of this file will just
    // be denied rather than something breaking now.
  }
};

const uploadPreparedFile = async (file, routeName) => {
  const token = localStorage.getItem("token");

  if (!token) {
    throw new Error("You need to log in again before uploading images.");
  }

  let uploadedUrl;

  try {
    const [result] = await uploadFiles(routeName, {
      files: [file],
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    uploadedUrl = result?.ufsUrl || "";

    if (!uploadedUrl) {
      throw new Error("Upload completed without a file URL");
    }
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Upload failed. Please try again.";
    throw new Error(message);
  }

  // Record ownership ourselves rather than relying on uploadthing's
  // onUploadComplete webhook — that requires a publicly reachable backend
  // (never true in local dev, not guaranteed promptly even in production),
  // whereas this call is authenticated and synchronous.
  await confirmUploadOwnership(uploadedUrl);

  return uploadedUrl;
};

export async function prepareProfileImage(file) {
  return prepareFile(
    file,
    PROFILE_IMAGE_MAX_SIZE_BYTES,
    "Profile image must be 4MB or smaller.",
    PROFILE_COMPRESS_OPTIONS,
  );
}

export async function prepareCoverImage(file) {
  return prepareFile(
    file,
    COVER_IMAGE_MAX_SIZE_BYTES,
    "Cover image must be 8MB or smaller.",
    COVER_COMPRESS_OPTIONS,
  );
}

export async function uploadPreparedProfileImage(file) {
  return uploadPreparedFile(file, "profileImage");
}

export async function uploadPreparedCoverImage(file) {
  return uploadPreparedFile(file, "coverImage");
}

/**
 * Deletes an uploadthing file by its URL. Used to clean up the previously
 * saved image once it's been successfully replaced by a new one.
 */
export async function deleteUploadedImage(url) {
  if (!url) {
    return;
  }

  const token = localStorage.getItem("token");

  if (!token) {
    return;
  }

  try {
    await fetch("/api/profile/uploads", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ url }),
    });
  } catch {
    // Best-effort cleanup — a failed delete just leaves an orphaned file,
    // it shouldn't block or surface an error to the user.
  }
}
