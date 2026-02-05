/**
 * Vision-Guided Quantization
 * 
 * Uses AI-suggested colors to guide the quantization process,
 * ensuring the final palette matches what Gemini identified as
 * the key colors in the image.
 */

import sharp from "sharp";
import { converter, differenceEuclidean } from "culori";
import type { Thread } from "@/lib/colors";
import { analyzeImageForPalette } from "./palette-analyzer";
import { mapSuggestedColorsToDMC, extractThreadsFromMappedPalette } from "./palette-mapper";

export interface VisionGuidedResult {
  /** Quantized image buffer */
  quantizedBuffer: Buffer;
  /** DMC threads used (mapped from AI suggestions) */
  threads: Thread[];
  /** Raw AI analysis for debugging */
  analysis: {
    subject_description: string;
    notes: string;
  };
}

/**
 * Quantizes an image using AI-guided color palette selection.
 * 
 * Flow:
 * 1. Send image to Gemini to identify key colors
 * 2. Map suggested colors to nearest DMC threads
 * 3. Quantize image to that specific thread palette
 * 
 * @param imageBuffer - Image to quantize (should be the isolated subject)
 * @param maxColors - Maximum colors for the palette
 * @returns Quantized image and thread list
 */
export async function quantizeWithVisionGuidance(
  imageBuffer: Buffer,
  maxColors: number = 8
): Promise<VisionGuidedResult> {
  console.log(`\n🤖 Starting vision-guided quantization...`);
  
  // Step 1: Analyze image with Gemini
  const analysis = await analyzeImageForPalette(imageBuffer, maxColors);
  
  // Step 2: Map suggested colors to DMC threads
  const mappedColors = await mapSuggestedColorsToDMC(analysis.suggested_palette);
  const threads = extractThreadsFromMappedPalette(mappedColors);
  
  if (threads.length === 0) {
    throw new Error("Vision analysis returned no usable colors");
  }
  
  // Step 3: Quantize image to the specific thread palette
  console.log(`🎨 Quantizing image to ${threads.length} vision-guided colors...`);
  const quantizedBuffer = await quantizeToThreadPalette(imageBuffer, threads);
  
  return {
    quantizedBuffer,
    threads,
    analysis: {
      subject_description: analysis.subject_description,
      notes: analysis.notes,
    },
  };
}

/**
 * Quantizes an image to a specific set of DMC threads.
 * Uses nearest-neighbor mapping in OKLab color space.
 * 
 * @param imageBuffer - Source image
 * @param threads - Target thread palette
 * @returns Quantized image buffer
 */
async function quantizeToThreadPalette(
  imageBuffer: Buffer,
  threads: Thread[]
): Promise<Buffer> {
  const { data, info } = await sharp(imageBuffer)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  
  const { width, height } = info;
  const toOklab = converter("oklab");
  const colorDiff = differenceEuclidean("oklab");
  
  // Pre-convert threads to OKLab
  const threadLabs = threads.map((t) => ({
    thread: t,
    lab: toOklab({ r: t.r / 255, g: t.g / 255, b: t.b / 255, mode: "rgb" }),
  }));
  
  const outputData = Buffer.alloc(data.length);
  
  for (let i = 0; i < data.length; i += 3) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    const pixelLab = toOklab({ r: r / 255, g: g / 255, b: b / 255, mode: "rgb" });
    
    // Find nearest thread
    let bestThread = threadLabs[0];
    let bestDist = Infinity;
    
    for (const tl of threadLabs) {
      const dist = colorDiff(pixelLab, tl.lab);
      if (dist < bestDist) {
        bestDist = dist;
        bestThread = tl;
      }
    }
    
    outputData[i] = bestThread.thread.r;
    outputData[i + 1] = bestThread.thread.g;
    outputData[i + 2] = bestThread.thread.b;
  }
  
  console.log(`✅ Vision-guided quantization complete`);
  
  return sharp(outputData, { raw: { width, height, channels: 3 } })
    .png()
    .toBuffer();
}
