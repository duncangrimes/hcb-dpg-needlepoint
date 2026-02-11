"use server";

import sharp from "sharp";
import { put } from "@vercel/blob";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  processImageForManufacturing,
} from "@/lib/upload/manufacturer-image-processing";
import { generateAllImages } from "@/lib/images";
import type { ImageDimensions } from "@/lib/images";
import type { Thread } from "@/lib/colors";
import { pointInPolygon } from "@/lib/editor/geometry";
import type { PlacedCutout, Cutout, CanvasConfig } from "@/types/editor";

export interface GenerateCanvasInput {
  /** Canvas ID (if updating existing canvas) */
  canvasId?: string | null;
  /** Source images as data URLs keyed by id */
  sourceImages: Record<string, string>;
  /** Cutouts (reusable assets) keyed by id */
  cutouts: Record<string, Cutout>;
  /** Placed cutouts (instances on canvas) */
  placedCutouts: PlacedCutout[];
  /** Canvas configuration */
  canvasConfig: CanvasConfig;
}

export interface GenerateCanvasResult {
  success: boolean;
  /** Manufacturer image blob URL (high-res PNG with DPI) */
  manufacturerImageUrl?: string;
  /** Canvas preview with mesh grid overlay (data URL) */
  canvasPreviewUrl?: string;
  /** Stitched preview - clean finished look (data URL) */
  stitchedPreviewUrl?: string;
  /** Saved canvas ID */
  canvasId?: string | null;
  /** Thread list */
  threads?: Thread[];
  /** Stitchability score (0-10) */
  stitchabilityScore?: number;
  /** Dimensions in stitches */
  dimensions?: {
    width: number;
    height: number;
  };
  error?: string;
}

/**
 * Generate a needlepoint canvas from placed cutouts
 */
export async function generateCanvasAction(
  input: GenerateCanvasInput
): Promise<GenerateCanvasResult> {
  try {
    const { sourceImages, placedCutouts, canvasConfig } = input;

    // Calculate canvas dimensions in stitches
    const widthStitches = Math.round(canvasConfig.widthInches * canvasConfig.meshCount);
    const heightStitches = Math.round(canvasConfig.heightInches * canvasConfig.meshCount);

    // Create the canvas with background
    let canvas = await createBackgroundCanvas(
      widthStitches,
      heightStitches,
      canvasConfig
    );

    // Composite each cutout onto the canvas
    for (const placed of placedCutouts) {
      // Look up cutout from map (factory pattern)
      const cutout = input.cutouts[placed.cutoutId];
      if (!cutout) continue;

      const sourceDataUrl = sourceImages[cutout.sourceImageId];
      if (!sourceDataUrl) continue;

      // Extract and composite the cutout with proper mesh sizing
      canvas = await compositeCutout(
        canvas,
        sourceDataUrl,
        placed,
        cutout,
        canvasConfig.meshCount,
        widthStitches,
        heightStitches
      );
    }

    // Process with the existing manufacturing pipeline
    const maxColors = 12;
    const result = await processImageForManufacturing(canvas, maxColors, {
      useDithering: false, // Flat quantization for needlepoint
    });

    const threads = result.threads.map((t) => ({
      floss: t.floss,
      name: t.name,
      hex: t.hex,
      r: t.r,
      g: t.g,
      b: t.b,
    })) as Thread[];

    const stitchabilityScore = result.stitchabilityScore;

    // Generate all 3 image outputs from the stitch map
    const dimensions: ImageDimensions = {
      widthInches: canvasConfig.widthInches,
      heightInches: canvasConfig.heightInches,
      meshCount: canvasConfig.meshCount,
      widthStitches,
      heightStitches,
    };

    const images = await generateAllImages({
      stitchMapBuffer: result.manufacturerImageBuffer,
      dimensions,
    });

    // Upload to blob storage and save to database if authenticated
    let manufacturerImageUrl: string;
    let canvasPreviewUrl: string | undefined = images.canvasPreview.dataUrl;
    let stitchedPreviewUrl: string | undefined = images.stitchedPreview.dataUrl;
    let savedCanvasId = input.canvasId;
    
    try {
      const session = await auth();
      if (session?.user?.id) {
        // Upload manufacturer image to Vercel Blob (high-res PNG with DPI)
        const blob = await put(
          `canvases/${session.user.id}/${Date.now()}-manufacturer.png`,
          images.manufacturer.buffer,
          { access: "public", contentType: "image/png" }
        );
        manufacturerImageUrl = blob.url;

        // Save/update canvas in database
        const canvasData = {
          widthInches: canvasConfig.widthInches,
          heightInches: canvasConfig.heightInches,
          meshCount: canvasConfig.meshCount,
          bgPattern: canvasConfig.bgPattern.toUpperCase() as "SOLID" | "GINGHAM" | "STRIPES" | "CHECKERBOARD",
          bgColor1: canvasConfig.bgColor1,
          bgColor2: canvasConfig.bgColor2,
          manufacturerUrl: blob.url,
          threads: JSON.stringify(threads),
          stitchability: stitchabilityScore,
          status: "COMPLETE" as const,
        };

        if (savedCanvasId) {
          // Update existing canvas
          await prisma.canvas.update({
            where: { id: savedCanvasId },
            data: canvasData,
          });
        } else {
          // Create new canvas
          const newCanvas = await prisma.canvas.create({
            data: {
              ...canvasData,
              userId: session.user.id,
            },
          });
          savedCanvasId = newCanvas.id;
        }
      } else {
        // No auth - use data URL for manufacturer image
        manufacturerImageUrl = `data:image/png;base64,${images.manufacturer.buffer.toString("base64")}`;
      }
    } catch (saveError) {
      console.error("Failed to save canvas:", saveError);
      // Fallback to data URL if save fails
      manufacturerImageUrl = `data:image/png;base64,${images.manufacturer.buffer.toString("base64")}`;
    }

    return {
      success: true,
      manufacturerImageUrl,
      canvasPreviewUrl,
      stitchedPreviewUrl,
      canvasId: savedCanvasId,
      threads,
      stitchabilityScore,
      dimensions: {
        width: widthStitches,
        height: heightStitches,
      },
    };
  } catch (err) {
    console.error("Canvas generation failed:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Generation failed",
    };
  }
}

