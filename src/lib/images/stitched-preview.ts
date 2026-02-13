/**
 * Stitched Preview Generation
 *
 * Generates a preview showing finished needlepoint with realistic tent stitches.
 *
 * REALITY MODEL (based on research):
 * - Tent stitch is a DIAGONAL LINE (45°), not an oval or blob
 * - Each stitch runs from lower-left to upper-right of its cell
 * - Thread has visible STRANDS (2-4 plies twisted together)
 * - Within a color area, stitches BLEND TOGETHER seamlessly
 * - Shadows appear only at COLOR BOUNDARIES, not every stitch edge
 * - Continuous diagonal texture flows across the surface
 */

import sharp from "sharp";
import { getConfig } from "./config";
import type { ImageDimensions, FabricTextureConfig, StitchedPreviewResult } from "./types";

/**
 * Clamps a value between min and max.
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Simple seeded random number generator for deterministic noise.
 */
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return (state >>> 0) / 0xffffffff;
  };
}

/**
 * Checks if two colors are similar (within tolerance)
 */
function sameColor(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): boolean {
  const tolerance = 8;
  return Math.abs(r1 - r2) < tolerance && 
         Math.abs(g1 - g2) < tolerance && 
         Math.abs(b1 - b2) < tolerance;
}

/**
 * Applies realistic tent stitch texture.
 *
 * Key principles:
 * - Continuous diagonal thread texture across surface (no cell boundaries)
 * - Shadows ONLY at actual color boundaries
 * - Very subtle per-pixel variation for organic feel
 *
 * @param imageData - Raw RGBA pixel buffer
 * @param width - Image width in pixels
 * @param height - Image height in pixels
 * @param cellSize - Size of each stitch cell in pixels
 * @param seed - Random seed for deterministic noise
 */
