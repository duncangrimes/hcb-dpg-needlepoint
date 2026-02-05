/**
 * Test script: Process an image through V1, V2, and V2+Vision pipelines.
 *
 * Usage:
 *   npx tsx scripts/test-pipeline.ts <image-path> [canvas-width-inches] [mesh-count] [num-colors] [--vision]
 *
 * Examples:
 *   npx tsx scripts/test-pipeline.ts test-photo.jpg 8 13 12
 *   npx tsx scripts/test-pipeline.ts test-photo.jpg 8 13 12 --vision
 *
 * Output:
 *   test-output/v1-manufacturer.png    — V1 pipeline output
 *   test-output/v2-manufacturer.png    — V2 pipeline output
 *   test-output/v2-vision-manufacturer.png — V2 + Vision palette output (if --vision)
 *   test-output/v2-mask.png            — Subject isolation mask
 */

import fs from "fs";
import path from "path";
import sharp from "sharp";
import dotenv from "dotenv";

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, "..", ".env.local") });

// Resolve TS paths manually since we're running outside Next.js
const tsConfigPaths = require("tsconfig-paths");
tsConfigPaths.register({
  baseUrl: path.resolve(__dirname, ".."),
  paths: { "@/*": ["src/*"] },
});

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error("Usage: npx tsx scripts/test-pipeline.ts <image-path> [width] [mesh] [colors] [--vision]");
    process.exit(1);
  }

  // Parse args (filter out flags)
  const nonFlagArgs = args.filter(a => !a.startsWith("--"));
  const useVision = args.includes("--vision");
  
  const imagePath = nonFlagArgs[0];
  const canvasWidth = parseFloat(nonFlagArgs[1] || "8");
  const meshCount = parseInt(nonFlagArgs[2] || "13");
  const numColors = parseInt(nonFlagArgs[3] || "12");

  if (!fs.existsSync(imagePath)) {
    console.error(`File not found: ${imagePath}`);
    process.exit(1);
  }

  const outDir = path.resolve(__dirname, "..", "test-output");
  fs.mkdirSync(outDir, { recursive: true });

  const rawBuffer = fs.readFileSync(imagePath);
  console.log(`📸 Input: ${imagePath}`);
  console.log(`📐 Config: ${canvasWidth}" × ${meshCount}-mesh, ${numColors} colors\n`);

  // --- V1 Pipeline ---
  console.log("═══ V1 PIPELINE ═══\n");
  const { processImagePipeline } = await import("@/lib/canvas/process-image-pipeline");
  const v1Start = Date.now();
  const v1Result = await processImagePipeline(rawBuffer, {
    width: canvasWidth,
    meshCount,
    numColors,
  });
  const v1Time = Date.now() - v1Start;

  const v1Path = path.join(outDir, "v1-manufacturer.png");
  fs.writeFileSync(v1Path, v1Result.manufacturerImageBuffer);
  console.log(`\n✅ V1 done in ${(v1Time / 1000).toFixed(1)}s → ${v1Path}`);
  console.log(`   Threads: ${v1Result.threads.length}`);

  // --- V2 Pipeline ---
  console.log("\n═══ V2 PIPELINE ═══\n");
  const { processImagePipelineV2 } = await import("@/lib/canvas/process-image-pipeline-v2");
  const v2Start = Date.now();
  const v2Result = await processImagePipelineV2(rawBuffer, {
    width: canvasWidth,
    meshCount,
    numColors,
    background: {
      pattern: "gingham",
      color1: [200, 160, 180],   // Dusty pink
      color2: [255, 255, 255],   // White
      patternSize: 4,
    },
    outlineColor: [30, 30, 30],
    outlineWidth: 1,
    subjectScale: 0.55,
    flattenStrength: "medium",
    minRegionSize: 6,
  });
  const v2Time = Date.now() - v2Start;

  const v2Path = path.join(outDir, "v2-manufacturer.png");
  fs.writeFileSync(v2Path, v2Result.manufacturerImageBuffer);

  const maskPath = path.join(outDir, "v2-mask.png");
  fs.writeFileSync(maskPath, v2Result.maskBuffer);

  console.log(`\n✅ V2 done in ${(v2Time / 1000).toFixed(1)}s → ${v2Path}`);
  console.log(`   Threads: ${v2Result.threads.length}`);
  console.log(`   Stitchability: ${v2Result.stitchabilityScore.toFixed(2)}`);
  console.log(`   Mask: ${maskPath}`);

  // --- V2 + Vision Pipeline (if --vision flag) ---
  let v2VisionResult: typeof v2Result | null = null;
  let v2VisionTime = 0;
  
  if (useVision) {
    console.log("\n═══ V2 + VISION PIPELINE ═══\n");
    const v2VisionStart = Date.now();
    v2VisionResult = await processImagePipelineV2(rawBuffer, {
      width: canvasWidth,
      meshCount,
      numColors,
      background: {
        pattern: "gingham",
        color1: [200, 160, 180],
        color2: [255, 255, 255],
        patternSize: 4,
      },
      outlineColor: [30, 30, 30],
      outlineWidth: 1,
      subjectScale: 0.55,
      flattenStrength: "medium",
      minRegionSize: 6,
      useVisionPalette: true,
    });
    v2VisionTime = Date.now() - v2VisionStart;

    const v2VisionPath = path.join(outDir, "v2-vision-manufacturer.png");
    fs.writeFileSync(v2VisionPath, v2VisionResult.manufacturerImageBuffer);

    console.log(`\n✅ V2+Vision done in ${(v2VisionTime / 1000).toFixed(1)}s → ${v2VisionPath}`);
    console.log(`   Threads: ${v2VisionResult.threads.length}`);
    console.log(`   Stitchability: ${v2VisionResult.stitchabilityScore.toFixed(2)}`);
    if (v2VisionResult.visionAnalysis) {
      console.log(`   AI Analysis: "${v2VisionResult.visionAnalysis.subject_description}"`);
      console.log(`   AI Notes: ${v2VisionResult.visionAnalysis.notes}`);
    }
  }

  // --- Comparison ---
  console.log("\n═══ COMPARISON ═══\n");
  const v1Meta = await sharp(v1Result.manufacturerImageBuffer).metadata();
  const v2Meta = await sharp(v2Result.manufacturerImageBuffer).metadata();
  console.log(`V1: ${v1Meta.width}×${v1Meta.height}, ${v1Result.threads.length} threads, ${(v1Time / 1000).toFixed(1)}s`);
  console.log(`V2: ${v2Meta.width}×${v2Meta.height}, ${v2Result.threads.length} threads, ${(v2Time / 1000).toFixed(1)}s`);
  
  if (v2VisionResult) {
    const v2VisionMeta = await sharp(v2VisionResult.manufacturerImageBuffer).metadata();
    console.log(`V2+Vision: ${v2VisionMeta.width}×${v2VisionMeta.height}, ${v2VisionResult.threads.length} threads, ${(v2VisionTime / 1000).toFixed(1)}s`);
  }
  
  console.log(`\nOutputs saved to ${outDir}/`);
}

main().catch((err) => {
  console.error("Pipeline error:", err);
  process.exit(1);
});
