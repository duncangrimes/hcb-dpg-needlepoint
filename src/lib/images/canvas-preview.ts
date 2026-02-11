/**
 * Canvas Preview Generation
 *
 * Generates a preview image with mesh grid overlay.
 * Shows users "what you'll receive" — the canvas with stitch grid.
 */

import sharp from "sharp";
import { getConfig } from "./config";
import { calculateCellSize } from "./upscale";
import type { ImageDimensions, MeshGridConfig, CanvasPreviewResult } from "./types";

/**
 * Generates a mesh grid overlay as a raw RGBA buffer.
 *
 * Creates grid lines at stitch boundaries with optional 3D highlight.
 */
async function generateMeshGridOverlay(
  width: number,
  height: number,
  cellSize: number,
  config: MeshGridConfig
): Promise<Buffer> {
  const { lineWidthRatio, lineColor, highlight3D, highlightOpacity } = config;
  const lineWidth = Math.max(1, Math.round(cellSize * lineWidthRatio));

  // Create RGBA buffer for the grid
  const pixels = Buffer.alloc(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      // Position within cell
      const cellX = x % cellSize;
      const cellY = y % cellSize;

      // Check if on grid line
      const onVerticalLine = cellX < lineWidth;
      const onHorizontalLine = cellY < lineWidth;
      const onLine = onVerticalLine || onHorizontalLine;

      if (onLine) {
        pixels[idx] = lineColor.r;
        pixels[idx + 1] = lineColor.g;
        pixels[idx + 2] = lineColor.b;
        pixels[idx + 3] = lineColor.a;

        // Add 3D highlight at intersections (top-left of each cell)
        if (highlight3D && onVerticalLine && onHorizontalLine) {
          pixels[idx + 3] = Math.round(255 * highlightOpacity);
        }
      } else {
        // Transparent
        pixels[idx] = 0;
        pixels[idx + 1] = 0;
        pixels[idx + 2] = 0;
        pixels[idx + 3] = 0;
      }
    }
  }

  return pixels;
}

/**
 * Generates the canvas preview with mesh grid overlay.
 *
 * - Nearest-neighbor upscale to preview DPI
 * - Applies mesh grid overlay (semi-transparent white/gray lines)
 * - JPEG output for web optimization
 *
 * @param stitchMapBuffer - PNG buffer where 1 pixel = 1 stitch
 * @param dimensions - Physical and stitch dimensions
 * @param configOverride - Mesh grid configuration override
 * @returns Canvas preview result with buffer and dimensions
 */
export async function generateCanvasPreview(
  stitchMapBuffer: Buffer,
  dimensions: ImageDimensions,
  configOverride?: Partial<MeshGridConfig>
): Promise<CanvasPreviewResult> {
  const config = getConfig();
  const { dpi, quality } = config.preview;
  const meshConfig = { ...config.meshGrid, ...configOverride };

  const targetWidth = Math.round(dimensions.widthInches * dpi);
  const targetHeight = Math.round(dimensions.heightInches * dpi);
  const cellSize = calculateCellSize(dimensions.meshCount, dpi);

  // 1. Generate mesh grid overlay
  const gridOverlay = await generateMeshGridOverlay(
    targetWidth,
    targetHeight,
    cellSize,
    meshConfig
  );

  // 2. Convert raw grid to PNG for compositing
  const gridPng = await sharp(gridOverlay, {
    raw: { width: targetWidth, height: targetHeight, channels: 4 },
  })
    .png()
    .toBuffer();

  // 3. Upscale stitch map and composite grid
  const composited = await sharp(stitchMapBuffer)
    .resize(targetWidth, targetHeight, {
      kernel: sharp.kernel.nearest,
      fit: "fill",
    })
    .composite([{ input: gridPng, blend: "over" }])
    .jpeg({ quality: quality ?? 85 })
    .toBuffer();

  return {
    buffer: composited,
    width: targetWidth,
    height: targetHeight,
  };
}
