// lib/colors.ts
import sharp from "sharp";
import skmeans from "skmeans";
import { differenceEuclidean, converter, clampChroma } from "culori";
import { z } from "zod";
import * as IQ from "image-q";

const threadSchema = z.object({
  floss: z.string(),
  name: z.string(),
  r: z.number().int().min(0).max(255),
  g: z.number().int().min(0).max(255),
  b: z.number().int().min(0).max(255),
  hex: z.string(),
});

const paletteSchema = z.array(threadSchema).min(1);

export type Thread = z.infer<typeof threadSchema>;

let cachedPalette: Thread[] | null = null;

export async function getThreadPalette(): Promise<Thread[]> {
  if (cachedPalette) return cachedPalette;
  // Importing JSON keeps it out of the client bundle if used only server-side
  const data = (await import("@/data/threadColors.json")).default as unknown;
  const parsed = paletteSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error("Invalid thread palette data");
  }
  
  // Filter out dull colors to ensure vibrant needlepoint results
  const vibrantThreads = parsed.data.filter(thread => {
    const saturation = getSaturation(thread.r, thread.g, thread.b);
    const isDullColor = thread.name.toLowerCase().includes('gray') ||
                       thread.name.toLowerCase().includes('beige') ||
                       thread.name.toLowerCase().includes('dusty') ||
                       thread.name.toLowerCase().includes('mocha') ||
                       thread.name.toLowerCase().includes('pewter') ||
                       thread.name.toLowerCase().includes('shell') ||
                       thread.name.toLowerCase().includes('ash') ||
                       thread.name.toLowerCase().includes('beaver') ||
                       thread.name.toLowerCase().includes('brown gray') ||
                       thread.name.toLowerCase().includes('steel gray') ||
                       thread.name.toLowerCase().includes('pearl gray') ||
                       thread.name.toLowerCase().includes('off white') ||
                       thread.name.toLowerCase().includes('winter white') ||
                       thread.name.toLowerCase().includes('snow white') ||
                       thread.name.toLowerCase().includes('ecru') ||
                       (thread.name.toLowerCase().includes('white') && !thread.name.toLowerCase().includes('bright')) ||
                       saturation < 0.15; // Remove very low saturation colors
    
    return !isDullColor;
  });
  
  console.log(`🎨 Filtered thread palette: ${parsed.data.length} → ${vibrantThreads.length} vibrant colors`);
  cachedPalette = vibrantThreads;
  return cachedPalette;
}

export type RepresentativeColorsResult = {
  centroids: number[][]; // [r,g,b]
  labels: number[]; // cluster index per pixel
  width: number;
  height: number;
};

// Median-cut palette quantization for better color fidelity and shape preservation
export async function getRepresentativeColorsMedianCut(imageBuffer: Buffer, k: number): Promise<RepresentativeColorsResult> {
  // Moderate saturation boost for bright needlepoint results
  const enhancedBuffer = await sharp(imageBuffer)
    .modulate({ saturation: 1.6, brightness: 1.05 }) // balanced saturation boost + slight brightness
    .toBuffer();

  const { data: pixelBuffer, info } = await sharp(enhancedBuffer)
    .ensureAlpha()
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  console.log(`🔍 Median-cut quantization: ${info.width}×${info.height} pixels, ${k} colors`);

  // Create PointContainer from image data
  const pointContainer = IQ.utils.PointContainer.fromUint8Array(pixelBuffer, info.width, info.height);
  
  // Build palette using median-cut
  const palette = await IQ.buildPalette([pointContainer], { colors: k });
  
  // Get palette colors and enhance them for vibrancy
  const paletteColors = palette.getPointContainer().getPointArray();
  const centroids = paletteColors.map((pt: { r: number; g: number; b: number }) => {
    // Enhance color vibrancy by boosting saturation
    const [r, g, b] = [pt.r, pt.g, pt.b];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const saturation = max === 0 ? 0 : (max - min) / max;
    
    // Moderate saturation boost for bright needlepoint results
    const enhancedSaturation = Math.min(1, saturation * 1.4);
    const delta = max - min;
    const newDelta = enhancedSaturation * max;
    
    if (delta === 0) return [r, g, b]; // grayscale, no change
    
    const factor = newDelta / delta;
    const newR = Math.min(255, Math.max(0, r + (r - min) * (factor - 1)));
    const newG = Math.min(255, Math.max(0, g + (g - min) * (factor - 1)));
    const newB = Math.min(255, Math.max(0, b + (b - min) * (factor - 1)));
    
    return [Math.round(newR), Math.round(newG), Math.round(newB)];
  });

  console.log(`📊 Median-cut completed: ${centroids.length} colors found`);

  // Create labels array by finding nearest palette color for each pixel
  const labels = new Array(info.width * info.height);
  for (let i = 0; i < info.width * info.height; i++) {
    const pixelIndex = i * 3;
    const r = pixelBuffer[pixelIndex];
    const g = pixelBuffer[pixelIndex + 1];
    const b = pixelBuffer[pixelIndex + 2];
    
    // Find nearest palette color
    let best = 0, min = Infinity;
    for (let j = 0; j < centroids.length; j++) {
      const diff = Math.abs(r - centroids[j][0]) + Math.abs(g - centroids[j][1]) + Math.abs(b - centroids[j][2]);
      if (diff < min) { min = diff; best = j; }
    }
    labels[i] = best;
  }

  return {
    centroids,
    labels,
    width: info.width,
    height: info.height,
  };
}

