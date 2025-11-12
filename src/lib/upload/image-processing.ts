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

export interface ImageMetadata {
  width: number;
  height: number;
  aspectRatio: number;
}

export interface ProcessedImageResult {
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
 * Uses Sobel operator to detect edges, then calculates the ratio of
 * edge pixels to total pixels. Higher density indicates more complex
 * images that may benefit from additional pre-processing blur.
 * 
 * Uses a statistical threshold (mean + standard deviation) to adapt
 * to different image characteristics and identify significant edges.
 * 
 * @param imageBuffer Input image buffer
 * @param thresholdMultiplier Multiplier for standard deviation (default: 1.0)
 * @returns Edge density ratio (0-1), where higher values indicate more detail
 */
export async function calculateEdgeDensity(
  imageBuffer: Buffer,
  thresholdMultiplier: number = 1.0
): Promise<number> {
  // Convert to grayscale for edge detection
  const grey = await sharp(imageBuffer).greyscale().toBuffer();
  
  // Apply Sobel X operator for edge detection
  // Sobel X kernel: [-1, 0, 1, -2, 0, 2, -1, 0, 1]
  const { data, info } = await sharp(grey)
    .convolve({
      width: 3,
      height: 3,
      kernel: [-1, 0, 1, -2, 0, 2, -1, 0, 1],
    })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const totalPixels = info.width * info.height;
  
  // First pass: calculate mean and max (single loop for efficiency)
  let sum = 0;
  let maxMagnitude = 0;
  
  for (let i = 0; i < data.length; i++) {
    const magnitude = Math.abs(data[i]);
    sum += magnitude;
    if (magnitude > maxMagnitude) {
      maxMagnitude = magnitude;
    }
  }
  
  // Calculate mean
  const mean = sum / totalPixels;
  
  // Second pass: calculate variance
  let variance = 0;
  for (let i = 0; i < data.length; i++) {
    const magnitude = Math.abs(data[i]);
    variance += Math.pow(magnitude - mean, 2);
  }
  const stdDev = Math.sqrt(variance / totalPixels);
  
  // Use mean + (multiplier * stdDev) as threshold
  // This adapts to the image's actual edge characteristics
  const threshold = mean + (thresholdMultiplier * stdDev);
  
  // Third pass: count pixels above threshold (edge pixels)
  let edgeCount = 0;
  for (let i = 0; i < data.length; i++) {
    const magnitude = Math.abs(data[i]);
    if (magnitude > threshold) {
      edgeCount++;
    }
  }

  const density = edgeCount / totalPixels;
  
  console.log(
    `📊 Edge density: ${(density * 100).toFixed(1)}% (${edgeCount}/${totalPixels} edges, ` +
    `mean=${mean.toFixed(1)}, std=${stdDev.toFixed(1)}, threshold=${threshold.toFixed(1)}, max=${maxMagnitude.toFixed(1)})`
  );
  
  return density;
}

/**
 * Resizes and pre-processes an image for needlepoint conversion.
 * Applies adaptive blur based on image detail density to reduce noise
 * in complex images while preserving sharpness in simple designs.
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
  // Calculate edge density to determine adaptive blur amount
  const edgeDensity = await calculateEdgeDensity(imageBuffer);
  
  // Apply adaptive blur: more blur for high-detail images (>25% edge density)
  // This reduces noise in complex images while preserving sharpness in simple designs
  const blurSigma = edgeDensity > 0.25 ? 1.5 : 0.5;
  
  console.log(
    `🔧 Adaptive blur: ${edgeDensity > 0.25 ? "high-detail" : "normal"} image, using sigma=${blurSigma}`
  );

  return sharp(imageBuffer)
    .resize(targetWidth, targetHeight, {
      kernel: sharp.kernel.lanczos3,
      fit: "fill", // ensure exact pixel grid without cropping
    })
    .modulate({ saturation: 1.3, brightness: 1.02 }) // moderate saturation boost for bright results
    .blur(blurSigma) // adaptive blur based on image complexity
    .png()
    .toBuffer();
}

/**
 * Applies a majority filter to remove small clusters and isolated pixels.
 * Uses a neighborhood-based voting system where each pixel is set to the
 * most common color in its surrounding area, effectively merging small
 * isolated groups into larger, more stitchable regions.
 * 
 * @param inputBuffer Input image buffer
 * @param kernelSize Odd number for kernel size (e.g., 3 for 3x3, 5 for 5x5)
 * @param passes Number of filter passes to apply
 * @returns Filtered image buffer
 */
export async function applyMajorityFilter(
  inputBuffer: Buffer,
  kernelSize: number = 3,
  passes: number = 1
): Promise<Buffer> {
  if (passes < 1) {
    return inputBuffer;
  }

  let buffer = inputBuffer;
  const radius = Math.floor(kernelSize / 2);

  console.log(`🔧 Applying majority filter: ${kernelSize}×${kernelSize} kernel, ${passes} pass(es)`);

  for (let pass = 0; pass < passes; pass++) {
    const { data, info } = await sharp(buffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    
    const channels = info.channels;
    const newData = Buffer.alloc(data.length);

    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        const originalIdx = (y * info.width + x) * channels;
        
        // Count color occurrences in the neighborhood
        const colorCounts = new Map<string, number>();
        let maxCount = 0;
        let majorityColor = "";
        
        // Get original pixel color as string key
        const originalR = data[originalIdx];
        const originalG = data[originalIdx + 1];
        const originalB = data[originalIdx + 2];
        const originalKey = `${originalR},${originalG},${originalB}`;

        // Sample neighborhood
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const ny = Math.max(0, Math.min(info.height - 1, y + dy));
            const nx = Math.max(0, Math.min(info.width - 1, x + dx));
            const idx = (ny * info.width + nx) * channels;
            
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const key = `${r},${g},${b}`;
            
            const count = (colorCounts.get(key) || 0) + 1;
            colorCounts.set(key, count);
            
            if (count > maxCount) {
              maxCount = count;
              majorityColor = key;
            }
          }
        }

        // If there's a tie, prefer the original pixel color
        if (colorCounts.get(originalKey) === maxCount) {
          majorityColor = originalKey;
        }

        // Set the new pixel color
        const [r, g, b] = majorityColor.split(",").map(Number);
        newData[originalIdx] = r;
        newData[originalIdx + 1] = g;
        newData[originalIdx + 2] = b;
        
        // Preserve alpha channel if present
        if (channels === 4) {
          newData[originalIdx + 3] = data[originalIdx + 3];
        }
      }
    }

    buffer = await sharp(newData, {
      raw: { width: info.width, height: info.height, channels: channels },
    })
      .png()
      .toBuffer();
  }

  console.log(`✅ Majority filter completed`);
  return buffer;
}

