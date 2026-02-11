# NeedlePaint Image Types Research

## Executive Summary

NeedlePaint generates **three distinct image types** for their needlepoint products:

1. **Canvas Preview** — Shows the design printed on mesh canvas with visible grid
2. **Stitched Preview** — Shows what the finished stitched result will look like
3. **Manufacturer/Print Image** — High-res continuous image sent to printer (StitchPerfect™)

Their URL naming convention follows this pattern:
- Canvas: `{product}-kit-{id}-lg.jpg`
- Stitched Preview: `{product}-kit-{id}-stitched-preview-lg.jpg`
- Finished Product: `{product}-{id}-lg.jpg`

---

## 1. Manufacturer Image (Print Image)

### Purpose
High-resolution continuous image sent directly to their industrial printer. This is what gets physically printed onto the needlepoint canvas mesh.

### NeedlePaint's Approach: StitchPerfect™ Technology
From their website:

> "Quality needlepoint canvases are inherently irregular, making it challenging to align printed colors perfectly with the stitch grid. **StitchPerfect™ solves this problem**, delivering unmatched accuracy so that every color appears exactly where it belongs — even on larger projects like belts and Christmas stockings."

### Key Characteristics
- Pixel-perfect alignment with stitch grid
- Colors precisely positioned to match mesh intersections
- High resolution for professional printing (likely 300+ DPI)
- Uses nearest-neighbor interpolation to maintain sharp pixel edges

### Our Implementation (Already Spec'd)
- 300 DPI output
- Nearest-neighbor upscaling from low-res stitch grid
- Each "stitch pixel" expands to fill the physical stitch area

---

## 2. Canvas Preview

### Purpose
Shows the customer what the **printed canvas will look like** before they stitch it — the physical product they'll receive in a kit.

### Visual Analysis

**Example URL:** `https://needlepaint-canvas-images-dev.s3.amazonaws.com/kits/winter-usa-needlepoint-ornament-kit-4438-lg.jpg`

#### Key Visual Characteristics
1. **Visible mesh grid** — 3D-looking mesh pattern overlays the design
2. **Grid shows through colors** — The mesh texture is visible even in colored areas
3. **Pixelated/blocky design** — Each color block represents one stitch
4. **Canvas margin** — White/cream mesh visible around the design
5. **Realistic canvas texture** — Simulates the physical mesh material

### Technical Analysis: How to Generate

The canvas preview appears to be created by:

```
1. Start with the pixelated stitch-grid design
2. Upscale using nearest-neighbor interpolation
3. Apply a mesh grid overlay texture
```

#### Mesh Grid Overlay Technique

The mesh effect appears to be a **semi-transparent texture overlay** with:
- **Grid lines** at regular intervals matching the stitch count
- **Slightly raised/3D appearance** suggesting the threads
- **Color modulation** — colored areas are slightly muted/textured by the mesh

**Proposed Algorithm:**
```typescript
function generateCanvasPreview(
  stitchGrid: ImageData,
  meshCount: number,
  targetDPI: number
): ImageData {
  // 1. Calculate upscale factor based on DPI and mesh count
  const pixelsPerStitch = targetDPI / meshCount;
  
  // 2. Upscale stitch grid using nearest-neighbor
  const upscaled = nearestNeighborUpscale(stitchGrid, pixelsPerStitch);
  
  // 3. Generate mesh grid overlay
  const meshOverlay = generateMeshOverlay(
    upscaled.width,
    upscaled.height,
    pixelsPerStitch
  );
  
  // 4. Composite: blend mesh overlay onto upscaled image
  return compositeWithOverlay(upscaled, meshOverlay, 0.3); // ~30% opacity
}

function generateMeshOverlay(
  width: number, 
  height: number, 
  cellSize: number
): ImageData {
  // Create semi-transparent grid pattern
  // Each cell has slight shadow/highlight at edges
  // to create 3D mesh appearance
}
```

#### Mesh Overlay Characteristics
- **Grid line color:** Light gray/white, semi-transparent
- **Grid line width:** ~1-2 pixels at high res
- **3D effect:** Subtle highlight on top/left edges, shadow on bottom/right
- **Blend mode:** Likely multiply or overlay for natural integration

---

## 3. Stitched Preview

### Purpose
Shows the customer what the **finished needlepoint will look like** after stitching — the "dream result" to inspire them.

### Visual Analysis

**Example URL:** `https://needlepaint-canvas-images-dev.s3.amazonaws.com/kits/winter-usa-needlepoint-ornament-kit-4438-stitched-preview-lg.jpg`

#### Key Visual Characteristics
1. **NO visible mesh grid** — stitches appear solid/filled
2. **Subtle fabric/thread texture** — slight canvas texture visible
3. **Cream/off-white background** — unstitched canvas areas
4. **Softer appearance** — colors appear more saturated without grid interruption
5. **Filled look** — each stitch appears as a solid color block

