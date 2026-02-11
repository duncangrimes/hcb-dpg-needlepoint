# Manufacturer Output Specification

**Status:** Specification  
**Last Updated:** 2026-02-10

---

## Overview

This document specifies the image output requirements for needlepoint canvas printing manufacturers. Our internal pipeline generates **stitch-mapped images** (1 pixel = 1 stitch), but manufacturers require **high-resolution continuous images** for their printing equipment.

### The Two-Stage Approach

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ INTERNAL PIPELINE (stitch-mapping)                                          │
│                                                                             │
│  User Photo → Quantization → Thread Mapping → Stitch-Mapped PNG            │
│                                                (130×182 pixels @ 13 mesh)  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ MANUFACTURER OUTPUT (upscaling)                                             │
│                                                                             │
│  Stitch-Mapped PNG → Nearest Neighbor Upscale → High-Res PNG/JPG           │
│  (130×182 px)         (~23x @ 300 DPI)          (3000×4200 px + DPI meta)  │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Why this approach?**
- **Stitch-mapped internally:** Each pixel represents exactly one stitch. This ensures perfect 1:1 alignment between our design and the physical mesh.
- **High-res for manufacturers:** Print equipment needs sufficient resolution for quality output. Nearest neighbor upscaling preserves the crisp stitch boundaries without blending/interpolation.

---

## DPI Requirements

### Industry Standards

| DPI | Quality Level | Use Case |
|-----|---------------|----------|
| 150 DPI | Minimum | Draft/proofing |
| 200 DPI | Good | Standard production |
| 300 DPI | Excellent | Premium quality (recommended) |
| 600 DPI | Maximum | Specialty/archival (rarely needed) |

### Recommended Default: 300 DPI

300 DPI is the de facto standard for textile printing and ensures:
- Sharp stitch boundaries at any viewing distance
- Maximum compatibility with professional print equipment
- No visible pixelation when printed on canvas

### Configuration Options

```typescript
export interface ManufacturerOutputConfig {
  /** Target DPI for output image (default: 300) */
  dpi: 150 | 200 | 300 | 600;
  
  /** Output format (default: PNG for lossless, JPG for smaller files) */
  format: 'png' | 'jpg';
  
  /** JPG quality if format is 'jpg' (default: 95) */
  jpgQuality?: number;
  
  /** Whether to embed DPI metadata (default: true) */
  embedDpiMetadata?: boolean;
}

// Default configuration
const DEFAULT_CONFIG: ManufacturerOutputConfig = {
  dpi: 300,
  format: 'png',
  embedDpiMetadata: true,
};
```

---

## File Format Requirements

### Primary Format: PNG

**Recommended for quality-critical delivery**

| Property | Requirement |
|----------|-------------|
| Format | PNG-24 (8-bit RGB) or PNG-32 (with alpha) |
| Color Space | sRGB IEC61966-2.1 |
| Compression | Maximum (lossless) |
| DPI Metadata | Embedded in pHYs chunk |

**Advantages:**
- Lossless compression preserves exact stitch colors
- Supports transparency (if needed for white backgrounds)
- Universal compatibility

### Alternative Format: JPEG

**Acceptable for file size optimization**

| Property | Requirement |
|----------|-------------|
| Format | JPEG |
| Quality | 95+ (to minimize compression artifacts) |
| Color Space | sRGB |
| DPI Metadata | Embedded in EXIF |
| Subsampling | 4:4:4 (no chroma subsampling) |

**Note:** JPEG compression can cause slight color shifts at stitch boundaries. Use PNG for color-critical work.

---

## Dimension Calculations

### Formula

```
Output Width (px)  = Canvas Width (in)  × Target DPI
Output Height (px) = Canvas Height (in) × Target DPI

Upscale Factor = Target DPI ÷ Mesh Count
```

### Example: 10" × 14" Canvas at 13 Mesh

