# Image Pipeline Architecture

**Status:** Design  
**Created:** 2026-02-10  
**Author:** Systems Architect

---

## Executive Summary

This document defines the architecture for generating three distinct image outputs from a single stitch-mapped source. The design prioritizes stitch precision, configurability, and performance while maintaining a clean separation of concerns.

---

## Current State Analysis

### Existing Flow

```
User Canvas (cutouts + config)
         │
         ▼
┌─────────────────────────────────────────────┐
│ generateCanvasAction() — Server Action       │
│  • Creates background canvas                 │
│  • Composites cutouts with transforms        │
│  • Calls processImageForManufacturing()      │
└──────────────────────┬──────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────┐
│ processImageForManufacturing() — Lib         │
│  • Wu's quantization                         │
│  • DMC thread mapping                        │
│  • Dithering/flat quantization               │
│  • Majority filter cleanup                   │
│  • Returns: Buffer (1px = 1 stitch)          │
└──────────────────────┬──────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────┐
│ Output: Single PNG                           │
│  • Stored in Vercel Blob                     │
│  • No DPI upscaling                          │
│  • No previews                               │
└─────────────────────────────────────────────┘
```

### Current Limitations

1. **No DPI metadata** — Stitch-mapped image lacks print resolution info
2. **No previews** — Users can't see canvas mesh or stitched result
3. **No upscaling** — Manufacturer needs high-res, not 130×182px files
4. **Coupled concerns** — Generation and storage mixed in action

---

## Proposed Architecture

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           STITCH-MAPPED BASE                                 │
│                        (1 pixel = 1 stitch, ~130×182px)                      │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  processImageForManufacturing() → stitchMapBuffer                      │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                 ▼
           ┌───────────────┐  ┌───────────────┐  ┌───────────────┐
           │  MANUFACTURER │  │ CANVAS PREVIEW│  │STITCHED PREVIEW│
           │     IMAGE     │  │               │  │                │
           │               │  │               │  │                │
           │ • NN upscale  │  │ • NN upscale  │  │ • NN upscale   │
           │   to 300 DPI  │  │   to 150 DPI  │  │   to 150 DPI   │
           │ • DPI metadata│  │ • Mesh grid   │  │ • Fabric tex   │
           │ • PNG lossless│  │ • JPEG 85%    │  │ • JPEG 85%     │
           │ • Full quality│  │ • Web-opt     │  │ • Web-opt      │
           └───────┬───────┘  └───────┬───────┘  └───────┬───────┘
                   │                  │                  │
                   ▼                  ▼                  ▼
           ┌───────────────┐  ┌───────────────┐  ┌───────────────┐
           │ Vercel Blob   │  │ Data URL or   │  │ Data URL or   │
           │ (permanent)   │  │ Vercel Blob   │  │ Vercel Blob   │
           └───────────────┘  └───────────────┘  └───────────────┘
```

### Three Output Types Defined

| Output | Purpose | Resolution | Format | Overlay | Storage |
|--------|---------|------------|--------|---------|---------|
| **Manufacturer** | Print production | 300 DPI (configurable) | PNG, DPI metadata | None | Vercel Blob |
| **Canvas Preview** | UI: "What you'll receive" | 150 DPI (web) | JPEG 85% | Mesh grid | Data URL or Blob |
| **Stitched Preview** | UI: "Finished look" | 150 DPI (web) | JPEG 85% | Fabric texture | Data URL or Blob |

---

## Module Architecture

### File Structure

```
src/
├── lib/
│   └── images/
│       ├── index.ts                    # Public exports
│       ├── types.ts                    # Shared types
│       ├── config.ts                   # DPI/quality configuration
│       ├── upscale.ts                  # Nearest-neighbor upscaling
│       ├── manufacturer-output.ts      # Manufacturer image generation
│       ├── canvas-preview.ts           # Canvas preview with mesh grid
│       ├── stitched-preview.ts         # Stitched preview with texture
│       └── pipeline.ts                 # Orchestrates all 3 outputs
│
├── assets/
│   └── textures/
│       ├── mesh-grid-tile.png          # Tileable mesh pattern
│       └── fabric-texture-tile.png     # Tileable fabric/thread texture
│
└── actions/
    └── generateCanvas.ts               # Updated to use new pipeline