### Technical Analysis: How to Generate

The stitched preview appears to be created by:

```
1. Start with the pixelated stitch-grid design
2. Upscale using nearest-neighbor interpolation
3. Apply subtle canvas/fabric texture (NOT mesh grid)
4. Optional: slight thread texture within colored areas
```

#### Fabric Texture Technique

**Proposed Algorithm:**
```typescript
function generateStitchedPreview(
  stitchGrid: ImageData,
  meshCount: number,
  targetDPI: number
): ImageData {
  // 1. Upscale stitch grid
  const pixelsPerStitch = targetDPI / meshCount;
  const upscaled = nearestNeighborUpscale(stitchGrid, pixelsPerStitch);
  
  // 2. Generate subtle canvas texture overlay
  const canvasTexture = generateCanvasTexture(
    upscaled.width,
    upscaled.height
  );
  
  // 3. Composite with light texture
  return compositeWithTexture(upscaled, canvasTexture, 0.1); // ~10% opacity
}

function generateCanvasTexture(width: number, height: number): ImageData {
  // Create subtle fabric weave pattern
  // Very fine, high-frequency texture
  // Much less pronounced than mesh grid
}
```

#### Texture Characteristics
- **Texture type:** Fine canvas weave (not mesh grid)
- **Intensity:** Very subtle (~5-15% opacity)
- **Pattern:** Regular but fine-grained
- **Color:** Neutral/cream for background areas

---

## 4. Finished Product Image

### Purpose
For products that are sold as **finished items** (not kits), shows the final stitched and finished product with all hardware/finishing.

### Visual Analysis

**Example URL:** `https://needlepaint-canvas-images-dev.s3.amazonaws.com/kits/winter-usa-needlepoint-ornament-4438-lg.jpg`

#### Key Visual Characteristics
1. **Completed product** — includes trim, backing, hardware
2. **Professional photography** or realistic rendering
3. **Context** — shows how product looks in use (ornament with loop, belt with buckle)
4. **Marketing quality** — polished presentation

### Technical Notes
This is typically a **photograph or realistic composite** rather than a generated image. For our app, we may:
- Show mockup templates with stitched preview composited in
- Use product templates for belts, pillows, etc.

---

## Pixel Manipulation Pipeline

### Overview

```
┌──────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Original   │     │   Stitch Grid   │     │  Output Images  │
│    Photo     │────▶│   (Pixelated)   │────▶│                 │
└──────────────┘     └─────────────────┘     │  • Manufacturer │
                              │              │  • Canvas       │
                              │              │  • Stitched     │
                              ▼              └─────────────────┘
                     ┌─────────────────┐
                     │  Color Palette  │
                     │    (6-20 DMC)   │
                     └─────────────────┘
```

### Stage 1: Source to Stitch Grid

