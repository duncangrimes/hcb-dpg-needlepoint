import sharp from "sharp";
import skmeans from "skmeans";
import { differenceEuclidean, converter, clampChroma } from "culori";
import { z } from "zod";
import * as IQ from "image-q";
import { GoogleGenerativeAI } from "@google/generative-ai";

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
export async function getRepresentativeColorsMedianCut(
  imageBuffer: Buffer, 
  k: number,
  enhance: boolean = true  // New optional param: skip if input is already Gemini-vibrant
): Promise<RepresentativeColorsResult> {
  let processingBuffer = imageBuffer;
  if (enhance) {
    // Moderate saturation boost for bright needlepoint results
    processingBuffer = await sharp(imageBuffer)
      .modulate({ saturation: 1.6, brightness: 1.05 }) // balanced saturation boost + slight brightness
      .toBuffer();
  }

  const { data: pixelBuffer, info } = await sharp(processingBuffer)
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
  const centroids = paletteColors.map((pt: any) => {
    // Enhance color vibrancy by boosting saturation
    const [r, g, b] = [pt.r, pt.g, pt.b];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const saturation = max === 0 ? 0 : (max - min) / max;
    
    // Toned-down saturation boost for bright needlepoint results
    const enhancedSaturation = Math.min(1, saturation * 1.2);
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

  // Create labels array by finding nearest palette color for each pixel (use Euclidean for consistency)
  const labels = new Array(info.width * info.height);
  for (let i = 0; i < info.width * info.height; i++) {
    const pixelIndex = i * 3;
    const r = pixelBuffer[pixelIndex];
    const g = pixelBuffer[pixelIndex + 1];
    const b = pixelBuffer[pixelIndex + 2];
    
    // Find nearest palette color using Euclidean distance
    let best = 0, minDistSq = Infinity;
    for (let j = 0; j < centroids.length; j++) {
      const dr = r - centroids[j][0];
      const dg = g - centroids[j][1];
      const db = b - centroids[j][2];
      const distSq = dr * dr + dg * dg + db * db;
      if (distSq < minDistSq) { 
        minDistSq = distSq; 
        best = j; 
      }
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

// Ultra-simple color reduction for Gemini-preprocessed images
export async function getRepresentativeColorsSimple(
  imageBuffer: Buffer,
  targetColors: number
): Promise<RepresentativeColorsResult> {
  // Just get the raw pixel data - no processing since Gemini already handled it
  const { data: pixelBuffer, info } = await sharp(imageBuffer)
    .ensureAlpha()
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const channels = 3;
  const totalPixels = info.width * info.height;
  
  console.log(`🔍 Simple color reduction: ${info.width}×${info.height} pixels, target: ${targetColors} colors`);

  // Count all unique colors in the image
  const colorMap = new Map<string, { count: number; rgb: [number, number, number] }>();
  
  for (let i = 0; i < pixelBuffer.length; i += channels) {
    const r = pixelBuffer[i];
    const g = pixelBuffer[i + 1];
    const b = pixelBuffer[i + 2];
    const key = `${r},${g},${b}`;
    
    if (colorMap.has(key)) {
      colorMap.get(key)!.count++;
    } else {
      colorMap.set(key, { count: 1, rgb: [r, g, b] });
    }
  }

  console.log(`📊 Found ${colorMap.size} unique colors in image`);

  // If we already have fewer colors than target, just use what we have
  if (colorMap.size <= targetColors) {
    console.log(`✅ Image already has ${colorMap.size} colors (≤ ${targetColors}), no reduction needed`);
    
    const centroids = Array.from(colorMap.values()).map(({ rgb }) => rgb);
    const labels = new Array<number>(totalPixels);
    
    // Create a reverse lookup for fast pixel-to-color mapping
    const colorToIndex = new Map<string, number>();
    centroids.forEach((rgb, index) => {
      colorToIndex.set(`${rgb[0]},${rgb[1]},${rgb[2]}`, index);
    });
    
    // Assign labels
    for (let p = 0; p < totalPixels; p++) {
      const base = p * channels;
      if (base + 2 >= pixelBuffer.length) break;
      
      const r = pixelBuffer[base];
      const g = pixelBuffer[base + 1];
      const b = pixelBuffer[base + 2];
      const key = `${r},${g},${b}`;
      
      labels[p] = colorToIndex.get(key) || 0;
    }
    
    return { centroids, labels, width: info.width, height: info.height };
  }

  // More aggressive approach: group similar colors first, then take most frequent
  console.log(`🔄 Reducing ${colorMap.size} colors to ${targetColors} colors with grouping`);
  
  // First, group very similar colors together (within 40 RGB distance)
  const colorGroups: { representative: [number, number, number]; colors: Array<{ rgb: [number, number, number]; count: number }> }[] = [];
  const SIMILARITY_THRESHOLD = 40; // Group similar colors together
  
  for (const [key, data] of colorMap.entries()) {
    let addedToGroup = false;
    
    // Try to add to existing group
    for (const group of colorGroups) {
      const [r1, g1, b1] = group.representative;
      const [r2, g2, b2] = data.rgb;
      const distSq = Math.pow(r1 - r2, 2) + Math.pow(g1 - g2, 2) + Math.pow(b1 - b2, 2);
      const distance = Math.sqrt(distSq);
      
      if (distance <= SIMILARITY_THRESHOLD) {
        group.colors.push(data);
        addedToGroup = true;
        break;
      }
    }
    
    // Create new group if not added to existing
    if (!addedToGroup) {
      colorGroups.push({
        representative: data.rgb,
        colors: [data]
      });
    }
  }
  
  console.log(`📊 Grouped ${colorMap.size} colors into ${colorGroups.length} similar groups`);
  
  // Calculate total count for each group and sort by frequency
  const groupFrequencies = colorGroups.map(group => ({
    representative: group.representative,
    totalCount: group.colors.reduce((sum, color) => sum + color.count, 0)
  }));
  
  // Sort by frequency and take the top N
  const sortedGroups = groupFrequencies
    .sort((a, b) => b.totalCount - a.totalCount)
    .slice(0, targetColors);
  
  const finalColors = sortedGroups.map(g => g.representative);

  console.log(`📊 Using ${finalColors.length} most frequent color groups`);
  finalColors.forEach((color, idx) => {
    console.log(`  🎨 Color ${idx + 1}: RGB(${color[0]}, ${color[1]}, ${color[2]})`);
  });

  // Create a mapping from original colors to final colors
  const colorToIndexMap = new Map<string, number>();
  
  // Map each original color to its closest final color
  for (const [key, data] of colorMap.entries()) {
    const [r, g, b] = data.rgb;
    let minDistSq = Infinity;
    let bestIndex = 0;
    
    for (let i = 0; i < finalColors.length; i++) {
      const [fr, fg, fb] = finalColors[i];
      const distSq = Math.pow(r - fr, 2) + Math.pow(g - fg, 2) + Math.pow(b - fb, 2);
      
      if (distSq < minDistSq) {
        minDistSq = distSq;
        bestIndex = i;
      }
    }
    
    colorToIndexMap.set(key, bestIndex);
  }
  
  // Assign labels for all pixels using the pre-computed mapping
  const labels = new Array<number>(totalPixels);
  for (let p = 0; p < totalPixels; p++) {
    const base = p * channels;
    if (base + 2 >= pixelBuffer.length) break;
    
    const r = pixelBuffer[base];
    const g = pixelBuffer[base + 1];
    const b = pixelBuffer[base + 2];
    const key = `${r},${g},${b}`;
    
    // Use pre-computed mapping for faster lookup
    labels[p] = colorToIndexMap.get(key) || 0;
  }

  return { centroids: finalColors, labels, width: info.width, height: info.height };
}

export function mapColorsToThreads(representativeColors: number[][], threadPalette: Thread[]) {
  const colorDifference = differenceEuclidean("oklab");
  const toOklab = converter("oklab");
  const MINDIFF_THRESHOLD = 0.12; // Increased from 0.08 for stricter duplicate avoidance
  
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

// Shape-preserving segmentation using quantized pixel assignments with smoothing
export async function buildSegmentedManufacturerImage(
  width: number, 
  height: number, 
  labels: number[], 
  mappedThreads: Thread[]
): Promise<Buffer> {
  const channels = 3;
  const out = Buffer.alloc(width * height * channels);
  
  // First, create the raw segmented image
  for (let i = 0; i < width * height; i++) {
    const rgb = [mappedThreads[labels[i]].r, mappedThreads[labels[i]].g, mappedThreads[labels[i]].b];
    out[i * channels] = rgb[0];
    out[i * channels + 1] = rgb[1];
    out[i * channels + 2] = rgb[2];
  }
  
  // Apply smoothing to create cleaner color blocks
  return sharp(out, { raw: { width, height, channels } })
    .blur(0.8) // Gentle blur to smooth out pixelation
    .sharpen(0.3) // Slight sharpening to maintain edges
    .png()
    .toBuffer();
}

   export async function buildManufacturerImage(
     width: number,
     height: number,
     labels: number[],
     centroidIndexToThreadRgb: (index: number) => [number, number, number],
   ): Promise<Buffer> {
     // Use dithered manufacturer image for better color spread
     // You may need the reduced PNG buffer and mapped palette as arguments for this:
     // return await buildDitheredManufacturerImage(reducedPngBuffer, mappedPalette);
   
     // If you can't, fallback to the segmented approach:
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

// Optional: Keep dithered version if you want to toggle later
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

  // Create a floating-point copy to accumulate errors
  const pixels = new Float32Array(rgbData.length);
  for (let i = 0; i < rgbData.length; i++) {
    pixels[i] = rgbData[i];
  }

  const finalImageData = Buffer.alloc(rgbData.length);
  const toOklab = converter("oklab");
  const colorDifference = differenceEuclidean("oklab");

  // Pre-convert thread palette to OKLab for faster comparisons
  const threadPaletteLab = mappedPalette.map(({ thread }) => ({
    thread,
    lab: toOklab({ r: thread.r / 255, g: thread.g / 255, b: thread.b / 255, mode: 'rgb' })
  }));

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 3;

      // Get the current pixel's color (including propagated error)
      const old_r = pixels[i];
      const old_g = pixels[i + 1];
      const old_b = pixels[i + 2];
      
      // Find the closest thread in the final palette
      let closest = threadPaletteLab[0];
      let minDiff = Infinity;
      const currentLab = toOklab({ r: old_r / 255, g: old_g / 255, b: old_b / 255, mode: 'rgb' });

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
      
      // Calculate the color error
      const err_r = old_r - new_r;
      const err_g = old_g - new_g;
      const err_b = old_b - new_b;

      // Propagate the error to neighboring pixels (Floyd-Steinberg)
      const p1 = i + 3;          // right
      const p2 = i + width * 3 - 3; // bottom-left
      const p3 = i + width * 3;     // bottom
      const p4 = i + width * 3 + 3; // bottom-right

      if (x < width - 1) {
        pixels[p1] += err_r * 7/16; pixels[p1+1] += err_g * 7/16; pixels[p1+2] += err_b * 7/16;
      }
      if (y < height - 1) {
        if (x > 0) {
          pixels[p2] += err_r * 3/16; pixels[p2+1] += err_g * 3/16; pixels[p2+2] += err_b * 3/16;
        }
        pixels[p3] += err_r * 5/16; pixels[p3+1] += err_g * 5/16; pixels[p3+2] += err_b * 5/16;
        if (x < width - 1) {
          pixels[p4] += err_r * 1/16; pixels[p4+1] += err_g * 1/16; pixels[p4+2] += err_b * 1/16;
        }
      }
    }
  }

  return sharp(finalImageData, { raw: { width, height, channels: 3 } }).png().toBuffer();
}

// New Gemini nano banana processing function using proper image generation
export async function processImageWithGemini(imageBuffer: Buffer): Promise<Buffer> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is required");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  
  // Convert buffer to base64 for Gemini
  const base64Image = imageBuffer.toString('base64');
  const mimeType = 'image/png';

  const prompt = "Make this image more simple, smooth and brightly colored, and 2D with edges. Simplify the details while maintaining the overall composition and make the colors more vibrant and saturated. Focus on creating clean, defined shapes with smooth edges that would work well for needlepoint embroidery.";

  try {
    // Use the image generation model for proper image-to-image processing
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-image-preview" });
    
    const result = await model.generateContent([
      {
        text: prompt
      },
      {
        inlineData: {
          data: base64Image,
          mimeType: mimeType
        }
      }
    ]);

    const response = await result.response;
    
    // Extract the generated image from the response
    if (response.candidates && response.candidates[0] && response.candidates[0].content && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          const imageData = part.inlineData.data;
          const buffer = Buffer.from(imageData, "base64");
          console.log("🎨 Gemini image generation completed successfully");
          return buffer;
        }
      }
    }
    
    // If no image was generated, fall back to enhanced processing
    console.log("🎨 No image generated by Gemini, using enhanced fallback");
    return await sharp(imageBuffer)
      .modulate({ saturation: 1.8, brightness: 1.1 })
      .blur(1.0)
      .sharpen(0.5)
      .png()
      .toBuffer();
      
  } catch (error) {
    console.error("Error processing image with Gemini:", error);
    // Fallback to enhanced sharp processing
    return await sharp(imageBuffer)
      .modulate({ saturation: 1.8, brightness: 1.1 })
      .blur(1.0)
      .sharpen(0.5)
      .png()
      .toBuffer();
  }
}