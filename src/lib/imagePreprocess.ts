/**
 * Client-side Image Preprocessing for Receipt OCR
 *
 * Applies a pipeline of transformations to improve receipt readability
 * before sending to the Gemini Vision API:
 *
 * 1. Resolution Normalization — Scale to ~300 DPI equivalent
 * 2. Grayscale Conversion — Remove color noise
 * 3. Contrast Enhancement — Make faded thermal ink darker
 * 4. Adaptive Binarization (Otsu's) — Pure black & white, removes shadows/stains
 */

/** Target longest edge in pixels (~300 DPI for a typical receipt) */
const TARGET_LONGEST_EDGE = 2000;
/** Maximum allowed longest edge to avoid API timeouts */
const MAX_LONGEST_EDGE = 3000;
/** JPEG export quality (0-1) */
const JPEG_QUALITY = 0.92;

/**
 * Load a File/Blob into an HTMLImageElement.
 */
function loadImage(source: File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(source);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image for preprocessing"));
    };
    img.src = url;
  });
}

/**
 * Apply the preprocessing pipeline to a receipt image.
 *
 * Pipeline: Load → Resize → Export
 * Preserves the colored raw image, gradients, and soft text edges
 * that Vision-Language Models rely on for accurate OCR.
 *
 * @param file - The original image file from the user
 * @returns A preprocessed Blob ready for OCR
 */
export async function preprocessReceiptImage(file: File | Blob): Promise<Blob> {
  const img = await loadImage(file);

  let { width, height } = img;

  // --- Step 1: Resolution Normalization ---
  const longestEdge = Math.max(width, height);

  if (longestEdge > MAX_LONGEST_EDGE) {
    // Downscale oversized images
    const scale = MAX_LONGEST_EDGE / longestEdge;
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  } else if (longestEdge < TARGET_LONGEST_EDGE) {
    // Upscale small images to target resolution
    const scale = TARGET_LONGEST_EDGE / longestEdge;
    // Only upscale up to 2x to avoid extreme blurriness
    const clampedScale = Math.min(scale, 2.0);
    width = Math.round(width * clampedScale);
    height = Math.round(height * clampedScale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to create canvas 2D context for preprocessing");
  }

  // Draw scaled image (preserves color and detail)
  ctx.drawImage(img, 0, 0, width, height);

  // --- Step 2: Export as JPEG Blob ---
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to export preprocessed image"));
        }
      },
      "image/jpeg",
      JPEG_QUALITY
    );
  });
}
