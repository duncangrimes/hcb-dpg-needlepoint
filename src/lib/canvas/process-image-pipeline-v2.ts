import sharp from "sharp";
import {
  extractImageMetadata,
  calculateStitchDimensions,
  resizeImageForNeedlepoint,
  processImageForManufacturing,
} from "@/lib/upload/manufacturer-image-processing";
import {
  applyColorCorrection,
  enforceColorLimits,
  type Thread,
} from "@/lib/colors";
import { isolateSubject } from "@/lib/isolation";
import {
  generateBackground,
  type BackgroundConfig,
} from "@/lib/background";
import {
  flattenTextures,
  dissolveSmallRegions,
  generateOutline,
} from "@/lib/simplification";
import { compositeCanvas } from "@/lib/compositor";

export interface CanvasConfigV2 {
  /** Canvas width in inches */
  width: number;
  /** Mesh count (stitches per inch) */
  meshCount: number;
  /** Number of colors for the subject (will be enforced by size limits) */
  numColors: number;
  /** Background configuration */
  background: BackgroundConfig;
  /** Outline color [r,g,b] (default: [0,0,0] black) */
  outlineColor?: [number, number, number];
  /** Outline width in stitches (default: 1) */
  outlineWidth?: number;
  /** Subject scale as fraction of canvas (default: 0.55) */
  subjectScale?: number;
  /** Texture flattening strength (default: 'medium') */
  flattenStrength?: "light" | "medium" | "heavy";
  /** Minimum region size for confetti cleanup (default: 6) */
  minRegionSize?: number;
}

export interface ProcessedImageResultV2 {
  /** Final manufacturer image where 1 pixel = 1 stitch */
  manufacturerImageBuffer: Buffer;
  /** Thread list with DMC mappings */
  threads: Thread[];
  /** Stitchability score */
  stitchabilityScore: number;
  /** Subject isolation mask (for preview/debugging) */
  maskBuffer: Buffer;
  /** Stitch dimensions */
  dimensions: {
    widthInStitches: number;
    heightInStitches: number;
  };
}

/**
 * V2 Pipeline: Isolate → Simplify → Generate Background → Composite → Optimize
 *
 * This pipeline separates subject from background, processes them independently,
 * and composites them into a final manufacturer-ready canvas where each pixel = 1 stitch.
 *
 * Key differences from v1:
 * - AI-based subject isolation (removes original background)
 * - Subject is simplified with texture flattening + flat quantization
 * - Background is generated (not derived from photo)
 * - Dark outline added around subject
 * - Connected-component cleanup dissolves confetti
 *
 * @param rawBuffer - Original photo buffer
 * @param config - V2 canvas configuration
 * @returns Processed result with manufacturer image, threads, and score
 */