export async function getRepresentativeColors(
     imageBuffer: Buffer,
     k: number,
     spatialWeight: number,
     maxSamples = 50000,
     boostSaturation = false, // new param
   ): Promise<RepresentativeColorsResult> {
    let bufferToUse = imageBuffer;
    if (boostSaturation) {
      // Moderate saturation boost for bright needlepoint results
      bufferToUse = await sharp(imageBuffer).modulate({ saturation: 1.5, brightness: 1.05 }).toBuffer();
    }
    const { data: pixelBuffer, info } = await sharp(bufferToUse)
      .blur(0.5)
      .ensureAlpha()
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
  
    // Weaken spatialWeight for more color diversity
    spatialWeight = Math.max(1, spatialWeight * 0.5);
  
    const channels = 3;
    const totalPixels = pixelBuffer.length / channels;
    
    console.log(`🔍 K-means clustering: ${info.width}×${info.height} pixels, ${totalPixels} total, spatial weight: ${spatialWeight.toFixed(2)}`);

    // Subsample indices
    const indices: number[] = [];
    if (totalPixels <= maxSamples) {
        for (let i = 0; i < totalPixels; i++) indices.push(i);
    } else {
        const step = Math.ceil(totalPixels / maxSamples);
        for (let i = 0; i < totalPixels; i += step) indices.push(i);
    }

    // Build 5D points: OKLab + spatial
    const toOklab = converter("oklab");
    const toRgb = converter("rgb");
    const pixels5D: number[][] = new Array(indices.length);
    const { width, height } = info;
    for (let j = 0; j < indices.length; j++) {
        const p = indices[j];
        const i = p * channels;
        const lab = toOklab({ r: pixelBuffer[i] / 255, g: pixelBuffer[i + 1] / 255, b: pixelBuffer[i + 2] / 255, mode: "rgb" }) as { l: number; a: number; b: number; mode: "oklab" };
        const x = p % width;
        const y = Math.floor(p / width);
        pixels5D[j] = [lab.l, lab.a, lab.b, x / spatialWeight, y / spatialWeight];
    }

    const result = skmeans(pixels5D, k, "kmpp");
    console.log(`📊 K-means completed: ${result.centroids.length} centroids found`);

    // Extract OKLab centroids, convert to RGB, and CLAMP for gamut safety
    const centroidsLab = (result.centroids as number[][]).map((c) => [c[0], c[1], c[2]]);
    const centroids = centroidsLab.map((lab, idx) => {
        let rgb = toRgb({ mode: "oklab", l: lab[0], a: lab[1], b: lab[2] }) as { r: number; g: number; b: number; mode: "rgb" };
        // Clamp chroma to avoid desaturated/out-of-gamut colors post-centroiding
        rgb = clampChroma(rgb, "oklab");
        const r = Math.max(0, Math.min(255, Math.round(rgb.r * 255)));
        const g = Math.max(0, Math.min(255, Math.round(rgb.g * 255)));
        const b = Math.max(0, Math.min(255, Math.round(rgb.b * 255)));
        console.log(`  🎨 Centroid ${idx + 1}: OKLab(${lab.map(x => x.toFixed(2)).join(', ')}) → RGB(${r}, ${g}, ${b})`);
        return [r, g, b];
    });

    // Assign labels for ALL pixels
    const labels = new Array<number>(totalPixels);
    for (let p = 0; p < totalPixels; p++) {
        const base = p * channels;
        const lab = toOklab({ r: pixelBuffer[base] / 255, g: pixelBuffer[base + 1] / 255, b: pixelBuffer[base + 2] / 255, mode: "rgb" }) as { l: number; a: number; b: number; mode: "oklab" };
        const x = p % width;
        const y = Math.floor(p / width);
        let minD = Infinity;
        let best = 0;
        for (let cIdx = 0; cIdx < (result.centroids as number[][]).length; cIdx++) {
        const c = (result.centroids as number[][])[cIdx];
        const dl = lab.l - c[0];
        const da = lab.a - c[1];
        const db = lab.b - c[2];
        const dx = x / spatialWeight - c[3];
        const dy = y / spatialWeight - c[4];
        const d = dl * dl + da * da + db * db + dx * dx + dy * dy;
        if (d < minD) {
            minD = d;
            best = cIdx;
        }
        }
        labels[p] = best;
    }

    return { centroids, labels, width: info.width, height: info.height };
}