/**
 * Create a canvas with the background pattern/color
 */
async function createBackgroundCanvas(
  width: number,
  height: number,
  config: CanvasConfig
): Promise<Buffer> {
  const { bgPattern, bgColor1, bgColor2 } = config;

  // Parse hex colors to RGB
  const color1 = hexToRgb(bgColor1);
  const color2 = bgColor2 ? hexToRgb(bgColor2) : color1;

  // Create raw pixel buffer
  const pixels = Buffer.alloc(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      let color = color1;

      switch (bgPattern) {
        case "gingham": {
          const size = Math.max(1, Math.floor(width / 20));
          if (Math.floor(x / size) % 2 === Math.floor(y / size) % 2) {
            color = color2;
          }
          break;
        }
        case "stripes": {
          const stripeWidth = Math.max(1, Math.floor(width / 15));
          if (Math.floor(x / stripeWidth) % 2 === 0) {
            color = color2;
          }
          break;
        }
        case "checkerboard": {
          if ((x + y) % 2 === 0) {
            color = color2;
          }
          break;
        }
        // default: solid - use color1
      }

      pixels[idx] = color.r;
      pixels[idx + 1] = color.g;
      pixels[idx + 2] = color.b;
      pixels[idx + 3] = 255;
    }
  }

  return sharp(pixels, { raw: { width, height, channels: 4 } })
    .png()
    .toBuffer();
}

/**
 * Extract cutout from source and composite onto canvas
 * 
 * @param placed - The placed cutout with physical sizing info
 * @param cutout - The cutout asset with path data
 * @param meshCount - Stitches per inch for consistent sizing
 */