```

### Module Breakdown

#### `types.ts` — Shared Types

```typescript
export interface ImageDimensions {
  widthInches: number;
  heightInches: number;
  meshCount: number;
  widthStitches: number;
  heightStitches: number;
}

export interface OutputConfig {
  dpi: number;
  format: 'png' | 'jpeg';
  quality?: number;  // JPEG quality (1-100)
}

export interface GeneratedImages {
  /** High-res manufacturer image (PNG with DPI) */
  manufacturer: {
    buffer: Buffer;
    url?: string;
    width: number;
    height: number;
    dpi: number;
  };
  /** Canvas preview with mesh grid overlay */
  canvasPreview: {
    buffer: Buffer;
    dataUrl?: string;
    url?: string;
    width: number;
    height: number;
  };
  /** Stitched preview with fabric texture */
  stitchedPreview: {
    buffer: Buffer;
    dataUrl?: string;
    url?: string;
    width: number;
    height: number;
  };
}

export interface PipelineInput {
  stitchMapBuffer: Buffer;
  dimensions: ImageDimensions;
  config?: Partial<PipelineConfig>;
}

export interface PipelineConfig {
  manufacturer: OutputConfig;
  preview: OutputConfig;
  meshGrid: MeshGridConfig;
  fabricTexture: FabricTextureConfig;
}
```

#### `config.ts` — Configuration Schema

```typescript
export interface MeshGridConfig {
  /** Grid line width relative to cell size (0-1) */
  lineWidthRatio: number;
  /** Grid line color (RGBA) */
  lineColor: { r: number; g: number; b: number; a: number };
  /** Add 3D highlight effect at intersections */
  highlight3D: boolean;
  /** Highlight opacity (0-1) */
  highlightOpacity: number;
}

export interface FabricTextureConfig {
  /** Texture blend opacity (0-1) */
  opacity: number;
  /** Blend mode for texture overlay */
  blendMode: 'multiply' | 'overlay' | 'soft-light';
}

export const DEFAULT_CONFIG: PipelineConfig = {
  manufacturer: {
    dpi: 300,
    format: 'png',
  },
  preview: {
    dpi: 150,
    format: 'jpeg',
    quality: 85,
  },
  meshGrid: {
    lineWidthRatio: 0.08,
    lineColor: { r: 255, g: 255, b: 255, a: 77 }, // ~30% white
    highlight3D: true,
    highlightOpacity: 0.15,
  },
  fabricTexture: {
    opacity: 0.12,
    blendMode: 'multiply',
  },
};

// Environment variable overrides
export function getConfig(): PipelineConfig {
  return {
    ...DEFAULT_CONFIG,
    manufacturer: {
      ...DEFAULT_CONFIG.manufacturer,
      dpi: parseInt(process.env.MANUFACTURER_DPI || '300', 10),
    },
    preview: {
      ...DEFAULT_CONFIG.preview,
      dpi: parseInt(process.env.PREVIEW_DPI || '150', 10),
    },
  };
}
```

#### `upscale.ts` — Nearest-Neighbor Upscaling

```typescript
import sharp from 'sharp';

export interface UpscaleOptions {
  targetDpi: number;
  widthInches: number;
  heightInches: number;
  embedDpi?: boolean;
}

/**
 * Upscales a stitch-mapped image using nearest-neighbor interpolation.
 * Each source pixel (1 stitch) becomes a crisp square block.
 * 
 * CRITICAL: Uses nearest-neighbor to preserve stitch boundaries.
 * Never use bilinear/lanczos — they blur stitch edges.
 */