export function mapColorsToThreads(representativeColors: number[][], threadPalette: Thread[]) {
    const colorDifference = differenceEuclidean("oklab");
    const toOklab = converter("oklab");
    const MINDIFF_THRESHOLD = 0.08; // Even lower threshold for more vibrant results
  
    // Sort thread palette by vibrancy (saturation) to prioritize vibrant colors
    const vibrantThreads = [...threadPalette].sort((a, b) => {
      const aSat = getSaturation(a.r, a.g, a.b);
      const bSat = getSaturation(b.r, b.g, b.b);
      // Also consider brightness for even more vibrant results
      const aBrightness = (a.r + a.g + a.b) / 3;
      const bBrightness = (b.r + b.g + b.b) / 3;
      const aScore = aSat * 0.7 + (aBrightness / 255) * 0.3;
      const bScore = bSat * 0.7 + (bBrightness / 255) * 0.3;
      return bScore - aScore; // higher vibrancy + brightness first
    });
  
    const mappings: { original: number[]; thread: Thread }[] = [];
    const usedThreads = new Set<string>();
    for (let i = 0; i < representativeColors.length; i++) {
      const rgbColor = representativeColors[i];
      const targetColor = toOklab({ r: rgbColor[0] / 255, g: rgbColor[1] / 255, b: rgbColor[2] / 255, mode: "rgb" });
      let bestMatch: Thread | null = null;
      let minDifference = Infinity;
  
      // Try vibrant threads first
      for (const thread of vibrantThreads) {
        const threadColor = toOklab({ r: thread.r / 255, g: thread.g / 255, b: thread.b / 255, mode: "rgb" });
        const difference = colorDifference(targetColor, threadColor);
        if (difference < minDifference) {
          minDifference = difference;
          bestMatch = thread;
        }
      }
      // Map if duplicate and sufficiently different
      if (bestMatch && (!usedThreads.has(bestMatch.floss) || minDifference >= MINDIFF_THRESHOLD)) {
        usedThreads.add(bestMatch.floss);
        mappings.push({ original: rgbColor, thread: bestMatch });
      } else if (bestMatch) {
        // Accept duplicate if nothing else is close enough, but log it
        mappings.push({ original: rgbColor, thread: bestMatch });
      }
    }
    // For padding, use other available threads randomly
    while (mappings.length < representativeColors.length) {
      const randomThread = threadPalette[Math.floor(Math.random() * threadPalette.length)];
      mappings.push({ original: [randomThread.r, randomThread.g, randomThread.b], thread: randomThread });
    }
    return mappings;
  }

