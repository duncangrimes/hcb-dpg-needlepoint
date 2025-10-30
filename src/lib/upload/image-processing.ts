import sharp from "sharp";
import {
  getRepresentativeColorsWu,
  getThreadPalette,
  mapColorsToThreads,
  buildDitheredManufacturerImage,
  applyEnhancedAntiAliasing,
  applyColorCorrection,
  type Thread,
} from "@/lib/colors";

export interface ImageMetadata {
  width: number;
  height: number;
  aspectRatio: number;
}

export interface ProcessedImageResult {
  canvasImageBuffer: Buffer;
  threads: Thread[];
  dimensions: {
    widthInStitches: number;
    heightInStitches: number;
    originalWidth: number;
    originalHeight: number;
  };
}

/**
 * Extracts metadata from an image buffer
 * @param imageBuffer The image buffer to inspect
 * @returns Image metadata including dimensions and aspect ratio
 * @throws Error if dimensions cannot be read
 */
export async function extractImageMetadata(
  imageBuffer: Buffer
): Promise<ImageMetadata> {
  const metadata = await sharp(imageBuffer).metadata();
  const originalWidth = metadata.width ?? 0;
  const originalHeight = metadata.height ?? 0;

  if (!originalWidth || !originalHeight) {
    throw new Error("Unable to read image dimensions");
  }

  const aspectRatio = originalHeight / originalWidth;

  return {
    width: originalWidth,
    height: originalHeight,
    aspectRatio,
  };
}

/**
 * Calculates stitch dimensions based on canvas width and mesh count
 * @param widthInches Canvas width in inches
 * @param meshCount Mesh count per inch
 * @param aspectRatio Aspect ratio of the original image
 * @returns Stitch dimensions
 */
export function calculateStitchDimensions(
  widthInches: number,
  meshCount: number,
  aspectRatio: number
): { widthInStitches: number; heightInStitches: number } {
  const heightInches = widthInches * aspectRatio;
  const widthInStitches = Math.round(widthInches * meshCount);
  const heightInStitches = Math.round(heightInches * meshCount);

  return { widthInStitches, heightInStitches };
}

/**
 * Resizes and pre-processes an image for needlepoint conversion
 * @param imageBuffer The original image buffer
 * @param targetWidth Target width in stitches
 * @param targetHeight Target height in stitches
 * @returns Resized and pre-processed image buffer
 */
export async function resizeImageForNeedlepoint(
  imageBuffer: Buffer,
  targetWidth: number,
  targetHeight: number
): Promise<Buffer> {
  return sharp(imageBuffer)
    .resize(targetWidth, targetHeight, {
      kernel: sharp.kernel.lanczos3,
      fit: "fill", // ensure exact pixel grid without cropping
    })
    .modulate({ saturation: 1.3, brightness: 1.02 }) // moderate saturation boost for bright results
    .blur(0.5) // slight blur to smooth transitions
    .png()
    .toBuffer();
}

/**
 * Processes an image through the full needlepoint conversion pipeline
 * @param correctedBuffer Color-corrected image buffer
 * @param numColors Number of colors to use in the palette
 * @returns Processed manufacturer image and dimensions
 */
export async function processImageForManufacturing(
  correctedBuffer: Buffer,
  numColors: number
): Promise<ProcessedImageResult> {
  // Get image dimensions for logging
  const metadata = await sharp(correctedBuffer).metadata();
  const imageWidth = metadata.width ?? 0;
  const imageHeight = metadata.height ?? 0;

  console.log(
    `🖼️  Processing image: ${imageWidth}×${imageHeight} stitches, ${numColors} colors`
  );

  // Use Wu's quantizer for smoother color transitions and reduced pixelation
  const { centroids, labels, width: reducedW, height: reducedH } =
    await getRepresentativeColorsWu(correctedBuffer, numColors);

  const palette = await getThreadPalette();
  const mapped = mapColorsToThreads(centroids, palette);

  const uniqueThreads = mapped.reduce<Thread[]>((acc, { thread }) => {
    if (!acc.some((item) => item.floss === thread.floss)) {
      acc.push(thread);
    }
    return acc;
  }, []);

  // Build manufacturer image using dithered approach for smoother results
  console.log(
    `🎨 Building dithered manufacturer image: ${reducedW}×${reducedH} pixels`
  );
  let manufacturerPngBuffer = await buildDitheredManufacturerImage(
    correctedBuffer,
    mapped
  );

  // Enhanced anti-aliasing post-processing for smoother transitions
  manufacturerPngBuffer = await applyEnhancedAntiAliasing(manufacturerPngBuffer);

  return {
    canvasImageBuffer: manufacturerPngBuffer,
    threads: uniqueThreads,
    dimensions: {
      widthInStitches: reducedW,
      heightInStitches: reducedH,
      originalWidth: imageWidth,
      originalHeight: imageHeight,
    },
  };
}

/**
 * Downloads an image from a URL to a buffer
 * @param imageUrl The URL of the image to download
 * @returns Image buffer
 * @throws Error if download fails
 */
export async function downloadImageBuffer(imageUrl: string): Promise<Buffer> {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

