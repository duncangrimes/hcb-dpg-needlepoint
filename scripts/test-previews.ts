/**
 * Test script to generate preview images for quality evaluation
 * 
 * Run with: npx tsx scripts/test-previews.ts
 */

import sharp from "sharp";
import { writeFileSync } from "fs";
import { join } from "path";

// Import our preview generators
import { generateCanvasPreview } from "../src/lib/images/canvas-preview";
import { generateStitchedPreview } from "../src/lib/images/stitched-preview";
import { generateManufacturerImage } from "../src/lib/images/manufacturer-output";
import type { ImageDimensions } from "../src/lib/images/types";

async function main() {
  console.log("🧪 Testing preview generation functions...\n");

  // Create a simple test image (20x20 pixels with colored quadrants)
  // This simulates a stitch-mapped image where each pixel = 1 stitch
  const testWidth = 20;
  const testHeight = 20;
  
  // Create a test pattern with SOLID color quadrants (no checker)
  // This tests that we don't introduce artificial checkerboard patterns
  const pixels = Buffer.alloc(testWidth * testHeight * 3);
  for (let y = 0; y < testHeight; y++) {
    for (let x = 0; x < testWidth; x++) {
      const idx = (y * testWidth + x) * 3;
      const quadrant = (x < testWidth/2 ? 0 : 1) + (y < testHeight/2 ? 0 : 2);
      
      switch (quadrant) {
        case 0: // Top-left: Solid Red
          pixels[idx] = 200;
          pixels[idx + 1] = 70;
          pixels[idx + 2] = 70;
          break;
        case 1: // Top-right: Solid Blue
          pixels[idx] = 70;
          pixels[idx + 1] = 110;
          pixels[idx + 2] = 190;
          break;
        case 2: // Bottom-left: Solid Green
          pixels[idx] = 90;
          pixels[idx + 1] = 160;
          pixels[idx + 2] = 100;
          break;
        case 3: // Bottom-right: Solid Orange/Gold
          pixels[idx] = 220;
          pixels[idx + 1] = 160;
          pixels[idx + 2] = 60;
          break;
      }
    }
  }

  // Convert to PNG buffer
  const stitchMapBuffer = await sharp(pixels, {
    raw: { width: testWidth, height: testHeight, channels: 3 },
  })
    .png()
    .toBuffer();

  // Define test dimensions (simulating a 4" x 4" canvas at 13 mesh)
  const dimensions: ImageDimensions = {
    widthInches: 4,
    heightInches: 4,
    meshCount: 13,
    widthStitches: testWidth,
    heightStitches: testHeight,
  };

  const outputDir = join(__dirname, "../test-output");
  
  // Create output directory if needed
  const { mkdirSync } = await import("fs");
  try { mkdirSync(outputDir, { recursive: true }); } catch {}

  // Save the original stitch map for reference
  writeFileSync(join(outputDir, "01-stitch-map.png"), stitchMapBuffer);
  console.log("✅ Saved: 01-stitch-map.png (original stitch map, 20x20 pixels)");

  // 1. Test manufacturer output (300 DPI)
  console.log("\n📸 Generating manufacturer image (300 DPI)...");
  const manufacturer = await generateManufacturerImage(stitchMapBuffer, dimensions);
  writeFileSync(join(outputDir, "02-manufacturer.png"), manufacturer.buffer);
  console.log(`✅ Saved: 02-manufacturer.png (${manufacturer.width}x${manufacturer.height}px)`);

  // 2. Test canvas preview (150 DPI with mesh grid)
  console.log("\n🔲 Generating canvas preview (with mesh grid)...");
  const canvasPreview = await generateCanvasPreview(stitchMapBuffer, dimensions);
  writeFileSync(join(outputDir, "03-canvas-preview.jpg"), canvasPreview.buffer);
  console.log(`✅ Saved: 03-canvas-preview.jpg (${canvasPreview.width}x${canvasPreview.height}px)`);

  // 3. Test stitched preview (150 DPI)
  console.log("\n🧵 Generating stitched preview...");
  const stitchedPreview = await generateStitchedPreview(stitchMapBuffer, dimensions);
  writeFileSync(join(outputDir, "04-stitched-preview.jpg"), stitchedPreview.buffer);
  console.log(`✅ Saved: 04-stitched-preview.jpg (${stitchedPreview.width}x${stitchedPreview.height}px)`);

  console.log("\n" + "=".repeat(60));
  console.log("📁 Output files saved to:", outputDir);
  console.log("=".repeat(60));
  console.log("\nOpen these files to evaluate quality:");
  console.log("- Canvas preview should show mesh with holes, not just lines");
  console.log("- Stitched preview should show diagonal stitch texture");
  console.log("=".repeat(60));
}

main().catch(console.error);