export async function upscaleNearestNeighbor(
  stitchMapBuffer: Buffer,
  options: UpscaleOptions
): Promise<Buffer> {
  const { targetDpi, widthInches, heightInches, embedDpi = true } = options;

  const targetWidth = Math.round(widthInches * targetDpi);
  const targetHeight = Math.round(heightInches * targetDpi);

  let pipeline = sharp(stitchMapBuffer).resize(targetWidth, targetHeight, {
    kernel: sharp.kernel.nearest,
    fit: 'fill',
  });

  if (embedDpi) {
    pipeline = pipeline.withMetadata({ density: targetDpi });
  }

  return pipeline.png().toBuffer();
}

/**
 * Calculates the scale factor between stitch map and output.
 */
export function calculateScaleFactor(
  meshCount: number,
  targetDpi: number
): number {
  return targetDpi / meshCount;
}
```

#### `manufacturer-output.ts` — Manufacturer Image Generation

```typescript
import sharp from 'sharp';
import { upscaleNearestNeighbor } from './upscale';
import { getConfig } from './config';
import type { ImageDimensions, OutputConfig } from './types';

export interface ManufacturerOutputResult {
  buffer: Buffer;
  width: number;
  height: number;
  dpi: number;
  format: 'png' | 'jpeg';
}

/**
 * Generates the manufacturer-ready image.
 * 
 * - Nearest-neighbor upscale to target DPI
 * - PNG with embedded DPI metadata
 * - No overlays or modifications
 * - Full quality for print production
 */
export async function generateManufacturerImage(
  stitchMapBuffer: Buffer,
  dimensions: ImageDimensions,
  config?: Partial<OutputConfig>
): Promise<ManufacturerOutputResult> {
  const { manufacturer } = getConfig();
  const mergedConfig = { ...manufacturer, ...config };
  const { dpi, format } = mergedConfig;

  const targetWidth = Math.round(dimensions.widthInches * dpi);
  const targetHeight = Math.round(dimensions.heightInches * dpi);

  let pipeline = sharp(stitchMapBuffer)
    .resize(targetWidth, targetHeight, {
      kernel: sharp.kernel.nearest,
      fit: 'fill',
    })
    .withMetadata({ density: dpi });

  const buffer = format === 'jpeg'
    ? await pipeline.jpeg({ quality: 95, chromaSubsampling: '4:4:4' }).toBuffer()
    : await pipeline.png().toBuffer();

  return {
    buffer,
    width: targetWidth,
    height: targetHeight,
    dpi,
    format,
  };
}
```

#### `canvas-preview.ts` — Canvas Preview with Mesh Grid

```typescript
import sharp from 'sharp';
import { getConfig } from './config';
import type { ImageDimensions, MeshGridConfig } from './types';

export interface CanvasPreviewResult {
  buffer: Buffer;
  width: number;
  height: number;
}

/**
 * Generates a mesh grid overlay as a raw RGBA buffer.
 * Creates a tileable grid pattern with optional 3D highlight effect.
 */
async function generateMeshGridOverlay(
  width: number,
  height: number,
  cellSize: number,
  config: MeshGridConfig
): Promise<Buffer> {
  const { lineWidthRatio, lineColor, highlight3D, highlightOpacity } = config;
  const lineWidth = Math.max(1, Math.round(cellSize * lineWidthRatio));

  // Create RGBA buffer
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
 * - Applies mesh grid overlay (semi-transparent)
 * - JPEG output for web optimization
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
  const cellSize = Math.round(dpi / dimensions.meshCount);

  // 1. Upscale stitch map
  const upscaled = await sharp(stitchMapBuffer)
    .resize(targetWidth, targetHeight, {
      kernel: sharp.kernel.nearest,
      fit: 'fill',
    })
    .ensureAlpha()
    .raw()
    .toBuffer();

  // 2. Generate mesh grid overlay
  const gridOverlay = await generateMeshGridOverlay(
    targetWidth,
    targetHeight,
    cellSize,
    meshConfig
  );

  // 3. Composite grid onto upscaled image
  const gridPng = await sharp(gridOverlay, {
    raw: { width: targetWidth, height: targetHeight, channels: 4 },
  })
    .png()
    .toBuffer();

  const composited = await sharp(stitchMapBuffer)
    .resize(targetWidth, targetHeight, {
      kernel: sharp.kernel.nearest,
      fit: 'fill',
    })
    .composite([{ input: gridPng, blend: 'over' }])
    .jpeg({ quality })
    .toBuffer();

  return {
    buffer: composited,
    width: targetWidth,
    height: targetHeight,
  };
}
```

#### `stitched-preview.ts` — Stitched Preview with Fabric Texture

```typescript
import sharp from 'sharp';
import path from 'path';
import { getConfig } from './config';
import type { ImageDimensions, FabricTextureConfig } from './types';

