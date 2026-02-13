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

## General Research: Digital Fabric Texture Simulation

This section summarizes general techniques for digitally simulating fabric textures, gathered from academic papers, shader tutorials, and open-source projects.

### 1. Procedural Weave Generation

**Core Algorithm for Canvas/Fabric Weave:**

Fabric weave texture is algorithmically generated by simulating the 90-degree interlacing of vertical warp and horizontal weft threads:

```
For each pixel (x, y):
  1. Define grid structure (typically 1:1 or 2:2)
  2. Assign alternating "over/under" values at each intersection
  3. Generate heightmaps to simulate thread thickness and shadow
  4. Apply interlacing logic: alternate which thread is on top
```

**Key Components:**
- **Warp and Weft Lines**: Two wave texture nodes set to perpendicular directions (X and Y) create the basic grid structure
- **Interlacing Pattern**: At each grid intersection, determine if warp is over weft or vice versa
- **Height/Depth Map**: Generate grayscale values to simulate thread elevation

**Academic Reference**: "wave2weave: A Procedural Weave Data Generation" (ACM 2025) - Uses procedural graphics techniques to generate weave data from waveforms.

### 2. Stitch Texture in Shaders (GLSL/WebGL)

**Fragment Shader Approach:**

```glsl
// Simplified stitch texture shader concept
uniform sampler2D baseTexture;
uniform float stitchSize;
uniform float threadDepth;

void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    
    // Create repeating stitch pattern
    vec2 stitchUV = fract(uv * stitchSize);
    
    // Diagonal tent stitch pattern
    float diagonal = step(stitchUV.x, stitchUV.y);
    
    // Add thread depth variation
    float depth = sin(stitchUV.x * 3.14159) * sin(stitchUV.y * 3.14159);
    
    // Sample base color and apply texture
    vec4 color = texture2D(baseTexture, uv);
    color.rgb *= 0.8 + depth * 0.2 * threadDepth;
    
    gl_FragColor = color;
}
```

**Key Techniques:**
- Manipulate `texcoord` to tile patterns
- Use `texture2D` to sample thread textures
- Apply normal mapping for thread depth
- Pass uniform variables for dynamic thread positions

### 3. Tent Stitch / Diagonal Pattern Simulation

**Tent Stitch Characteristics:**
- Fundamental diagonal needlepoint stitch covering one intersection
- Usually works bottom-left to top-right
- Creates durable, textured surface

**Pattern Types:**
| Type | Description | Algorithm |
|------|-------------|-----------|
| **Continental** | Row-based diagonal, alternating direction | `if (row % 2 == 0) rightToLeft else leftToRight` |
| **Basketweave** | Diagonal rows, most common in needlepoint | Work diagonally, alternating up/down rows |
| **Diagonal Scotch** | 3x3 box starting with single tent stitch | Nested loops with graduated stitch lengths |

**Implementation:**
```typescript
function applyTentStitchPattern(x: number, y: number, cellSize: number): number {
  const localX = x % cellSize;
  const localY = y % cellSize;
  
  // Diagonal gradient within each cell (bottom-left to top-right)
  const diagonal = (localX + (cellSize - localY)) / (cellSize * 2);
  
  // Add highlight on upper-right, shadow on lower-left
  return diagonal; // 0.0 to 1.0, use as brightness multiplier
}
```

### 4. Bump/Normal Mapping for Thread Depth

**When to Use:**
- Bump maps: Grayscale height data for simple depth simulation
- Normal maps: RGB vectors for realistic light interaction on fabric weaves

**For 2D Canvas Rendering:**
Instead of full 3D normal mapping, simulate with:

```typescript
function simulateThreadDepth(x: number, y: number, gridSize: number): number {
  const gx = x % gridSize;
  const gy = y % gridSize;
  
  // Thread center is elevated, edges are lower
  const centerX = gridSize / 2;
  const centerY = gridSize / 2;
  
  const distFromCenter = Math.sqrt(
    Math.pow(gx - centerX, 2) + Math.pow(gy - centerY, 2)
  );
  
  const maxDist = Math.sqrt(2) * (gridSize / 2);
  const elevation = 1.0 - (distFromCenter / maxDist);
  
  return elevation; // 0.0 = edge (shadow), 1.0 = center (highlight)
}
```

### 5. Perlin Noise for Organic Thread Texture

**Why Perlin Noise:**
- Creates smooth, natural-looking randomness
- Avoids harsh pixel-to-pixel variation
- Scale controls "grain size" of thread texture

