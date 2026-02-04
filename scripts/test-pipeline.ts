/**
 * Test script: Process an image through both V1 and V2 pipelines and compare.
 *
 * Usage:
 *   npx tsx scripts/test-pipeline.ts <image-path> [canvas-width-inches] [mesh-count] [num-colors]
 *
 * Example:
 *   npx tsx scripts/test-pipeline.ts test-photo.jpg 8 13 12
 *
 * Output:
 *   test-output/v1-manufacturer.png  — V1 pipeline output
 *   test-output/v2-manufacturer.png  — V2 pipeline output
 *   test-output/v2-mask.png          — Subject isolation mask
 *   test-output/v2-background.png    — Generated background
 */

import fs from "fs";
import path from "path";
import sharp from "sharp";

// Resolve TS paths manually since we're running outside Next.js
const tsConfigPaths = require("tsconfig-paths");
tsConfigPaths.register({
  baseUrl: path.resolve(__dirname, ".."),
  paths: { "@/*": ["src/*"] },
});

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error("Usage: npx tsx scripts/test-pipeline.ts <image-path> [width] [mesh] [colors]");
    process.exit(1);
  }

  const imagePath = args[0];
  const canvasWidth = parseFloat(args[1] || "8");
  const meshCount = parseInt(args[2] || "13");
  const numColors = parseInt(args[3] || "12");

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

  // --- Comparison ---
  console.log("\n═══ COMPARISON ═══\n");
  const v1Meta = await sharp(v1Result.manufacturerImageBuffer).metadata();
  const v2Meta = await sharp(v2Result.manufacturerImageBuffer).metadata();
  console.log(`V1: ${v1Meta.width}×${v1Meta.height}, ${v1Result.threads.length} threads, ${(v1Time / 1000).toFixed(1)}s`);
  console.log(`V2: ${v2Meta.width}×${v2Meta.height}, ${v2Result.threads.length} threads, ${(v2Time / 1000).toFixed(1)}s`);
  console.log(`\nOutputs saved to ${outDir}/`);
}

main().catch((err) => {
  console.error("Pipeline error:", err);
  process.exit(1);
});
