import { uploadFiles } from "../../lib/uploadthing";

const MOMENT_IMAGE_MAX_SIZE_BYTES = 8 * 1024 * 1024;

/**
 * Takes an already-cropped file (see ImageCropper, which bakes the user's
 * chosen output size into the file) and uploads it as-is — no further
 * resizing here, since that would override the dimensions the user picked.
 */
export async function uploadMomentImage(file) {
  if (!file) {
    throw new Error("Image file is required");
  }

  if (typeof file.type !== "string" || !file.type.startsWith("image/")) {
    throw new Error("Please select a valid image file.");
  }

  if (file.size > MOMENT_IMAGE_MAX_SIZE_BYTES) {
    throw new Error(
      "Story image must be 8MB or smaller. Try a smaller crop size.",
    );
  }

  const token = localStorage.getItem("token");

  if (!token) {
    throw new Error("You need to log in again before uploading images.");
  }

  try {
    const [result] = await uploadFiles("momentImage", {
      files: [file],
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const url = result?.ufsUrl || "";
    const fileKey = result?.customId || "";

    if (!url || !fileKey) {
      throw new Error("Upload completed without a file URL");
    }

    return { url, fileKey };
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Upload failed. Please try again.";
    throw new Error(message);
  }
}