async function compositeCutout(
  canvas: Buffer,
  sourceDataUrl: string,
  placed: PlacedCutout,
  cutout: Cutout,
  meshCount: number,
  canvasWidth: number,
  canvasHeight: number
): Promise<Buffer> {
  const { path } = cutout;
  const { transform, widthInches, aspectRatio } = placed;
  // Parse source image data URL
  const matches = sourceDataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!matches) return canvas;

  const sourceBuffer = Buffer.from(matches[2], "base64");
  const sourceImage = sharp(sourceBuffer);
  const sourceMetadata = await sourceImage.metadata();
  
  if (!sourceMetadata.width || !sourceMetadata.height) return canvas;

  // Calculate cutout bounds in source pixels
  const srcWidth = sourceMetadata.width;
  const srcHeight = sourceMetadata.height;

  const minX = Math.min(...path.map((p) => p.x));
  const maxX = Math.max(...path.map((p) => p.x));
  const minY = Math.min(...path.map((p) => p.y));
  const maxY = Math.max(...path.map((p) => p.y));

  const cropX = Math.floor(minX * srcWidth);
  const cropY = Math.floor(minY * srcHeight);
  const cropWidth = Math.ceil((maxX - minX) * srcWidth);
  const cropHeight = Math.ceil((maxY - minY) * srcHeight);

  if (cropWidth <= 0 || cropHeight <= 0) return canvas;

  // Extract the cropped region
  const cropped = await sourceImage
    .extract({
      left: Math.max(0, cropX),
      top: Math.max(0, cropY),
      width: Math.min(cropWidth, srcWidth - cropX),
      height: Math.min(cropHeight, srcHeight - cropY),
    })
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Create mask for the lasso path
  const mask = Buffer.alloc(cropped.info.width * cropped.info.height);
  const localPath = path.map((p) => ({
    x: (p.x - minX) / (maxX - minX),
    y: (p.y - minY) / (maxY - minY),
  }));

  for (let y = 0; y < cropped.info.height; y++) {
    for (let x = 0; x < cropped.info.width; x++) {
      const nx = x / cropped.info.width;
      const ny = y / cropped.info.height;
      if (pointInPolygon({ x: nx, y: ny }, localPath)) {
        mask[y * cropped.info.width + x] = 255;
      }
    }
  }

  // Apply mask to create RGBA with transparency
  const rgba = Buffer.alloc(cropped.info.width * cropped.info.height * 4);
  const channels = cropped.info.channels;
  for (let i = 0; i < cropped.info.width * cropped.info.height; i++) {
    rgba[i * 4] = cropped.data[i * channels];
    rgba[i * 4 + 1] = cropped.data[i * channels + 1];
    rgba[i * 4 + 2] = cropped.data[i * channels + 2];
    rgba[i * 4 + 3] = mask[i];
  }

  // Calculate target size in stitches based on physical dimensions
  // widthInches * meshCount * scale = target width in stitches
  const targetWidth = Math.round(widthInches * meshCount * transform.scale);
  const targetHeight = Math.round(targetWidth * aspectRatio);
  
  // Clamp to reasonable bounds (at least 1 stitch, at most canvas size)
  const clampedWidth = Math.max(1, Math.min(targetWidth, canvasWidth));
  const clampedHeight = Math.max(1, Math.min(targetHeight, canvasHeight));

  // Resize and rotate the cutout
  let cutoutSharp = sharp(rgba, {
    raw: { width: cropped.info.width, height: cropped.info.height, channels: 4 },
  })
    .resize(clampedWidth, clampedHeight, { fit: "fill" });

  if (transform.rotation !== 0) {
    cutoutSharp = cutoutSharp.rotate(transform.rotation, {
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    });
  }

  if (transform.flipX) {
    cutoutSharp = cutoutSharp.flop();
  }

  if (transform.flipY) {
    cutoutSharp = cutoutSharp.flip();
  }

  const cutoutBuffer = await cutoutSharp.png().toBuffer();

  // Calculate position on canvas (centered on transform position)
  const posX = Math.round(transform.x * canvasWidth - clampedWidth / 2);
  const posY = Math.round(transform.y * canvasHeight - clampedHeight / 2);

  // Composite onto canvas
  return sharp(canvas)
    .composite([
      {
        input: cutoutBuffer,
        left: Math.max(0, posX),
        top: Math.max(0, posY),
      },
    ])
    .png()
    .toBuffer();
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 255, g: 255, b: 255 };
}