export interface StitchedPreviewResult {
  buffer: Buffer;
  width: number;
  height: number;
}

// Texture asset path (loaded once, cached)
const TEXTURE_PATH = path.join(process.cwd(), 'src/assets/textures/fabric-texture-tile.png');

/**
 * Generates the stitched preview with fabric texture overlay.
 * 
 * - Nearest-neighbor upscale to preview DPI
 * - Applies subtle fabric/thread texture
 * - No grid lines (shows "finished" appearance)
 * - JPEG output for web optimization
 */
export async function generateStitchedPreview(
  stitchMapBuffer: Buffer,
  dimensions: ImageDimensions,
  configOverride?: Partial<FabricTextureConfig>
): Promise<StitchedPreviewResult> {
  const config = getConfig();
  const { dpi, quality } = config.preview;
  const textureConfig = { ...config.fabricTexture, ...configOverride };

  const targetWidth = Math.round(dimensions.widthInches * dpi);
  const targetHeight = Math.round(dimensions.heightInches * dpi);

  // 1. Upscale stitch map
  const upscaled = await sharp(stitchMapBuffer)
    .resize(targetWidth, targetHeight, {
      kernel: sharp.kernel.nearest,
      fit: 'fill',
    });

  // 2. Load and tile fabric texture
  let textureBuffer: Buffer;
  try {
    // Create tiled texture at target size
    const texture = await sharp(TEXTURE_PATH).metadata();
    if (texture.width && texture.height) {
      textureBuffer = await sharp({
        create: {
          width: targetWidth,
          height: targetHeight,
          channels: 4,
          background: { r: 128, g: 128, b: 128, alpha: 0 },
        },
      })
        .composite([
          {
            input: TEXTURE_PATH,
            tile: true,
            blend: 'over',
          },
        ])
        .png()
        .toBuffer();
    } else {
      // Fallback: no texture
      textureBuffer = Buffer.alloc(0);
    }
  } catch {
    // Texture file not found — skip texture overlay
    console.warn('Fabric texture not found, skipping overlay');
    textureBuffer = Buffer.alloc(0);
  }

  // 3. Composite texture onto upscaled image (if available)
  let result = upscaled;
  if (textureBuffer.length > 0) {
    // Adjust texture opacity
    const adjustedTexture = await sharp(textureBuffer)
      .modulate({ brightness: 1 })
      .linear(textureConfig.opacity, 0) // Reduce alpha
      .toBuffer();

    result = sharp(await upscaled.png().toBuffer()).composite([
      { input: adjustedTexture, blend: textureConfig.blendMode as 'multiply' | 'overlay' },
    ]);
  }

  const buffer = await result.jpeg({ quality }).toBuffer();

  return {
    buffer,
    width: targetWidth,
    height: targetHeight,
  };
}
```

#### `pipeline.ts` — Orchestrator

```typescript
import { generateManufacturerImage } from './manufacturer-output';
import { generateCanvasPreview } from './canvas-preview';
import { generateStitchedPreview } from './stitched-preview';
import { getConfig } from './config';
import type { PipelineInput, GeneratedImages, PipelineConfig } from './types';

export interface PipelineOptions {
  /** Generate all 3 images (default: true) */
  generateAll?: boolean;
  /** Skip manufacturer image */
  skipManufacturer?: boolean;
  /** Skip canvas preview */
  skipCanvasPreview?: boolean;
  /** Skip stitched preview */
  skipStitchedPreview?: boolean;
  /** Convert previews to data URLs */
  previewsAsDataUrls?: boolean;
}