| Parameter | Value |
|-----------|-------|
| **Canvas Size** | 10" × 14" |
| **Mesh Count** | 13 stitches/inch |
| **Stitch Dimensions** | 130 × 182 stitches |
| **Target DPI** | 300 |
| **Output Dimensions** | 3000 × 4200 pixels |
| **Upscale Factor** | 300 ÷ 13 ≈ 23.08× |
| **File Size (est.)** | ~12-25 MB (PNG), ~2-5 MB (JPG) |

### Reference Table: Common Canvas Sizes

| Canvas | Mesh | Stitch Grid | @ 200 DPI | @ 300 DPI | Scale Factor |
|--------|------|-------------|-----------|-----------|--------------|
| 8" × 8" | 13 | 104 × 104 | 1600 × 1600 | 2400 × 2400 | 15.4× / 23.1× |
| 10" × 10" | 13 | 130 × 130 | 2000 × 2000 | 3000 × 3000 | 15.4× / 23.1× |
| 10" × 14" | 13 | 130 × 182 | 2000 × 2800 | 3000 × 4200 | 15.4× / 23.1× |
| 12" × 12" | 13 | 156 × 156 | 2400 × 2400 | 3600 × 3600 | 15.4× / 23.1× |
| 14" × 14" | 13 | 182 × 182 | 2800 × 2800 | 4200 × 4200 | 15.4× / 23.1× |
| 16" × 20" | 13 | 208 × 260 | 3200 × 4000 | 4800 × 6000 | 15.4× / 23.1× |
| 8" × 8" | 18 | 144 × 144 | 1600 × 1600 | 2400 × 2400 | 11.1× / 16.7× |
| 10" × 10" | 18 | 180 × 180 | 2000 × 2000 | 3000 × 3000 | 11.1× / 16.7× |

---

## Implementation

### Sharp Code: Nearest Neighbor Upscale with DPI Metadata

```typescript
import sharp from 'sharp';

export interface UpscaleOptions {
  /** Target DPI (default: 300) */
  dpi?: number;
  /** Output format (default: 'png') */
  format?: 'png' | 'jpg';
  /** JPG quality if format is 'jpg' (default: 95) */
  jpgQuality?: number;
}

/**
 * Upscales a stitch-mapped image to manufacturer-ready resolution.
 * Uses nearest neighbor interpolation to preserve crisp stitch boundaries.
 * 
 * @param stitchMapBuffer - PNG buffer where 1 pixel = 1 stitch
 * @param widthInches - Canvas width in inches
 * @param heightInches - Canvas height in inches
 * @param options - Output configuration
 * @returns High-resolution image buffer with embedded DPI metadata
 */
export async function upscaleForManufacturer(
  stitchMapBuffer: Buffer,
  widthInches: number,
  heightInches: number,
  options: UpscaleOptions = {}
): Promise<Buffer> {
  const { dpi = 300, format = 'png', jpgQuality = 95 } = options;

  // Calculate target dimensions
  const targetWidth = Math.round(widthInches * dpi);
  const targetHeight = Math.round(heightInches * dpi);

  // Calculate pixels per meter for DPI metadata
  // 1 inch = 0.0254 meters, so DPI pixels/inch = DPI / 0.0254 pixels/meter
  const pixelsPerMeter = Math.round(dpi / 0.0254);

  // Build the sharp pipeline
  let pipeline = sharp(stitchMapBuffer)
    .resize(targetWidth, targetHeight, {
      kernel: sharp.kernel.nearest, // CRITICAL: nearest neighbor interpolation
      fit: 'fill',
    })
    .withMetadata({
      density: dpi, // Embeds DPI in appropriate format metadata
    });

  // Output in requested format
  if (format === 'jpg') {
    return pipeline
      .jpeg({
        quality: jpgQuality,
        chromaSubsampling: '4:4:4', // No chroma subsampling for color accuracy
      })
      .toBuffer();
  }

  return pipeline.png().toBuffer();
}

/**
 * Calculate output dimensions for a given canvas configuration.
 */
export function calculateOutputDimensions(
  widthInches: number,
  heightInches: number,
  meshCount: number,
  dpi: number
): {
  stitchWidth: number;
  stitchHeight: number;
  outputWidth: number;
  outputHeight: number;
  scaleFactor: number;
} {
  const stitchWidth = Math.round(widthInches * meshCount);
  const stitchHeight = Math.round(heightInches * meshCount);
  const outputWidth = Math.round(widthInches * dpi);
  const outputHeight = Math.round(heightInches * dpi);
  const scaleFactor = dpi / meshCount;

  return {
    stitchWidth,
    stitchHeight,
    outputWidth,
    outputHeight,
    scaleFactor,
  };
}
```

