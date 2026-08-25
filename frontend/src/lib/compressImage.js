const SKIP_MIME_TYPES = new Set(["image/svg+xml", "image/gif"]);

const loadImage = (file) =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Unable to read image file."));
    };

    image.src = objectUrl;
  });

const canvasToBlob = (canvas, mimeType, quality) =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Image compression failed."));
          return;
        }
        resolve(blob);
      },
      mimeType,
      quality,
    );
  });

const withFileName = (originalName, mimeType, fallbackExtension) => {
  const dotIndex = originalName.lastIndexOf(".");
  const baseName =
    dotIndex > 0 ? originalName.slice(0, dotIndex) : originalName;
  const extension = mimeType.split("/")[1] || fallbackExtension;

  return `${baseName}.${extension}`;
};

/**
 * Downscales and re-encodes an image file client-side before upload, so
 * large phone-camera photos don't ship megabytes over the wire. Only
 * downscales (never upscales small images) and only returns the compressed
 * version when it's actually smaller than the original — some already-
 * optimized images re-encode larger, in which case the original is kept.
 *
 * @param {File} file
 * @param {{ maxWidth?: number, maxHeight?: number, quality?: number, mimeType?: string }} options
 * @returns {Promise<File>}
 */
export async function compressImage(file, options = {}) {
  const {
    maxWidth = 1600,
    maxHeight = 1600,
    quality = 0.82,
    mimeType,
  } = options;

  if (!(file instanceof Blob) || !file.type?.startsWith("image/")) {
    return file;
  }

  if (SKIP_MIME_TYPES.has(file.type)) {
    return file;
  }

  const targetMimeType =
    mimeType || (file.type === "image/png" ? "image/png" : "image/jpeg");

  try {
    const image = await loadImage(file);
    const scale = Math.min(
      1,
      maxWidth / image.naturalWidth,
      maxHeight / image.naturalHeight,
    );
    const targetWidth = Math.max(1, Math.round(image.naturalWidth * scale));
    const targetHeight = Math.max(1, Math.round(image.naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const context = canvas.getContext("2d");
    if (!context) {
      return file;
    }

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(image, 0, 0, targetWidth, targetHeight);

    const compressedBlob = await canvasToBlob(canvas, targetMimeType, quality);

    if (compressedBlob.size >= file.size) {
      return file;
    }

    return new File(
      [compressedBlob],
      withFileName(file.name, targetMimeType, "jpg"),
      { type: targetMimeType, lastModified: Date.now() },
    );
  } catch {
    return file;
  }
}