/**
 * Orchestrates generation of all 3 image types from a stitch-mapped source.
 * 
 * Runs manufacturer and preview generations in parallel for performance.
 * All outputs maintain stitch precision via nearest-neighbor interpolation.
 */
export async function generateAllImages(
  input: PipelineInput,
  options: PipelineOptions = {}
): Promise<GeneratedImages> {
  const {
    skipManufacturer = false,
    skipCanvasPreview = false,
    skipStitchedPreview = false,
    previewsAsDataUrls = true,
  } = options;

  const { stitchMapBuffer, dimensions, config: configOverride } = input;
  const config = { ...getConfig(), ...configOverride };

  // Run generations in parallel for performance
  const [manufacturer, canvasPreview, stitchedPreview] = await Promise.all([
    skipManufacturer
      ? Promise.resolve(null)
      : generateManufacturerImage(stitchMapBuffer, dimensions, config.manufacturer),

    skipCanvasPreview
      ? Promise.resolve(null)
      : generateCanvasPreview(stitchMapBuffer, dimensions, config.meshGrid),

    skipStitchedPreview
      ? Promise.resolve(null)
      : generateStitchedPreview(stitchMapBuffer, dimensions, config.fabricTexture),
  ]);

  // Build result object
  const result: GeneratedImages = {
    manufacturer: manufacturer
      ? {
          buffer: manufacturer.buffer,
          width: manufacturer.width,
          height: manufacturer.height,
          dpi: manufacturer.dpi,
        }
      : { buffer: Buffer.alloc(0), width: 0, height: 0, dpi: 0 },

    canvasPreview: canvasPreview
      ? {
          buffer: canvasPreview.buffer,
          width: canvasPreview.width,
          height: canvasPreview.height,
          dataUrl: previewsAsDataUrls
            ? `data:image/jpeg;base64,${canvasPreview.buffer.toString('base64')}`
            : undefined,
        }
      : { buffer: Buffer.alloc(0), width: 0, height: 0 },

    stitchedPreview: stitchedPreview
      ? {
          buffer: stitchedPreview.buffer,
          width: stitchedPreview.width,
          height: stitchedPreview.height,
          dataUrl: previewsAsDataUrls
            ? `data:image/jpeg;base64,${stitchedPreview.buffer.toString('base64')}`
            : undefined,
        }
      : { buffer: Buffer.alloc(0), width: 0, height: 0 },
  };

  return result;
}
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        generateCanvasAction()                                │
│                                                                              │
│  Input: { sourceImages, cutouts, placedCutouts, canvasConfig }              │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      Composite Cutouts onto Canvas                           │
│                                                                              │
│  createBackgroundCanvas() + compositeCutout() → raw canvas Buffer           │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    processImageForManufacturing()                            │
│                                                                              │
│  Wu's quantization → DMC mapping → dither/flat → majority filter            │
│  Output: stitchMapBuffer (PNG, 1px = 1 stitch)                              │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        generateAllImages()                                   │
│                                                                              │
│  Input: { stitchMapBuffer, dimensions }                                     │
│                                                                              │
│  ┌────────────────────┐ ┌────────────────────┐ ┌────────────────────┐       │
│  │generateManufacturer│ │generateCanvasPreview│ │generateStitchedPre│       │
│  │      Image()       │ │        ()          │ │      view()       │        │
│  │                    │ │                    │ │                    │        │
│  │ • NN upscale 300DPI│ │ • NN upscale 150DPI│ │ • NN upscale 150DPI│       │
│  │ • DPI metadata     │ │ • Mesh grid overlay│ │ • Fabric texture   │       │
│  │ • PNG lossless     │ │ • JPEG 85%         │ │ • JPEG 85%         │       │
│  └─────────┬──────────┘ └─────────┬──────────┘ └─────────┬──────────┘       │
│            │                      │                      │                   │
│            ▼                      ▼                      ▼                   │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │                      GeneratedImages                                │     │
│  │  {                                                                  │     │
│  │    manufacturer: { buffer, url, width, height, dpi }               │     │
│  │    canvasPreview: { buffer, dataUrl, width, height }               │     │
│  │    stitchedPreview: { buffer, dataUrl, width, height }             │     │
│  │  }                                                                  │     │
│  └────────────────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Storage Layer                                     │
│                                                                              │
│  Manufacturer Image → Vercel Blob (permanent, public URL)                   │
│  Canvas Preview → Data URL (inline) or Vercel Blob                          │
│  Stitched Preview → Data URL (inline) or Vercel Blob                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Configuration Schema