function applyStitchTexture(
  imageData: Buffer,
  width: number,
  height: number,
  cellSize: number,
  seed: number = 42
): void {
  const random = seededRandom(seed);

  // Build a map of cell colors for boundary detection
  const cellsX = Math.ceil(width / cellSize);
  const cellsY = Math.ceil(height / cellSize);
  const cellColors: Array<{ r: number; g: number; b: number }> = [];
  
  for (let cy = 0; cy < cellsY; cy++) {
    for (let cx = 0; cx < cellsX; cx++) {
      const px = Math.min(cx * cellSize + Math.floor(cellSize / 2), width - 1);
      const py = Math.min(cy * cellSize + Math.floor(cellSize / 2), height - 1);
      const idx = (py * width + px) * 4;
      cellColors.push({
        r: imageData[idx],
        g: imageData[idx + 1],
        b: imageData[idx + 2],
      });
    }
  }

  const getCellColor = (cx: number, cy: number) => {
    if (cx < 0 || cx >= cellsX || cy < 0 || cy >= cellsY) return null;
    return cellColors[cy * cellsX + cx];
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      const cellX = Math.floor(x / cellSize);
      const cellY = Math.floor(y / cellSize);
      const myColor = cellColors[cellY * cellsX + cellX];

      const baseR = imageData[idx];
      const baseG = imageData[idx + 1];
      const baseB = imageData[idx + 2];

      const localX = (x % cellSize) / cellSize;
      const localY = (y % cellSize) / cellSize;

      // === CONTINUOUS DIAGONAL THREAD TEXTURE ===
      // Thread strands run diagonally across the entire surface
      // Uses GLOBAL position, not cell-local, for seamless texture
      const globalDiag = (x - y);
      const threadPhase = (globalDiag / cellSize * 3.5) % 1;
      // Smooth sine wave for thread strand ridges
      const threadTexture = 1.0 + Math.sin(threadPhase * Math.PI * 2) * 0.025;

      // === SHADOW AT COLOR BOUNDARIES ===
      let boundaryShadow = 1.0;
      
      const leftColor = getCellColor(cellX - 1, cellY);
      const rightColor = getCellColor(cellX + 1, cellY);
      const topColor = getCellColor(cellX, cellY - 1);
      const bottomColor = getCellColor(cellX, cellY + 1);

      const threshold = 0.18;
      
      if (localX < threshold && leftColor && 
          !sameColor(myColor.r, myColor.g, myColor.b, leftColor.r, leftColor.g, leftColor.b)) {
        const edgeDist = localX / threshold;
        boundaryShadow = Math.min(boundaryShadow, 0.85 + edgeDist * 0.15);
      }
      if (localX > (1 - threshold) && rightColor && 
          !sameColor(myColor.r, myColor.g, myColor.b, rightColor.r, rightColor.g, rightColor.b)) {
        const edgeDist = (1 - localX) / threshold;
        boundaryShadow = Math.min(boundaryShadow, 0.85 + edgeDist * 0.15);
      }
      if (localY < threshold && topColor && 
          !sameColor(myColor.r, myColor.g, myColor.b, topColor.r, topColor.g, topColor.b)) {
        const edgeDist = localY / threshold;
        boundaryShadow = Math.min(boundaryShadow, 0.85 + edgeDist * 0.15);
      }
      if (localY > (1 - threshold) && bottomColor && 
          !sameColor(myColor.r, myColor.g, myColor.b, bottomColor.r, bottomColor.g, bottomColor.b)) {
        const edgeDist = (1 - localY) / threshold;
        boundaryShadow = Math.min(boundaryShadow, 0.85 + edgeDist * 0.15);
      }

      // === VERY SUBTLE LIGHT DIRECTION ===
      // Light from upper-left
      const lightFactor = 1.0 + 0.01 * (1 - (x + y) / (width + height));

      // === COMBINE FACTORS ===
      const textureFactor = threadTexture * boundaryShadow * lightFactor;

      // Very subtle per-pixel noise (fiber texture)
      const noise = (random() - 0.5) * 3;

      const newR = baseR * textureFactor + noise;
      const newG = baseG * textureFactor + noise;
      const newB = baseB * textureFactor + noise;

      imageData[idx] = Math.round(clamp(newR, 0, 255));
      imageData[idx + 1] = Math.round(clamp(newG, 0, 255));
      imageData[idx + 2] = Math.round(clamp(newB, 0, 255));
    }
  }
}

/**
 * Generates the stitched preview with realistic diagonal tent stitches.
 *
 * @param stitchMapBuffer - PNG buffer where 1 pixel = 1 stitch
 * @param dimensions - Physical and stitch dimensions
 * @param configOverride - Fabric texture configuration (reserved)
 * @returns Stitched preview result with buffer and dimensions
 */
export async function generateStitchedPreview(
  stitchMapBuffer: Buffer,
  dimensions: ImageDimensions,
  configOverride?: Partial<FabricTextureConfig>
): Promise<StitchedPreviewResult> {
  const config = getConfig();
  const { dpi, quality } = config.preview;

  const targetWidth = Math.round(dimensions.widthInches * dpi);
  const targetHeight = Math.round(dimensions.heightInches * dpi);
  const cellSize = Math.round(dpi / dimensions.meshCount);

  // 1. Upscale with nearest-neighbor to preserve stitch blocks
  const upscaled = await sharp(stitchMapBuffer)
    .resize(targetWidth, targetHeight, {
      kernel: sharp.kernel.nearest,
      fit: "fill",
    })
    .ensureAlpha()
    .raw()
    .toBuffer();

  // 2. Apply stitch texture
  const seed = targetWidth * 1000 + targetHeight + 12345;
  applyStitchTexture(upscaled, targetWidth, targetHeight, cellSize, seed);

  // 3. Convert to JPEG
  const buffer = await sharp(upscaled, {
    raw: { width: targetWidth, height: targetHeight, channels: 4 },
  })
    .jpeg({ quality: quality ?? 85 })
    .toBuffer();

  return {
    buffer,
    width: targetWidth,
    height: targetHeight,
  };
}