**JavaScript Implementation:**
```typescript
// Using a noise library (e.g., simplex-noise)
import { createNoise2D } from 'simplex-noise';

const noise2D = createNoise2D();

function applyPerlinThreadTexture(
  imageData: ImageData, 
  scale: number = 0.1,
  intensity: number = 30
): ImageData {
  const data = imageData.data;
  const width = imageData.width;
  
  for (let y = 0; y < imageData.height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      
      // Generate smooth noise
      const n = noise2D(x * scale, y * scale) * intensity;
      
      // Apply to color channels
      data[idx]     = clamp(data[idx] + n, 0, 255);
      data[idx + 1] = clamp(data[idx + 1] + n, 0, 255);
      data[idx + 2] = clamp(data[idx + 2] + n, 0, 255);
    }
  }
  
  return imageData;
}
```

**Recommended Settings:**
| Texture Type | Scale | Intensity |
|--------------|-------|-----------|
| Fine thread grain | 0.3-0.5 | 15-25 |
| Coarse fabric | 0.1-0.2 | 30-50 |
| Subtle variation | 0.5-1.0 | 5-15 |

### 6. Cross-Stitch/Embroidery Software Techniques

**How Professional Software Renders Previews:**

1. **Image Import & Conversion:**
   - Convert imported images into digital grids
   - Assign specific thread colors (like DMC) to pixels
   - Map to grid symbols (typically 10x10 per stitch)

2. **Stitch Simulation:**
   - Each "stitch" rendered as angled line or X pattern
   - Color blending for adjacent stitches
   - Thread density simulation

3. **3D Preview Features:**
   - Layer management for stitch depth
   - Light direction simulation
   - Fabric background texture

**Open Source Projects:**
- **InkStitch** (inkstitch.org) - Full embroidery digitizing platform with stitch simulation
- **DMC-Image-Converter** - Converts images to DMC cross-stitch patterns
- **xstitch** (R package) - Cross-stitch chart generation

### 7. Recommended Implementation Strategy

**For Our Needlepoint App:**

#### Canvas Preview (Mesh Texture)
```
1. Scale base image to target resolution (e.g., 4px per stitch)
2. For each pixel:
   a. Calculate grid position within 4x4 tile
   b. Apply mesh pattern:
      - Dark (20% brightness) at intersections
      - Medium (50-75%) along thread lines
      - Light (95%) in cell centers
   c. Add ±10 noise for realism
3. Optional: Apply slight Gaussian blur (0.5px) to soften
```

#### Stitched Preview (Thread Texture)
```
1. Scale base image to target resolution
2. For each pixel:
   a. Generate Perlin noise value (scale 0.3, intensity 25)
   b. Add diagonal modulation: ±5 based on (x+y) % 2
   c. Apply to RGB channels
3. Optional: Slight contrast boost (+10%)
```

### 8. Performance Considerations

**For Real-Time Preview:**
- Pre-generate texture overlay images (mesh pattern, noise pattern)
- Use Canvas 2D `globalCompositeOperation` for fast blending
- Consider WebGL shaders for large images

**Texture Caching:**
```typescript
// Pre-generate and cache texture patterns
const meshPatternCache = new Map<number, ImageData>();

function getMeshPattern(gridSize: number, width: number, height: number): ImageData {
  const key = `${gridSize}-${width}-${height}`;
  if (!meshPatternCache.has(key)) {
    meshPatternCache.set(key, generateMeshPattern(gridSize, width, height));
  }
  return meshPatternCache.get(key)!;
}
```

---

## Additional Resources

### Academic Papers
- "wave2weave: A Procedural Weave Data Generation" (ACM 2025)
- "Procedural Approach for Realistic Woven Fabric Rendering" (ScienceDirect)
- "A Procedural Thread Texture Model" (ResearchGate)
- "Fabric Texture Analysis and Weave Pattern Recognition" (ResearchGate 2017)

### Tools & Software
- **Adobe Substance 3D Designer** - Weave Generator node for procedural fabric
- **Blender** - Procedural fabric materials with nodes
- **InkStitch** - Open-source embroidery digitizing (inkstitch.org)
- **p5.js** - JavaScript library with built-in `noise()` function

### Open Source Projects (GitHub)
- `inkstitch/inkstitch` - Full embroidery platform
- `Kyocer/DMC-Image-Converter` - DMC cross-stitch conversion
- `EyeOfMidas/perlin-canvas-js` - Perlin noise for canvas textures
- `sdsumurk/cross-stitch` - Python cross-stitch tools
- `nihih/tarraa` - Cross-stitch pattern generator

---

## Files

Reference images saved to: `docs/reference-images/`
- `needlepaint-canvas-belt.jpg`
- `needlepaint-stitched-belt.jpg`
- `needlepaint-canvas-ornament.jpg`
- `needlepaint-stitched-ornament.jpg`