### Environment Variables

```bash
# DPI Settings
MANUFACTURER_DPI=300      # Default: 300 (high-quality print)
PREVIEW_DPI=150           # Default: 150 (web-optimized)

# Quality Settings
PREVIEW_JPEG_QUALITY=85   # Default: 85 (good balance of quality/size)

# Feature Flags (optional)
GENERATE_CANVAS_PREVIEW=true
GENERATE_STITCHED_PREVIEW=true
```

### App Configuration (`src/config/image-pipeline.config.ts`)

```typescript
export const IMAGE_PIPELINE_CONFIG = {
  manufacturer: {
    dpi: parseInt(process.env.MANUFACTURER_DPI || '300', 10),
    format: 'png' as const,
    embedDpiMetadata: true,
  },
  preview: {
    dpi: parseInt(process.env.PREVIEW_DPI || '150', 10),
    format: 'jpeg' as const,
    quality: parseInt(process.env.PREVIEW_JPEG_QUALITY || '85', 10),
  },
  meshGrid: {
    lineWidthRatio: 0.08,
    lineColor: { r: 255, g: 255, b: 255, a: 77 },
    highlight3D: true,
    highlightOpacity: 0.15,
  },
  fabricTexture: {
    opacity: 0.12,
    blendMode: 'multiply' as const,
  },
  storage: {
    manufacturerToBlobStorage: true,
    previewsAsDataUrls: true,  // Toggle for Blob storage if previews are large
  },
};
```

---

## Storage Strategy

### Decision Matrix

| Image Type | Size Estimate | Access Pattern | Recommended Storage |
|------------|---------------|----------------|---------------------|
| Manufacturer | 12-25 MB (PNG) | Download once, send to printer | Vercel Blob (permanent) |
| Canvas Preview | 100-500 KB (JPEG) | Frequent UI display | Data URL (inline) |
| Stitched Preview | 100-500 KB (JPEG) | Frequent UI display | Data URL (inline) |

### Rationale

1. **Manufacturer Image → Vercel Blob**
   - Large file size (12-25 MB at 300 DPI)
   - Needs permanent storage for re-download
   - Must be accessible for manufacturer delivery

2. **Preview Images → Data URLs (default)**
   - Small file size (~100-500 KB compressed JPEG)
   - Only needed during active editing session
   - Eliminates round-trip to storage
   - Can switch to Blob if previews exceed ~1 MB

### Implementation

```typescript
// In generateCanvasAction:

const images = await generateAllImages({
  stitchMapBuffer: result.manufacturerImageBuffer,
  dimensions: {
    widthInches: canvasConfig.widthInches,
    heightInches: canvasConfig.heightInches,
    meshCount: canvasConfig.meshCount,
    widthStitches,
    heightStitches,
  },
});

// Store manufacturer to Blob
const manufacturerBlob = await put(
  `canvases/${userId}/${canvasId}-manufacturer.png`,
  images.manufacturer.buffer,
  { access: 'public', contentType: 'image/png' }
);

// Previews returned as data URLs (no storage needed)
return {
  manufacturerImageUrl: manufacturerBlob.url,
  canvasPreviewUrl: images.canvasPreview.dataUrl,
  stitchedPreviewUrl: images.stitchedPreview.dataUrl,
};
```

---

## Texture Assets

### Location

