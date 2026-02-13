# NeedlePaint Preview Quality Analysis

## Overview

This document analyzes how NeedlePaint.com creates their high-quality canvas and stitched preview images. Our goal is to understand their techniques to recreate similar quality in our implementation.

## Reference Images Analyzed

- Maritime Signal Flag Belt Kit (ID: 326)
  - Canvas: `maritime-signal-flag-belt-canvas-326-lg.jpg`
  - Stitched: `maritime-signal-flag-belt-canvas-326-stitched-preview-lg.jpg`
- Peter Rabbit Ornament Kit (ID: 4469)
  - Canvas: `peter-rabbit-needlepoint-ornament-kit-4469-lg.jpg`
  - Stitched: `peter-rabbit-needlepoint-ornament-kit-4469-stitched-preview-lg.jpg`

---

## Canvas Preview Analysis

### Visual Characteristics

The canvas preview simulates printed needlepoint canvas (Zweigart mono deluxe, 18 mesh). Key features:

1. **Visible mesh texture** - White/cream threads with dark holes between
2. **Regular grid pattern** - Mesh holes appear at consistent intervals
3. **High contrast** - Range of ~200 units (gray 50 to white 255)
4. **Color is printed on mesh** - Design colors show through the mesh texture

### Pixel-Level Pattern (ASCII Visualization)

```
CANVAS WHITE MESH (25x25 sample):
▓ = dark hole (~50-100 gray)
░ = medium gray (~200-235)
· = light gray (~245-251)
  = white (252-255)

▓░░▓▓▒·▓▓▒░▓▓▒·▓▓░░▓▓▒·▓▓
▓░ ▓▓▓·▓▓▓·▓▓▓ ▓▓▒ ▓▓▓·▓▓
▓░·▓▓▓ ▓▓░·▓▓░·▓▓░ ▓▓░ ▓▓
    ·  ··  ░· ·          
▓▒·▓▓▒·▓▓▒ ▓▓▒▒▓▓▒·▓▓▒·▓▓
...repeats...
```

**Pattern breakdown:**
- Vertical dark stripes (▓) every ~3-4 pixels = vertical mesh threads
- Horizontal light row every 4 rows = horizontal mesh threads crossing
- Dark squares at intersections = mesh holes where threads cross

### Measured Statistics (White Mesh Area)

| Metric | Value |
|--------|-------|
| Min brightness | 49 |
| Max brightness | 255 |
| Average | 206 |
| **Range** | **206** |
| Grid interval | ~3-4 pixels |

### Canvas Mesh Algorithm

```
For each pixel (x, y):
  1. Calculate grid position: gridX = x % 4, gridY = y % 4
  2. If gridX == 0 OR gridY == 0:
     - This is a mesh thread intersection area
     - Apply dark hole: gray(50-100)
  3. If gridX == 1 OR gridX == 3 (near thread):
     - Apply medium gray: gray(180-220)
  4. Otherwise:
     - Apply light/white: gray(240-255)
  5. Blend with underlying design color
```

**Simplified pattern (4x4 tile):**
```
▓░·░
░·  
·  ·
░  ░
```

---

## Stitched Preview Analysis

### Visual Characteristics

The stitched preview simulates completed needlepoint with tent stitch. Key features:

1. **No visible mesh holes** - Stitches fill all gaps
2. **Subtle fabric texture** - Random noise creates thread texture
3. **Lower contrast** - Range of ~60 units (gray 193 to white 255)
4. **Diagonal stitch hints** - Slight diagonal pattern in texture (optional)
5. **Softer, warmer appearance** - No harsh holes or grid

### Pixel-Level Pattern (ASCII Visualization)

```
STITCHED WHITE AREA (25x25 sample):
▒ = darker (~193-220)
░ = medium (~220-235)  
· = light (~235-245)
  = bright (~245-255)

··░░·░░░ ·░··░░···░░· ·░░
▒░░▒░░░░▒░·░░░░░▒░░░░·░░▒
░··░░··░░░░··░░░░░░░░··░░
· ·░· ·░ ░░· ·░····░···░ 
...random pattern continues...
```

**Key difference:** No regular grid - just random noise texture!

### Measured Statistics (White Area)

| Metric | Value |
|--------|-------|
| Min brightness | 193 |
| Max brightness | 255 |
| Average | 242 |
| **Range** | **62** |
| Pattern | Random noise |

### Stitch Texture Algorithm

```
For each pixel (x, y):
  1. Generate noise value: noise = random(-30, +30)
  2. Apply to base color: finalGray = baseGray + noise
  3. Clamp to valid range: clamp(finalGray, 0, 255)
  4. Optional: Add diagonal bias for tent stitch appearance
     - Brighter pixels along diagonal lines (x + y) % 2
```

