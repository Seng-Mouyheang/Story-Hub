import { uploadFiles } from "../../lib/uploadthing";

const PROFILE_IMAGE_MAX_SIZE_BYTES = 4 * 1024 * 1024;
const COVER_IMAGE_MAX_SIZE_BYTES = 8 * 1024 * 1024;

const isImageFile = (file) =>
  typeof file?.type === "string" && file.type.startsWith("image/");

const getUploadedUrl = async (file, routeName, maxSizeBytes, sizeMessage) => {
  if (!file) {
    throw new Error("Image file is required");
  }

  if (!isImageFile(file)) {
    throw new Error("Please select a valid image file.");
  }

  if (file.size > maxSizeBytes) {
    throw new Error(sizeMessage);
  }

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

    const uploadedUrl = result?.ufsUrl || "";

    if (!uploadedUrl) {
      throw new Error("Upload completed without a file URL");
    }

    return uploadedUrl;
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Upload failed. Please try again.";
    throw new Error(message);
  }
};

export async function uploadProfileImage(file) {
  return getUploadedUrl(
    file,
    "profileImage",
    PROFILE_IMAGE_MAX_SIZE_BYTES,
    "Profile image must be 4MB or smaller.",
  );
}

export async function uploadCoverImage(file) {
  return getUploadedUrl(
    file,
    "coverImage",
    COVER_IMAGE_MAX_SIZE_BYTES,
    "Cover image must be 8MB or smaller.",
  );
}