```
src/assets/textures/
├── mesh-grid-tile.png         # 64×64 tileable mesh pattern
└── fabric-texture-tile.png    # 128×128 tileable fabric weave
```

### Mesh Grid Tile Spec

- **Size:** 64×64 pixels (tileable)
- **Format:** PNG with alpha
- **Content:** Simple grid pattern with slight 3D shading
- **Usage:** Tiled at stitch cell boundaries

### Fabric Texture Tile Spec

- **Size:** 128×128 pixels (tileable)
- **Format:** PNG with alpha
- **Content:** Subtle canvas weave pattern
- **Usage:** Tiled across entire preview, blended at low opacity

### Fallback Behavior

If texture files are missing:
1. **Mesh grid:** Generate procedurally (current implementation)
2. **Fabric texture:** Skip overlay (output without texture)

---

## API Signatures

### Updated `generateCanvasAction` Return Type

```typescript
export interface GenerateCanvasResult {
  success: boolean;
  error?: string;
  
  // Canvas metadata
  canvasId?: string | null;
  dimensions?: { width: number; height: number };
  
  // Thread info
  threads?: Thread[];
  stitchabilityScore?: number;
  
  // Image URLs
  manufacturerImageUrl?: string;    // Blob URL (high-res PNG)
  canvasPreviewUrl?: string;        // Data URL or Blob URL (JPEG)
  stitchedPreviewUrl?: string;      // Data URL or Blob URL (JPEG)
}
```

### Pipeline Function Signatures

```typescript
// Main orchestrator
export async function generateAllImages(
  input: PipelineInput,
  options?: PipelineOptions
): Promise<GeneratedImages>;

// Individual generators
export async function generateManufacturerImage(
  stitchMapBuffer: Buffer,
  dimensions: ImageDimensions,
  config?: Partial<OutputConfig>
): Promise<ManufacturerOutputResult>;

export async function generateCanvasPreview(
  stitchMapBuffer: Buffer,
  dimensions: ImageDimensions,
  config?: Partial<MeshGridConfig>
): Promise<CanvasPreviewResult>;

export async function generateStitchedPreview(
  stitchMapBuffer: Buffer,
  dimensions: ImageDimensions,
  config?: Partial<FabricTextureConfig>
): Promise<StitchedPreviewResult>;
```

---

## Performance Considerations

### Parallel Processing

All three image types are generated in parallel:

```typescript
const [manufacturer, canvasPreview, stitchedPreview] = await Promise.all([
  generateManufacturerImage(...),
  generateCanvasPreview(...),
  generateStitchedPreview(...),
]);
```

### Memory Optimization

| Concern | Mitigation |
|---------|------------|
| Large manufacturer images (25+ MB) | Stream to Blob storage, don't hold in memory |
| Preview data URLs | ~500 KB each, acceptable for inline response |
| Stitch map buffer | Shared reference, not duplicated |

### Lazy Generation (Future)

For additional optimization, previews could be generated on-demand via API route:

```
GET /api/preview/canvas/:canvasId   → Generate + return canvas preview
GET /api/preview/stitched/:canvasId → Generate + return stitched preview
```

This defers work until user actually views the preview.

---

## Implementation Order

### Phase 1: Core Pipeline (MVP)
1. ✅ Create `src/lib/images/` directory structure
2. ✅ Implement `types.ts` and `config.ts`
3. ✅ Implement `upscale.ts` (shared upscaling logic)
4. ✅ Implement `manufacturer-output.ts` (DPI upscaling + metadata)
5. ✅ Update `generateCanvasAction` to use new manufacturer output

### Phase 2: Previews
6. Implement `canvas-preview.ts` (mesh grid overlay)
7. Implement `stitched-preview.ts` (fabric texture)
8. Implement `pipeline.ts` (orchestrator)
9. Update `generateCanvasAction` to return all 3 URLs
10. Update frontend to display both previews

### Phase 3: Assets & Polish
11. Create/source mesh grid texture asset
12. Create/source fabric texture asset
13. Add texture fallback handling
14. Add preview toggle in settings
15. Add DPI configuration UI (for advanced users)