**Alternative with Perlin noise for smoother texture:**
```
For each pixel (x, y):
  1. noise = perlin(x * 0.5, y * 0.5) * 30  // Scale controls grain size
  2. Apply to color with slight diagonal modulation
```

---

## Color Application Differences

### Canvas Preview (Colored Areas)

In colored design areas, NeedlePaint applies:
- **Mesh overlay** - Same grid pattern as white areas
- **Color bleeding** - Slight color spread into adjacent cells
- **Consistent per-pixel variation** - 800+ unique colors in 30x30 sample

**Top colors in blue area (Canvas):**
```
RGB(254,255,255): 5px  (mesh highlights)
RGB(57,97,210): 4px    (blue variants)
RGB(58,95,210): 4px
RGB(52,93,201): 4px
```

### Stitched Preview (Colored Areas)

- **No mesh overlay** - Clean filled appearance
- **More color variation** - 860+ unique colors in same sample
- **Darker darks, lighter lights** - Higher local contrast

**Top colors in blue area (Stitched):**
```
RGB(254,255,255): 3px
RGB(0,34,165): 2px     (deeper darks)
RGB(71,113,234): 2px   (brighter highlights)
```

---

## Implementation Recommendations

### Canvas Preview Renderer

```typescript
function applyCanvasMeshTexture(
  imageData: ImageData, 
  gridSize: number = 4
): ImageData {
  const data = imageData.data;
  const width = imageData.width;
  
  for (let y = 0; y < imageData.height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      
      const gridX = x % gridSize;
      const gridY = y % gridSize;
      
      // Determine mesh texture factor (0 = hole, 1 = thread)
      let meshFactor: number;
      
      if (gridX === 0 && gridY === 0) {
        // Intersection - darkest (mesh hole)
        meshFactor = 0.2;  // 20% brightness
      } else if (gridX === 0 || gridY === 0) {
        // Thread line
        meshFactor = 0.5;  // 50% brightness
      } else if (gridX === 1 || gridY === 1 || gridX === gridSize-1 || gridY === gridSize-1) {
        // Near thread
        meshFactor = 0.75;
      } else {
        // Center of cell - brightest
        meshFactor = 0.95;
      }
      
      // Apply mesh darkening to each channel
      data[idx]     = Math.round(data[idx] * meshFactor);     // R
      data[idx + 1] = Math.round(data[idx + 1] * meshFactor); // G
      data[idx + 2] = Math.round(data[idx + 2] * meshFactor); // B
      
      // Add slight noise for realism
      const noise = (Math.random() - 0.5) * 20;
      data[idx]     = clamp(data[idx] + noise, 0, 255);
      data[idx + 1] = clamp(data[idx + 1] + noise, 0, 255);
      data[idx + 2] = clamp(data[idx + 2] + noise, 0, 255);
    }
  }
  
  return imageData;
}
```

### Stitched Preview Renderer

```typescript
function applyStitchTexture(
  imageData: ImageData,
  noiseAmount: number = 30
): ImageData {
  const data = imageData.data;
  const width = imageData.width;
  
  for (let y = 0; y < imageData.height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      
      // Random noise for thread texture
      const noise = (Math.random() - 0.5) * noiseAmount * 2;
      
      // Optional: diagonal modulation for tent stitch appearance
      const diagonal = ((x + y) % 2 === 0) ? 5 : -5;
      
      // Apply texture
      data[idx]     = clamp(data[idx] + noise + diagonal, 0, 255);     // R
      data[idx + 1] = clamp(data[idx + 1] + noise + diagonal, 0, 255); // G  
      data[idx + 2] = clamp(data[idx + 2] + noise + diagonal, 0, 255); // B
    }
  }
  
  return imageData;
}
```

### Rendering Pipeline

1. **Generate base pixelated image** (current implementation)
2. **Scale up to preview resolution** (e.g., 4x for canvas, 4x for stitched)
3. **Apply texture overlay:**
   - Canvas: `applyCanvasMeshTexture()` with gridSize matching mesh count
   - Stitched: `applyStitchTexture()` with subtle noise
4. **Post-process:** Optional sharpening or contrast adjustment

---

## Key Metrics Summary

| Property | Canvas Preview | Stitched Preview |
|----------|---------------|------------------|
| Brightness range | ~200 (high contrast) | ~60 (subtle) |
| Pattern type | Regular grid | Random noise |
| Grid visible | Yes (dark holes) | No |
| Min brightness | ~50 | ~193 |
| Avg brightness | ~206 | ~242 |
| Unique colors/900px | 805 | 864 |

---

## Files

Reference images saved to: `docs/reference-images/`
- `needlepaint-canvas-belt.jpg`
- `needlepaint-stitched-belt.jpg`
- `needlepaint-canvas-ornament.jpg`
- `needlepaint-stitched-ornament.jpg`