/**
 * Computes stitch counts per thread color by analyzing the final manufacturer image.
 * Counts how many pixels match each thread's RGB color to estimate material needs.
 * 
 * @param buffer Final manufacturer image buffer
 * @param threads Array of threads to count stitches for
 * @returns Array of threads with stitch counts added
 */
export async function computeThreadStitches(
  buffer: Buffer,
  threads: Thread[]
): Promise<ThreadWithStitches[]> {
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const channels = info.channels;
  const colorCounts = new Map<string, number>();

  // Count pixels by RGB color
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const key = `${r},${g},${b}`;
    colorCounts.set(key, (colorCounts.get(key) || 0) + 1);
  }

  // Map thread colors to stitch counts
  // Note: We use exact RGB match since dithering already maps to thread colors
  const threadsWithStitches: ThreadWithStitches[] = threads.map((thread) => {
    const key = `${thread.r},${thread.g},${thread.b}`;
    const stitches = colorCounts.get(key) || 0;
    return {
      ...thread,
      stitches,
    };
  });

  // Log summary
  const totalStitches = threadsWithStitches.reduce((sum, t) => sum + t.stitches, 0);
  const threadsUsed = threadsWithStitches.filter((t) => t.stitches > 0).length;
  console.log(
    `📊 Thread counts: ${threadsUsed}/${threads.length} threads used, ` +
    `${totalStitches} total stitches`
  );

  return threadsWithStitches;
}

/**
 * Processes an image through the full needlepoint conversion pipeline.
 * Applies quantization, thread mapping, and dithering to create a pixel-accurate
 * manufacturer image where each pixel maps directly to a discrete thread color.
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

  // Build manufacturer image using dithered approach for pixel-accurate stitch mapping
  console.log(
    `🎨 Building dithered manufacturer image: ${reducedW}×${reducedH} pixels`
  );
  let manufacturerPngBuffer = await buildDitheredManufacturerImage(
    correctedBuffer,
    mapped
  );

  // Apply majority filter to remove isolated pixels and small clusters
  manufacturerPngBuffer = await applyMajorityFilter(manufacturerPngBuffer, 3, 1);

  // Compute stitch counts per thread
  const threadsWithStitches = await computeThreadStitches(
    manufacturerPngBuffer,
    uniqueThreads
  );

  return {
    manufacturerImageBuffer: manufacturerPngBuffer,
    threads: threadsWithStitches,
    dimensions: {
      widthInStitches: reducedW,
      heightInStitches: reducedH,
      originalWidth: imageWidth,
      originalHeight: imageHeight,
    },
    stitchabilityScore: 0, // Will be calculated in Phase 5
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