export async function processImagePipelineV2(
  rawBuffer: Buffer,
  config: CanvasConfigV2
): Promise<ProcessedImageResultV2> {
  const {
    width: canvasWidthInches,
    meshCount,
    background: bgConfig,
    outlineColor = [0, 0, 0],
    outlineWidth = 1,
    subjectScale = 0.55,
    flattenStrength = "medium",
    minRegionSize = 6,
  } = config;

  // Enforce color limits based on canvas size
  const numColors = enforceColorLimits(config.numColors, canvasWidthInches);

  // --- Step 1: Calculate canvas dimensions ---
  const metadata = await extractImageMetadata(rawBuffer);
  const { widthInStitches, heightInStitches } = calculateStitchDimensions(
    canvasWidthInches,
    meshCount,
    1.0 // Square canvas for now; can use metadata.aspectRatio for non-square
  );

  console.log(`\n🧵 ═══ V2 PIPELINE START ═══`);
  console.log(`📐 Canvas: ${widthInStitches}×${heightInStitches} stitches (${canvasWidthInches}" @ ${meshCount}-mesh)`);
  console.log(`🎨 Target colors: ${numColors}`);

  // --- Step 2: Isolate subject ---
  console.log(`\n📸 Step 2: Subject isolation...`);
  const { subjectBuffer, maskBuffer } = await isolateSubject(rawBuffer);

  // --- Step 3: Flatten subject textures ---
  console.log(`\n🔧 Step 3: Texture flattening (${flattenStrength})...`);
  const flattened = await flattenTextures(subjectBuffer, flattenStrength);

  // --- Step 4: Resize flattened subject for needlepoint ---
  // Subject will be sized relative to the canvas, then placed by compositor
  const subjectMeta = await sharp(flattened).metadata();
  const subjectAspect = (subjectMeta.height ?? 1) / (subjectMeta.width ?? 1);
  const targetSubjectW = Math.round(widthInStitches * subjectScale);
  const targetSubjectH = Math.round(targetSubjectW * subjectAspect);

  console.log(`\n📏 Step 4: Resize subject to ${targetSubjectW}×${targetSubjectH} stitches...`);
  const resizedSubject = await resizeImageForNeedlepoint(
    flattened,
    targetSubjectW,
    targetSubjectH
  );

  // --- Step 5: Color correct subject ---
  console.log(`\n🎨 Step 5: Color correction...`);
  const corrected = await applyColorCorrection(resizedSubject);

  // --- Step 6: Quantize subject + map to threads ---
  // Reserve 1-2 colors for background, 1 for outline
  // Use flat quantization (no dithering) for cleaner results
  const subjectColors = Math.max(4, numColors - 3);
  console.log(`\n🧶 Step 6: Quantize subject to ${subjectColors} colors (flat, no dithering)...`);
  const {
    manufacturerImageBuffer: subjectQuantized,
    threads: subjectThreads,
    stitchabilityScore: subjectStitchabilityScore,
  } = await processImageForManufacturing(corrected, subjectColors, { useDithering: false });

  // --- Step 7: Connected-component cleanup on subject ---
  console.log(`\n🧹 Step 7: Connected-component cleanup (min region: ${minRegionSize})...`);
  const { data: subjectPixels, info: subjectInfo } = await sharp(subjectQuantized)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  dissolveSmallRegions(
    subjectPixels,
    subjectInfo.width,
    subjectInfo.height,
    minRegionSize,
    3
  );

  const cleanedSubject = await sharp(subjectPixels, {
    raw: { width: subjectInfo.width, height: subjectInfo.height, channels: 3 },
  })
    .png()
    .toBuffer();

  // --- Step 8: Generate outline ---
  console.log(`\n✏️ Step 8: Generate ${outlineWidth}px outline...`);
  // Resize the mask to match the subject's stitch dimensions
  const resizedMask = await sharp(maskBuffer)
    .resize(targetSubjectW, targetSubjectH, {
      kernel: sharp.kernel.nearest,
      fit: "fill",
    })
    .png()
    .toBuffer();

  const outlineMask = await generateOutline(
    resizedMask,
    targetSubjectW,
    targetSubjectH,
    outlineWidth
  );

  // --- Step 9: Generate background ---
  console.log(`\n🎨 Step 9: Generate ${bgConfig.pattern} background...`);
  const backgroundBuffer = await generateBackground(
    widthInStitches,
    heightInStitches,
    bgConfig
  );

  // --- Step 10: Composite ---
  console.log(`\n🖼️ Step 10: Composite canvas...`);
  // Add alpha to cleaned subject using the resized mask.
  // First ensure both are the same dimensions, then combine channel-by-channel.
  const cleanedResized = await sharp(cleanedSubject)
    .resize(targetSubjectW, targetSubjectH, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer();

  const maskRaw = await sharp(resizedMask)
    .resize(targetSubjectW, targetSubjectH, { fit: "fill" })
    .greyscale()
    .raw()
    .toBuffer();

  // Build RGBA buffer manually
  const rgbaData = Buffer.alloc(targetSubjectW * targetSubjectH * 4);
  for (let i = 0; i < targetSubjectW * targetSubjectH; i++) {
    rgbaData[i * 4] = cleanedResized[i * 3];
    rgbaData[i * 4 + 1] = cleanedResized[i * 3 + 1];
    rgbaData[i * 4 + 2] = cleanedResized[i * 3 + 2];
    rgbaData[i * 4 + 3] = maskRaw[i]; // Alpha from mask
  }

  const subjectWithAlpha = await sharp(rgbaData, {
    raw: { width: targetSubjectW, height: targetSubjectH, channels: 4 },
  })
    .png()
    .toBuffer();

  const finalImage = await compositeCanvas(
    backgroundBuffer,
    subjectWithAlpha,
    outlineMask,
    outlineColor,
    widthInStitches,
    heightInStitches,
    subjectScale
  );

  // --- Step 11: Report scoring ---
  // Use subject's stitchability score (not the composited image)
  // Background patterns shouldn't impact the score since they're user-chosen
  console.log(`\n📊 Step 11: Reporting subject stitchability...`);

  // Build final thread list (subject threads + outline + background colors)
  const allThreads: Thread[] = [...subjectThreads.map(({ stitches, ...t }) => t)];

  console.log(`\n🧵 ═══ V2 PIPELINE COMPLETE ═══`);
  console.log(`📊 Subject stitchability score: ${subjectStitchabilityScore.toFixed(2)} (background not scored)`);
  console.log(`🎨 Colors used: ${allThreads.length} (subject) + background + outline`);

  return {
    manufacturerImageBuffer: finalImage,
    threads: allThreads,
    stitchabilityScore: subjectStitchabilityScore, // Score from subject only
    maskBuffer,
    dimensions: {
      widthInStitches,
      heightInStitches,
    },
  };
}