### Phase 4: Optimization (Post-MVP)
16. Evaluate lazy preview generation
17. Add preview caching (if needed)
18. Profile memory usage for large canvases
19. Consider WebP format for previews

---

## Testing Strategy

### Unit Tests

```typescript
describe('upscaleNearestNeighbor', () => {
  it('scales 1px to correct DPI-based dimensions');
  it('uses nearest-neighbor (no interpolation blur)');
  it('embeds DPI metadata when requested');
});

describe('generateMeshGridOverlay', () => {
  it('creates grid lines at correct cell intervals');
  it('respects lineWidthRatio configuration');
  it('applies 3D highlight when enabled');
});

describe('generateCanvasPreview', () => {
  it('composites mesh grid over upscaled image');
  it('outputs JPEG at configured quality');
});
```

### Integration Tests

```typescript
describe('generateAllImages', () => {
  it('generates all 3 images from stitch map');
  it('runs generations in parallel');
  it('respects skip options');
  it('returns data URLs for previews');
});
```

### Visual Regression

- Compare generated mesh grid against reference image
- Compare fabric texture blend against reference
- Verify stitch boundaries remain sharp (no blur)

---

---

## Frontend Implementation (Phase 4)

### Preview Display Component

Based on UX research (`PREVIEW-UX-RESEARCH.md`), the frontend should display **Canvas Preview** and **Stitched Preview** using a segmented toggle + swipe pattern.

**Note:** Manufacturer image is NOT shown to users — it's only used for production/download.

### Component Structure

```
src/components/editor/
├── PreviewStep.tsx          # Update to use new preview display
├── PreviewToggle.tsx        # NEW: Segmented toggle component
└── PreviewImage.tsx         # NEW: Swipeable image container
```

### UI Design

```
┌─────────────────────────────────────┐
│  ┌───────────────────────────────┐  │
│  │  Your Canvas │ When Stitched ●│  │  ← Segmented toggle
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │                               │  │
│  │      [PREVIEW IMAGE]          │  │  ← Full-width, swipeable
│  │                               │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

### Behavior

| Setting | Value |
|---------|-------|
| **Default view** | "When Stitched" (aspirational) |
| **Toggle labels** | "Your Canvas" / "When Stitched" |
| **Interactions** | Tap toggle OR swipe image |
| **Animation** | 300ms crossfade between views |
| **Persistence** | Remember last view in localStorage |

### Data Flow

```typescript
// PreviewStep receives from generateCanvasAction:
interface GenerateCanvasResult {
  // ... existing fields
  canvasPreviewUrl?: string;    // Data URL with mesh grid
  stitchedPreviewUrl?: string;  // Data URL, clean
}

// PreviewStep state:
const [activeView, setActiveView] = useState<'canvas' | 'stitched'>('stitched');
const previewUrl = activeView === 'canvas' 
  ? result.canvasPreviewUrl 
  : result.stitchedPreviewUrl;
```

### Implementation Checklist

- [ ] Create `PreviewToggle.tsx` — segmented control component
- [ ] Create `PreviewImage.tsx` — swipeable image with crossfade
- [ ] Update `PreviewStep.tsx` — integrate toggle and both preview URLs
- [ ] Add swipe gesture support (use `react-swipeable` or native touch events)
- [ ] Add localStorage persistence for view preference
- [ ] Ensure accessibility (keyboard nav, aria labels)
- [ ] Test on mobile devices

---

## Summary

This architecture provides:

1. **Clean separation** — Each image type has its own generator
2. **Shared foundation** — All start from the same stitch-mapped source
3. **Stitch precision** — Nearest-neighbor interpolation throughout
4. **Configurability** — DPI/quality via env vars or config
5. **Performance** — Parallel generation, smart storage choices
6. **Extensibility** — Easy to add new preview types or overlays

The implementation order prioritizes getting the manufacturer image correct first (Phase 1), then adding previews (Phase 2), and finally polishing with proper assets (Phase 3).