1. **Resize** source image to exact stitch dimensions (e.g., 78×78 stitches for 4.33" at 18 count)
2. **Quantize colors** to DMC palette
3. **Output:** Low-resolution stitch grid (1 pixel = 1 stitch)

### Stage 2: Generate Output Images

From the same stitch grid, generate all three preview types:

```typescript
// Shared stitch grid
const stitchGrid = convertToStitchGrid(sourceImage, colorPalette, dimensions);

// Generate all three outputs
const manufacturerImage = generatePrintImage(stitchGrid, { dpi: 300 });
const canvasPreview = generateCanvasPreview(stitchGrid, { mesh: true });
const stitchedPreview = generateStitchedPreview(stitchGrid, { texture: 'fabric' });
```

### Stage 3: Stitch Precision Maintenance

**Critical:** All three images must maintain **pixel-perfect stitch alignment**.

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│ Stitch Grid │      │ Stitch Grid │      │ Stitch Grid │
│   @ 1x      │      │   @ 1x      │      │   @ 1x      │
└──────┬──────┘      └──────┬──────┘      └──────┬──────┘
       │                    │                    │
       ▼                    ▼                    ▼
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│  Upscale    │      │  Upscale    │      │  Upscale    │
│  Nearest    │      │  Nearest    │      │  Nearest    │
│  Neighbor   │      │  Neighbor   │      │  Neighbor   │
└──────┬──────┘      └──────┬──────┘      └──────┬──────┘
       │                    │                    │
       ▼                    ▼                    ▼
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│  (No Post)  │      │ + Mesh Grid │      │ + Fabric    │
│  Raw Print  │      │   Overlay   │      │   Texture   │
└─────────────┘      └─────────────┘      └─────────────┘
   Manufacturer         Canvas            Stitched
     Image              Preview           Preview
```

---

## Implementation Recommendations

### 1. Mesh Grid Overlay (Canvas Preview)

```typescript
interface MeshGridOptions {
  cellSize: number;        // Pixels per stitch
  lineWidth: number;       // Grid line width in pixels
  lineColor: string;       // Grid line color (semi-transparent white)
  opacity: number;         // Overall overlay opacity (0.2-0.4)
  shadow: boolean;         // Add 3D shadow effect
}

function createMeshGridOverlay(
  width: number, 
  height: number, 
  options: MeshGridOptions
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  
  // Draw vertical lines
  for (let x = 0; x <= width; x += options.cellSize) {
    ctx.strokeStyle = options.lineColor;
    ctx.lineWidth = options.lineWidth;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  
  // Draw horizontal lines
  for (let y = 0; y <= height; y += options.cellSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  
  // Optional: Add 3D effect (intersection highlights)
  if (options.shadow) {
    // Add subtle highlights at grid intersections
  }
  
  return canvas;
}
```

### 2. Fabric Texture (Stitched Preview)

```typescript
interface FabricTextureOptions {
  intensity: number;       // 0.05-0.15 recommended
  pattern: 'canvas' | 'linen' | 'none';
  color: string;           // Texture tint color
}

function applyFabricTexture(
  image: HTMLCanvasElement,
  options: FabricTextureOptions
): HTMLCanvasElement {
  // Option A: Use pre-made tileable texture image
  // Option B: Generate procedural noise pattern
  
  const ctx = image.getContext('2d')!;
  
  // Apply subtle texture overlay
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = options.intensity;
  
  // Fill with tiled texture pattern
  const pattern = ctx.createPattern(textureImage, 'repeat');
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, image.width, image.height);
  
  return image;
}
```

### 3. Unified Generation Pipeline

```typescript
interface PreviewGenerationOptions {
  stitchGrid: ImageData;
  meshCount: number;
  physicalSize: { width: number; height: number };  // inches
  outputDPI: number;
}

interface GeneratedPreviews {
  manufacturer: Blob;    // High-res print file
  canvas: Blob;          // Canvas preview with grid
  stitched: Blob;        // Stitched preview
}

async function generateAllPreviews(
  options: PreviewGenerationOptions
): Promise<GeneratedPreviews> {
  const { stitchGrid, meshCount, physicalSize, outputDPI } = options;
  
  // Calculate output dimensions
  const outputWidth = physicalSize.width * outputDPI;
  const outputHeight = physicalSize.height * outputDPI;
  const pixelsPerStitch = outputDPI / meshCount;
  
  // 1. Upscale stitch grid (shared step)
  const upscaled = nearestNeighborUpscale(
    stitchGrid, 
    pixelsPerStitch
  );
  
  // 2. Generate manufacturer image (no overlay)
  const manufacturer = await canvasToBlob(upscaled, 'image/png');
  
  // 3. Generate canvas preview (with mesh grid)
  const canvasPreview = applyMeshGridOverlay(upscaled, {
    cellSize: pixelsPerStitch,
    lineWidth: 1,
    lineColor: 'rgba(255, 255, 255, 0.3)',
    opacity: 0.3
  });
  const canvas = await canvasToBlob(canvasPreview, 'image/jpeg');
  
  // 4. Generate stitched preview (with fabric texture)
  const stitchedPreview = applyFabricTexture(upscaled.cloneNode(), {
    intensity: 0.1,
    pattern: 'canvas'
  });
  const stitched = await canvasToBlob(stitchedPreview, 'image/jpeg');
  
  return { manufacturer, canvas, stitched };
}
```

---

## URL/Naming Conventions (Following NeedlePaint)

```
Canvas Preview:     {slug}-kit-{id}-lg.jpg
Stitched Preview:   {slug}-kit-{id}-stitched-preview-lg.jpg
Finished Product:   {slug}-{id}-lg.jpg
Thumbnail:          {slug}-{id}.jpg (smaller size)
```

---

## Summary: Key Differences Between Preview Types

| Aspect | Canvas Preview | Stitched Preview |
|--------|---------------|------------------|
| **Grid Visible** | Yes (prominent) | No |
| **Texture** | Mesh grid pattern | Subtle fabric weave |
| **Colors** | Slightly muted by grid | Full saturation |
| **Purpose** | "What you'll receive" | "What it will look like" |
| **Background** | White mesh visible | Cream canvas visible |
| **Technical** | ~30% grid overlay | ~10% texture overlay |

---

## References

- NeedlePaint StitchPerfect™ page: https://www.needlepaint.com/needlepoint/stitch-perfect
- Example kit with all preview types: https://www.needlepaint.com/needlepoint-kits/winter-usa-needlepoint-ornament-kit-4438
- S3 image bucket: `needlepaint-canvas-images-dev.s3.amazonaws.com`