### Usage Example

```typescript
import { upscaleForManufacturer } from './manufacturer-output';

// After generating stitch-mapped image from existing pipeline
const stitchMapBuffer = result.manufacturerImageBuffer; // 130×182 pixels

// Upscale for manufacturer delivery
const manufacturerImage = await upscaleForManufacturer(
  stitchMapBuffer,
  10, // width inches
  14, // height inches
  {
    dpi: 300,
    format: 'png',
  }
);

// manufacturerImage is now 3000×4200 pixels with 300 DPI metadata
```

---

## Why Nearest Neighbor?

**Critical:** We use nearest neighbor interpolation because:

| Interpolation | Effect | Use Case |
|---------------|--------|----------|
| **Nearest Neighbor** ✅ | Each stitch pixel becomes a crisp square block | Stitch-mapped images |
| Bilinear ❌ | Blends between pixels, creates fuzzy edges | Photos (not for stitch maps) |
| Lanczos ❌ | Smooth scaling with ringing artifacts | Photos (not for stitch maps) |

**Visual comparison:**

```
Original (3×3):         Nearest (9×9):          Bilinear (9×9):
┌─┬─┬─┐                 ┌───┬───┬───┐          ┌───┬───┬───┐
│A│B│C│        ──►      │AAA│BBB│CCC│          │A~A│~B~│B~C│
├─┼─┼─┤                 │AAA│BBB│CCC│          │~~~│~~~│~~~│
│D│E│F│                 │AAA│BBB│CCC│          │~D~│~E~│~E~│
├─┼─┼─┤                 ├───┼───┼───┤          ├───┼───┼───┤
│G│H│I│                 │DDD│EEE│FFF│          (blurry mess)
└─┴─┴─┘                 │DDD│EEE│FFF│
                        │DDD│EEE│FFF│
                        ├───┼───┼───┤
                        │GGG│HHH│III│
                        │GGG│HHH│III│
                        │GGG│HHH│III│
                        └───┴───┴───┘
```

Nearest neighbor preserves the discrete nature of stitches—each stitch is a solid color block with sharp edges, exactly as it will appear when stitched.

---

## Quality Checklist

Before sending to manufacturer:

- [ ] **Resolution:** Output DPI matches target (200-300)
- [ ] **Dimensions:** Pixel dimensions = inches × DPI
- [ ] **Interpolation:** Verify nearest neighbor was used (check for sharp edges)
- [ ] **Color space:** sRGB embedded
- [ ] **DPI metadata:** Embedded in file (check with image properties)
- [ ] **Format:** PNG for quality, JPG only if size is critical
- [ ] **File integrity:** Opens correctly in image viewers

---

## Manufacturer-Specific Notes

### Stitch Art USA

See [MANUFACTURER-STITCH-ART-USA.md](./MANUFACTURER-STITCH-ART-USA.md) for:
- Contact information
- Pricing estimates  
- File submission process
- Technical requirements (to be confirmed)

---

## Future Considerations

1. **Color Profile Embedding:** Consider embedding full ICC color profile for color-critical work
2. **Proof Images:** Generate lower-DPI proofs for customer approval before manufacturing
3. **Print Marks:** Option to add registration marks, color swatches, or thread legends
4. **Multi-format Export:** Batch export in multiple DPIs/formats for different manufacturers
5. **Compression Options:** PNG compression level tuning for faster uploads

---

## References

- Sharp documentation: https://sharp.pixelplumbing.com/
- DPI/PPI standards: https://en.wikipedia.org/wiki/Dots_per_inch
- sRGB color space: https://en.wikipedia.org/wiki/SRGB