// Helper function to calculate color saturation
function getSaturation(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
}

// Shape-preserving segmentation using quantized pixel assignments
export async function buildSegmentedManufacturerImage(
  width: number, 
  height: number, 
  labels: number[], 
  mappedThreads: Thread[]
): Promise<Buffer> {
  const channels = 3;
  const out = Buffer.alloc(width * height * channels);
  for (let i = 0; i < width * height; i++) {
    const rgb = [mappedThreads[labels[i]].r, mappedThreads[labels[i]].g, mappedThreads[labels[i]].b];
    out[i * channels] = rgb[0];
    out[i * channels + 1] = rgb[1];
    out[i * channels + 2] = rgb[2];
  }
  return sharp(out, { raw: { width, height, channels } }).png().toBuffer();
}

   export async function buildManufacturerImage(
     width: number,
     height: number,
     labels: number[],
     centroidIndexToThreadRgb: (index: number) => [number, number, number],
   ): Promise<Buffer> {
     // Fallback to segmented approach when dithering is not available
     // This function is kept for backward compatibility
     const channels = 3;
     const out = Buffer.alloc(width * height * channels);
     for (let p = 0; p < width * height; p++) {
       const rgb = centroidIndexToThreadRgb(labels[p]);
       out[p * channels] = rgb[0];
       out[p * channels + 1] = rgb[1];
       out[p * channels + 2] = rgb[2];
     }
     return sharp(out, { raw: { width, height, channels } }).png().toBuffer();
   }

