import sharp from "sharp";
import {
  getRepresentativeColorsWu,
  getThreadPalette,
  mapColorsToThreads,
  buildDitheredManufacturerImage,
  applyColorCorrection,
  type Thread,
  type ThreadWithStitches,
} from "@/lib/colors";
import { IMAGE_PROCESSING_CONFIG } from "@/config/image-processing.config";

export interface ImageMetadata {
  width: number;
  height: number;
  aspectRatio: number;
}

export interface ManufacturerImageResult {
  manufacturerImageBuffer: Buffer;
  threads: ThreadWithStitches[];
  dimensions: {
    widthInStitches: number;
    heightInStitches: number;
    originalWidth: number;
    originalHeight: number;
  };
  stitchabilityScore: number; // Average horizontal run length (higher = better stitchability)
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
 * Calculates edge density to assess image detail complexity.
 * 
 * FIXED LOGIC:
 * - Removed statistical (mean + stdDev) thresholding which was calculating 
 *   thresholds higher than the maximum possible pixel value.
 * - Implemented fixed sensitivity threshold.
 * - Properly handles Sobel offset logic.
 */
export async function calculateEdgeDensity(
  imageBuffer: Buffer,
  // We ignore the multiplier now in favor of a fixed sensitivity
  _unusedMultiplier?: number 
): Promise<number> {
  // 1. Convert to grayscale
  const { data: greyData, info: greyInfo } = await sharp(imageBuffer)
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
    
  // 2. Apply Sobel operator
  // Result is offset by 128. 
  // 128 = No Edge. 0 or 255 = Strong Edge.
  const { data: edgeData, info: edgeInfo } = await sharp(greyData, {
      raw: { width: greyInfo.width, height: greyInfo.height, channels: 1 }
    })
    .convolve({
      width: 3,
      height: 3,
      kernel: [-1, 0, 1, -2, 0, 2, -1, 0, 1],
      scale: 1,
      offset: 128 
    })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const totalPixels = edgeInfo.width * edgeInfo.height;
  
  // 3. Fixed Threshold Logic
  // We want to count pixels that are "significantly" different from 128.
  // A deviation of 32 (12.5%) is a safe bet for "visible edge".
  const SENSITIVITY_THRESHOLD = 32; 
  
  let edgeCount = 0;
  let maxDeviation = 0;
  
  for (let i = 0; i < edgeData.length; i++) {
    // Calculate how far this pixel is from neutral gray (128)
    const deviation = Math.abs(edgeData[i] - 128);
    
    if (deviation > maxDeviation) maxDeviation = deviation;

    if (deviation > SENSITIVITY_THRESHOLD) {
      edgeCount++;
    }
  }

  const density = edgeCount / totalPixels;
  
  console.log(
    `📊 Edge density: ${(density * 100).toFixed(1)}% ` + 
    `(${edgeCount}/${totalPixels} edges, max_deviation=${maxDeviation}, threshold=>${SENSITIVITY_THRESHOLD})`
  );
  
  return density;
}

/**
 * Resizes and pre-processes an image for needlepoint conversion.
 * 
 * KEY FIX FOR BLEEDING:
 * - Switched logic to aggressively prefer Median Filter.
 * - Median filter preserves edges (stops hoodie gray from mixing with face peach).
 * - Gaussian Blur (sigma) is now only used for extremely low-detail/flat images.
 */
export async function resizeImageForNeedlepoint(
  imageBuffer: Buffer,
  targetWidth: number,
  targetHeight: number
): Promise<Buffer> {
  // Calculate edge density
  const edgeDensity = await calculateEdgeDensity(imageBuffer);
  
  // If the image has even a small amount of detail (> 2%), use Median filter.
  // This effectively forces Median filter for all photographs, which fixes the bleeding.
  const useMedianFilter = edgeDensity > 0.02;

  console.log(
    `🔧 Adaptive Pre-processing: ${useMedianFilter ? "Median Filter (Anti-Bleed)" : "Gaussian Blur (Soft)"} ` +
    `based on density ${(edgeDensity * 100).toFixed(1)}%`
  );

  let pipeline = sharp(imageBuffer)
    .resize(targetWidth, targetHeight, {
      kernel: sharp.kernel.lanczos3, // High quality downscaling
      fit: "fill",
    })
    .modulate({ 
      saturation: IMAGE_PROCESSING_CONFIG.imageEnhancement.saturationBoost, 
      brightness: IMAGE_PROCESSING_CONFIG.imageEnhancement.brightnessAdjustment 
    });

  if (useMedianFilter) {
    // STRATEGY: Median Filter
    // This replaces a pixel with the median of its neighbors.
    // Result: Textures are flattened, but EDGES (hoodie vs face) are preserved.
    // No color blending occurs at the boundary.
    pipeline = pipeline.median(3);
  } else {
    // STRATEGY: Light Blur
    // Only for vector art or very flat images where we want to remove
    // resizing artifacts.
    pipeline = pipeline.blur(0.4);
  }

  // SHARPEN:
  // Essential for needlepoint. It reinforces the boundary between colors
  // before the color quantizer (Wu's) runs.
  pipeline = pipeline.sharpen({
    sigma: 1.0,
    m1: 0.5,
    m2: 0.5,
    x1: 2.0,
    y2: 10.0,
    y3: 20.0,
  });

  return pipeline.png().toBuffer();
}

export async function applyMajorityFilter(
  inputBuffer: Buffer,
  kernelSize: number = IMAGE_PROCESSING_CONFIG.majorityFilter.kernelSize,
  passes: number = IMAGE_PROCESSING_CONFIG.majorityFilter.passes
): Promise<Buffer> {
    // ... [Copy your existing implementation here] ...
    if (passes < 1) return inputBuffer;
    
    let buffer = inputBuffer;
    const radius = Math.floor(kernelSize / 2);

    for (let pass = 0; pass < passes; pass++) {
        const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        const channels = info.channels;
        const newData = Buffer.alloc(data.length);

        for (let y = 0; y < info.height; y++) {
            for (let x = 0; x < info.width; x++) {
                const originalIdx = (y * info.width + x) * channels;
                const colorCounts = new Map<string, number>();
                let maxCount = 0;
                let majorityColor = "";
                
                // Original pixel logic...
                const originalKey = `${data[originalIdx]},${data[originalIdx+1]},${data[originalIdx+2]}`;

                for (let dy = -radius; dy <= radius; dy++) {
                    for (let dx = -radius; dx <= radius; dx++) {
                        const ny = Math.max(0, Math.min(info.height - 1, y + dy));
                        const nx = Math.max(0, Math.min(info.width - 1, x + dx));
                        const idx = (ny * info.width + nx) * channels;
                        const key = `${data[idx]},${data[idx+1]},${data[idx+2]}`;
                        
                        const count = (colorCounts.get(key) || 0) + 1;
                        colorCounts.set(key, count);
                        if (count > maxCount) {
                            maxCount = count;
                            majorityColor = key;
                        }
                    }
                }
                
                if (colorCounts.get(originalKey) === maxCount) majorityColor = originalKey;
                
                const [r, g, b] = majorityColor.split(",").map(Number);
                newData[originalIdx] = r;
                newData[originalIdx+1] = g;
                newData[originalIdx+2] = b;
                if (channels === 4) newData[originalIdx+3] = data[originalIdx+3];
            }
        }
        buffer = await sharp(newData, { raw: { width: info.width, height: info.height, channels } }).png().toBuffer();
    }
    return buffer;
}

export async function calculateStitchabilityScore(buffer: Buffer): Promise<number> {
    // ... [Existing implementation] ...
    const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const channels = info.channels;
    let totalRunLength = 0;
    let totalRuns = 0;

    for (let y = 0; y < info.height; y++) {
        let currentRunLength = 1;
        const firstIdx = (y * info.width) * channels;
        let prevR = data[firstIdx];
        let prevG = data[firstIdx + 1];
        let prevB = data[firstIdx + 2];

        for (let x = 1; x < info.width; x++) {
            const currIdx = (y * info.width + x) * channels;
            if (data[currIdx] === prevR && data[currIdx + 1] === prevG && data[currIdx + 2] === prevB) {
                currentRunLength++;
            } else {
                totalRunLength += currentRunLength;
                totalRuns++;
                currentRunLength = 1;
                prevR = data[currIdx];
                prevG = data[currIdx + 1];
                prevB = data[currIdx + 2];
            }
        }
        totalRunLength += currentRunLength;
        totalRuns++;
    }
    const score = totalRuns > 0 ? totalRunLength / totalRuns : 0;
    console.log(`📊 Stitchability score: ${score.toFixed(2)}`);
    return score;
}

export async function computeThreadStitches(buffer: Buffer, threads: Thread[]): Promise<ThreadWithStitches[]> {
    // ... [Existing implementation] ...
    const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const colorCounts = new Map<string, number>();
    for (let i = 0; i < data.length; i += info.channels) {
        const key = `${data[i]},${data[i+1]},${data[i+2]}`;
        colorCounts.set(key, (colorCounts.get(key) || 0) + 1);
    }
    return threads.map(t => ({
        ...t,
        stitches: colorCounts.get(`${t.r},${t.g},${t.b}`) || 0
    }));
}

export async function processImageForManufacturing(correctedBuffer: Buffer, numColors: number): Promise<ManufacturerImageResult> {
    // ... [Existing implementation] ...
    console.log(`🖼️  Processing image...`);
    const { centroids, labels, width, height } = await getRepresentativeColorsWu(correctedBuffer, numColors);
    const palette = await getThreadPalette();
    const mapped = mapColorsToThreads(centroids, palette);
    
    console.log(`🎨 Building dithered manufacturer image...`);
    let manufacturerPngBuffer = await buildDitheredManufacturerImage(correctedBuffer, mapped);
    manufacturerPngBuffer = await applyMajorityFilter(manufacturerPngBuffer);
    
    const uniqueThreads = mapped.reduce<Thread[]>((acc, { thread }) => {
        if (!acc.some((item) => item.floss === thread.floss)) acc.push(thread);
        return acc;
    }, []);

    const threadsWithStitches = await computeThreadStitches(manufacturerPngBuffer, uniqueThreads);
    const stitchabilityScore = await calculateStitchabilityScore(manufacturerPngBuffer);
    const metadata = await sharp(correctedBuffer).metadata();

    return {
        manufacturerImageBuffer: manufacturerPngBuffer,
        threads: threadsWithStitches,
        dimensions: {
            widthInStitches: width,
            heightInStitches: height,
            originalWidth: metadata.width ?? 0,
            originalHeight: metadata.height ?? 0,
        },
        stitchabilityScore,
    };
}

export async function downloadImageBuffer(imageUrl: string): Promise<Buffer> {
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`);
    return Buffer.from(await response.arrayBuffer());
}