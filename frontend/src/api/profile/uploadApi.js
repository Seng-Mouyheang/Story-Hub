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

/**
 * Uploads a prepared file and returns both the file's public URL (for
 * display/saving) and its `customId` (for authorizing a later delete if
 * this upload gets replaced or discarded before being saved — see
 * deleteUploadedImage). The customId is bound to this user server-side at
 * upload-request time, before any bytes are sent; the frontend never
 * asserts ownership itself.
 */
const uploadPreparedFile = async (file, routeName) => {
  const token = localStorage.getItem("token");

  if (!token) {
    throw new Error("You need to log in again before uploading images.");
  }

  try {
    const [result] = await uploadFiles(routeName, {
      files: [file],
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const url = result?.ufsUrl || "";

    if (!url) {
      throw new Error("Upload completed without a file URL");
    }

    return { url, customId: result?.customId || null };
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Upload failed. Please try again.";
    throw new Error(message);
  }
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
 * Deletes an in-progress (never saved) upload by its customId. Only valid
 * for uploads that haven't been saved to a profile yet — once an image is
 * saved, replacing it is cleaned up automatically by the backend itself
 * (see profileController.updateProfile), not through this endpoint.
 */
export async function deleteUploadedImage(customId) {
  if (!customId) {
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
      body: JSON.stringify({ customId }),
    });
  } catch {
    // Best-effort cleanup — a failed delete just leaves an orphaned file,
    // it shouldn't block or surface an error to the user.
  }
}