// Perceptual dithering using OKLab color space for better visual results
export async function buildDitheredManufacturerImage(
  reducedPngBuffer: Buffer,
  mappedPalette: { original: number[]; thread: Thread }[],
): Promise<Buffer> {
  // Read raw pixels in whatever channel count the image has
  const { data, info } = await sharp(reducedPngBuffer)
    .raw()
    .toBuffer({ resolveWithObject: true });
  
  const { width, height, channels } = info;

  // Normalize to 3-channel RGB buffer
  let rgbData: Uint8Array;
  if (channels === 3) {
    rgbData = data;
  } else if (channels === 4) {
    // Drop alpha
    rgbData = new Uint8Array(width * height * 3);
    for (let i = 0, j = 0; i < data.length; i += 4, j += 3) {
      rgbData[j] = data[i];
      rgbData[j + 1] = data[i + 1];
      rgbData[j + 2] = data[i + 2];
    }
  } else if (channels === 1) {
    // Grayscale -> replicate channels
    rgbData = new Uint8Array(width * height * 3);
    for (let i = 0, j = 0; i < data.length; i += 1, j += 3) {
      const v = data[i];
      rgbData[j] = v;
      rgbData[j + 1] = v;
      rgbData[j + 2] = v;
    }
  } else if (channels === 2) {
    // Gray + alpha -> drop alpha, replicate gray
    rgbData = new Uint8Array(width * height * 3);
    for (let i = 0, j = 0; i < data.length; i += 2, j += 3) {
      const v = data[i];
      rgbData[j] = v;
      rgbData[j + 1] = v;
      rgbData[j + 2] = v;
    }
  } else {
    // Fallback: convert via sharp
    const converted = await sharp(reducedPngBuffer).removeAlpha().toColourspace('srgb').raw().toBuffer({ resolveWithObject: true });
    rgbData = converted.data;
  }

  // Create floating-point RGB buffer for error accumulation
  const pixels = new Float32Array(rgbData.length);
  for (let i = 0; i < rgbData.length; i++) {
    pixels[i] = rgbData[i];
  }

  const finalImageData = Buffer.alloc(rgbData.length);
  const toOklab = converter("oklab");
  const toRgb = converter("rgb");
  const colorDifference = differenceEuclidean("oklab");

  // Pre-convert thread palette to OKLab for faster comparisons
  const threadPaletteLab = mappedPalette.map(({ thread }) => ({
    thread,
    lab: toOklab({ r: thread.r / 255, g: thread.g / 255, b: thread.b / 255, mode: 'rgb' })
  }));

  console.log(`🎨 Starting perceptual dithering with OKLab error propagation...`);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 3;

      // Get the current pixel's color (including propagated error)
      const old_r = Math.max(0, Math.min(255, pixels[i]));
      const old_g = Math.max(0, Math.min(255, pixels[i + 1]));
      const old_b = Math.max(0, Math.min(255, pixels[i + 2]));
      
      // Convert current pixel to OKLab for perceptual color matching
      const currentLab = toOklab({ r: old_r / 255, g: old_g / 255, b: old_b / 255, mode: 'rgb' }) as { l: number; a: number; b: number; mode: "oklab" };
      
      // Find the closest thread in OKLab space
      let closest = threadPaletteLab[0];
      let minDiff = Infinity;

      for(const p of threadPaletteLab) {
        const diff = colorDifference(currentLab, p.lab);
        if (diff < minDiff) {
          minDiff = diff;
          closest = p;
        }
      }
      
      const new_r = closest.thread.r;
      const new_g = closest.thread.g;
      const new_b = closest.thread.b;

      // Set the final color for this pixel in the output buffer
      finalImageData[i] = new_r;
      finalImageData[i+1] = new_g;
      finalImageData[i+2] = new_b;
      
      // Calculate error in OKLab space for perceptual dithering
      const newLab = toOklab({ r: new_r / 255, g: new_g / 255, b: new_b / 255, mode: 'rgb' }) as { l: number; a: number; b: number; mode: "oklab" };
      const errorLab = {
        l: currentLab.l - newLab.l,
        a: currentLab.a - newLab.a,
        b: currentLab.b - newLab.b,
        mode: 'oklab' as const
      };

      // Convert error back to RGB for propagation
      const errorRgb = toRgb(errorLab) as { r: number; g: number; b: number; mode: "rgb" };
      const err_r = errorRgb.r * 255;
      const err_g = errorRgb.g * 255;
      const err_b = errorRgb.b * 255;

      // Propagate the perceptual error to neighboring pixels (Floyd-Steinberg)
      const p1 = i + 3;          // right
      const p2 = i + width * 3 - 3; // bottom-left
      const p3 = i + width * 3;     // bottom
      const p4 = i + width * 3 + 3; // bottom-right

      if (x < width - 1) {
        pixels[p1] += err_r * 7/16; 
        pixels[p1+1] += err_g * 7/16; 
        pixels[p1+2] += err_b * 7/16;
      }
      if (y < height - 1) {
        if (x > 0) {
          pixels[p2] += err_r * 3/16; 
          pixels[p2+1] += err_g * 3/16; 
          pixels[p2+2] += err_b * 3/16;
        }
        pixels[p3] += err_r * 5/16; 
        pixels[p3+1] += err_g * 5/16; 
        pixels[p3+2] += err_b * 5/16;
        if (x < width - 1) {
          pixels[p4] += err_r * 1/16; 
          pixels[p4+1] += err_g * 1/16; 
          pixels[p4+2] += err_b * 1/16;
        }
      }
    }
  }

  console.log(`✅ Perceptual dithering completed`);
  return sharp(finalImageData, { raw: { width, height, channels: 3 } }).png().toBuffer();
}

// Enhanced anti-aliasing function for post-processing dithered images
export async function applyEnhancedAntiAliasing(imageBuffer: Buffer): Promise<Buffer> {
  console.log(`🔧 Applying enhanced anti-aliasing...`);
  
  return await sharp(imageBuffer)
    .modulate({ saturation: 1.05, brightness: 1.01 }) // subtle final enhancement
    // Multi-step anti-aliasing: targeted blur for high-contrast edges
    .convolve({
      width: 3,
      height: 3,
      kernel: [
        -1, -1, -1,
        -1, 16, -1,
        -1, -1, -1
      ]
    })
    .blur(0.3) // gentle blur to smooth harsh pixel edges
    .sharpen({ sigma: 0.5, m1: 0.5, m2: 2.0, x1: 2.0, y2: 10.0 }) // selective sharpening
    .png()
    .toBuffer();
}