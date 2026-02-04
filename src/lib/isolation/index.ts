import { removeBackground } from "@imgly/background-removal-node";
import sharp from "sharp";

export interface IsolationResult {
  /** Subject pixels with transparent background (RGBA PNG) */
  subjectBuffer: Buffer;
  /** Binary mask: 255 = subject, 0 = background (grayscale PNG) */
  maskBuffer: Buffer;
  /** Dimensions of the output */
  width: number;
  height: number;
}

/**
 * Isolates the subject from the background using AI-based segmentation.
 * Returns both the isolated subject (with transparent background) and
 * a binary mask for compositing.
 *
 * @param imageBuffer - Raw image buffer (any format sharp supports)
 * @returns IsolationResult with subject and mask buffers
 */
export async function isolateSubject(
  imageBuffer: Buffer
): Promise<IsolationResult> {
  console.log("🔍 Starting AI background removal...");

  // @imgly/background-removal-node expects a Blob
  // Copy buffer to a fresh ArrayBuffer to satisfy TypeScript's Blob type constraints
  const ab = imageBuffer.buffer.slice(
    imageBuffer.byteOffset,
    imageBuffer.byteOffset + imageBuffer.byteLength
  ) as ArrayBuffer;
  const blob = new Blob([ab], { type: "image/png" });
  const resultBlob = await removeBackground(blob, {
    output: { format: "image/png", quality: 1.0 },
  });

  // Convert blob back to buffer
  const arrayBuffer = await resultBlob.arrayBuffer();
  const resultBuffer = Buffer.from(arrayBuffer);

  // Extract the alpha channel as a mask
  const { data, info } = await sharp(resultBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height } = info;

  // Build binary mask from alpha channel
  const maskData = Buffer.alloc(width * height);
  for (let i = 0; i < width * height; i++) {
    // Alpha channel is every 4th byte (RGBA)
    const alpha = data[i * 4 + 3];
    maskData[i] = alpha > 128 ? 255 : 0;
  }

  const maskBuffer = await sharp(maskData, {
    raw: { width, height, channels: 1 },
  })
    .png()
    .toBuffer();

  console.log(`✅ Subject isolated: ${width}×${height}`);

  return {
    subjectBuffer: resultBuffer,
    maskBuffer,
    width,
    height,
  };
}

/**
 * Applies a mask to an image buffer, zeroing out background pixels.
 * Useful for re-applying a mask after processing the subject.
 *
 * @param imageBuffer - RGB or RGBA image
 * @param maskBuffer - Grayscale mask (255 = keep, 0 = discard)
 * @returns RGBA buffer with mask applied
 */
export async function applyMask(
  imageBuffer: Buffer,
  maskBuffer: Buffer
): Promise<Buffer> {
  const { data: imgData, info: imgInfo } = await sharp(imageBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { data: mskData } = await sharp(maskBuffer)
    .resize(imgInfo.width, imgInfo.height, { fit: "fill" })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Apply mask to alpha channel
  for (let i = 0; i < imgInfo.width * imgInfo.height; i++) {
    imgData[i * 4 + 3] = mskData[i];
  }

  return sharp(imgData, {
    raw: { width: imgInfo.width, height: imgInfo.height, channels: 4 },
  })
    .png()
    .toBuffer();
}
