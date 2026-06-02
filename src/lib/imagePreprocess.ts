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
 * Compute the Otsu threshold for a grayscale histogram.
 * Finds the threshold that minimizes intra-class variance.
 */
function computeOtsuThreshold(histogram: number[], totalPixels: number): number {
  let sum = 0;
  for (let i = 0; i < 256; i++) {
    sum += i * histogram[i];
  }

  let sumB = 0;
  let wB = 0;
  let wF = 0;
  let maxVariance = 0;
  let threshold = 128; // fallback

  for (let t = 0; t < 256; t++) {
    wB += histogram[t];
    if (wB === 0) continue;

    wF = totalPixels - wB;
    if (wF === 0) break;

    sumB += t * histogram[t];

    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;

    const variance = wB * wF * (mB - mF) * (mB - mF);

    if (variance > maxVariance) {
      maxVariance = variance;
      threshold = t;
    }
  }

  return threshold;
}

/**
 * Apply the full preprocessing pipeline to a receipt image.
 *
 * Pipeline: Load → Resize → Grayscale → Contrast Enhance → Binarize → Export
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

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    throw new Error("Failed to create canvas 2D context for preprocessing");
  }

  // Draw scaled image
  ctx.drawImage(img, 0, 0, width, height);

  // Get pixel data
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const totalPixels = width * height;

  // --- Step 2: Grayscale Conversion (luminance-weighted) ---
  const grayscale = new Uint8Array(totalPixels);
  for (let i = 0; i < totalPixels; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    // ITU-R BT.601 luminance weights
    grayscale[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  }

  // --- Step 3: Contrast Enhancement (histogram stretching with clipping) ---
  // Build histogram
  const histogram = new Array(256).fill(0);
  for (let i = 0; i < totalPixels; i++) {
    histogram[grayscale[i]]++;
  }

  // Find percentile bounds (clip top/bottom 1% for robustness against outliers)
  const clipCount = Math.floor(totalPixels * 0.01);
  let minVal = 0;
  let maxVal = 255;
  let accumulated = 0;

  for (let i = 0; i < 256; i++) {
    accumulated += histogram[i];
    if (accumulated >= clipCount) {
      minVal = i;
      break;
    }
  }

  accumulated = 0;
  for (let i = 255; i >= 0; i--) {
    accumulated += histogram[i];
    if (accumulated >= clipCount) {
      maxVal = i;
      break;
    }
  }

  // Stretch contrast
  const range = maxVal - minVal || 1;
  for (let i = 0; i < totalPixels; i++) {
    let val = grayscale[i];
    val = Math.round(((val - minVal) / range) * 255);
    grayscale[i] = Math.max(0, Math.min(255, val));
  }

  // --- Step 4: Adaptive Binarization using Otsu's method ---
  // Rebuild histogram after contrast enhancement
  const enhancedHistogram = new Array(256).fill(0);
  for (let i = 0; i < totalPixels; i++) {
    enhancedHistogram[grayscale[i]]++;
  }

  const otsuThreshold = computeOtsuThreshold(enhancedHistogram, totalPixels);

  // Apply binarization and write back to canvas
  for (let i = 0; i < totalPixels; i++) {
    const bw = grayscale[i] > otsuThreshold ? 255 : 0;
    data[i * 4] = bw;      // R
    data[i * 4 + 1] = bw;  // G
    data[i * 4 + 2] = bw;  // B
    // Alpha stays at 255
  }

  ctx.putImageData(imageData, 0, 0);

  // --- Step 5: Export as JPEG Blob ---
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
