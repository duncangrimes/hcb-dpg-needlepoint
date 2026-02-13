# Fabric & Textile Simulation Research

## Overview

This document covers techniques for digitally simulating fabric and textile textures for needlepoint canvas preview generation. The two primary rendering challenges are:

1. **Canvas Mesh** - The underlying woven grid with visible holes
2. **Stitched Needlepoint** - Diagonal/vertical stitches with thread texture

---

## 1. Procedural Texture Generation Fundamentals

### Core Concepts

Procedural textures are generated algorithmically rather than from stored images. Key advantages:
- Low storage cost
- Unlimited resolution
- Easy parameterization
- Perfect tiling

### Key Building Blocks

#### Perlin/Simplex Noise
Used to add natural variation to textures:
```javascript
// Simplex noise for thread variation
function threadVariation(x, y, seed) {
  const noise = simplex2D(x * 0.1, y * 0.1, seed);
  return 1.0 + noise * 0.15; // ±15% variation
}
```

#### Periodic Functions
For repeating patterns like weave structures:
```javascript
// Basic weave pattern using periodic functions
function weavePattern(x, y, cellSize) {
  const fx = Math.floor(x / cellSize);
  const fy = Math.floor(y / cellSize);
  return (fx + fy) % 2; // checkerboard base
}
```

---

## 2. Canvas Mesh Rendering

### The Warp and Weft Model

Needlepoint canvas consists of:
- **Warp threads**: Vertical (longitudinal) threads
- **Weft threads**: Horizontal (lateral) threads  
- **Holes/gaps**: Spaces between thread intersections

### Thread Intersection Algorithm

```javascript
function renderCanvasMesh(x, y, meshCount, threadWidth) {
  // Normalize to mesh grid
  const cellSize = 1.0 / meshCount;
  const localX = (x % cellSize) / cellSize;
  const localY = (y % cellSize) / cellSize;
  
  // Thread occupies edges, hole in center
  const threadRatio = threadWidth; // e.g., 0.3-0.4
  const holeStart = threadRatio;
  const holeEnd = 1.0 - threadRatio;
  
  // Is this pixel in a hole?
  const inHoleX = localX > holeStart && localX < holeEnd;
  const inHoleY = localY > holeStart && localY < holeEnd;
  
  if (inHoleX && inHoleY) {
    return { type: 'hole', color: backgroundColor };
  }
  
  // Determine thread type and depth
  const onWarp = localX <= threadRatio || localX >= (1.0 - threadRatio);
  const onWeft = localY <= threadRatio || localY >= (1.0 - threadRatio);
  
  // At intersections, alternate over/under
  const cellX = Math.floor(x / cellSize);
  const cellY = Math.floor(y / cellSize);
  const warpOnTop = (cellX + cellY) % 2 === 0;
  
  return {
    type: warpOnTop ? 'warp' : 'weft',
    depth: warpOnTop ? 1.0 : 0.8, // For shadow calculation
    color: canvasBaseColor
  };
}
```

### Thread Profile Rendering

Threads aren't flat - they have a cylindrical profile:

```javascript
function threadProfile(distFromCenter, threadRadius) {
  // Normalized distance from thread center (0 = center, 1 = edge)
  const t = distFromCenter / threadRadius;
  
  if (t > 1.0) return 0; // Outside thread
  
  // Circular cross-section creates this intensity curve
  // Bright in center, darker at edges (cylinder lighting)
  return Math.sqrt(1.0 - t * t);
}
```

### Shadow and Depth

```javascript
function addCanvasShadows(pixel, threadData, lightAngle) {
  const { depth, type } = threadData;
  
  // Thread below casts shadow
  const shadowIntensity = 0.2;
  const shadowOffset = 2; // pixels
  
  // Ambient occlusion at thread crossings
  const aoStrength = type === 'crossing' ? 0.15 : 0;
  
  return pixel * (1.0 - shadowIntensity * (1 - depth) - aoStrength);
}
```

### Typical Canvas Colors

| Canvas Type | RGB Value | Hex |
|-------------|-----------|-----|
| Ecru/Natural | (240, 234, 214) | #F0EAD6 |
| White | (255, 255, 252) | #FFFFFC |
| Cream | (255, 253, 240) | #FFFDF0 |
| Antique | (235, 222, 195) | #EBDEC3 |

---

## 3. Stitch Texture Rendering

### Common Needlepoint Stitch Types

#### Tent Stitch (Continental/Basketweave)
The fundamental needlepoint stitch - diagonal at 45° angle:

```
Visual pattern (single stitch):
    ╲
   ╲
  ╲
 ╲
```

Three variants produce identical front appearance:
1. **Continental** - Horizontal rows
2. **Basketweave** - Diagonal rows (best coverage, least distortion)
3. **Half-cross** - Uses least thread

#### Basketweave Pattern Algorithm

```javascript
function renderBasketweaveStitch(x, y, stitchSize, threadColor) {
  const cellX = Math.floor(x / stitchSize);
  const cellY = Math.floor(y / stitchSize);
  const localX = (x % stitchSize) / stitchSize;
  const localY = (y % stitchSize) / stitchSize;
  
  // Each stitch goes diagonal: bottom-left to top-right
  // The "active" diagonal band based on local position
  const diagonalPos = localX + (1.0 - localY);
  
  // Thread width relative to stitch cell
  const threadWidth = 0.7;
  
  // Are we within the diagonal thread band?
  const inThread = diagonalPos > (1.0 - threadWidth / 2) && 
                   diagonalPos < (1.0 + threadWidth / 2);
  
  if (!inThread) {
    return null; // Show canvas beneath
  }
  
  // Calculate thread depth (3D effect)
  const distFromCenter = Math.abs(diagonalPos - 1.0);
  const threadHeight = Math.sqrt(1.0 - Math.pow(distFromCenter / (threadWidth / 2), 2));
  
  return {
    color: threadColor,
    height: threadHeight,
    normal: calculateThreadNormal(localX, localY)
  };
}
```

### Thread Direction Rendering

Thread has a directional grain that affects how light reflects:

```javascript
function threadDirectionLight(localPos, stitchAngle, lightDir) {
  // Thread direction for tent stitch is 45° 
  const threadDir = { x: Math.cos(stitchAngle), y: Math.sin(stitchAngle) };
  
  // Perpendicular to thread direction catches more light
  const perpendicular = { x: -threadDir.y, y: threadDir.x };
  
  // How aligned is light with perpendicular?
  const lightAlignment = Math.abs(
    lightDir.x * perpendicular.x + lightDir.y * perpendicular.y
  );
  
  // More light = brighter thread
  return 0.7 + 0.3 * lightAlignment;
}
```

### Thread Texture (Fiber Simulation)

Individual fibers create the fuzzy thread appearance:

```javascript
function addThreadFibers(baseColor, x, y, scale, intensity) {
  // High-frequency noise simulates individual fibers
  const fiberNoise = fbm(x * scale * 50, y * scale * 50, 4); // 4 octaves
  
  // Fibers aligned with thread direction
  const threadAngle = Math.PI / 4; // 45° for tent stitch
  const rotatedX = x * Math.cos(threadAngle) + y * Math.sin(threadAngle);
  
  // Elongated noise along thread direction
  const stretchedNoise = fbm(rotatedX * 100, y * 20, 3);
  
  // Combine for final fiber effect
  const fiberEffect = fiberNoise * 0.3 + stretchedNoise * 0.7;
  
  return modulateColor(baseColor, 1.0 + fiberEffect * intensity);
}

// Fractal Brownian Motion for natural variation
function fbm(x, y, octaves) {
  let value = 0;
  let amplitude = 0.5;
  for (let i = 0; i < octaves; i++) {
    value += amplitude * noise2D(x, y);
    x *= 2;
    y *= 2;
    amplitude *= 0.5;
  }
  return value;
}
```

---

## 4. Per-Pixel Lighting Model

### Phong-Style Thread Lighting

```javascript
function lightThread(position, normal, viewDir, lightDir, threadColor) {
  // Ambient (base illumination)
  const ambient = 0.3;
  
  // Diffuse (light hitting surface)
  const diff = Math.max(0, dot(normal, lightDir));
  const diffuse = diff * 0.5;
  
  // Specular (shiny highlights) - reduced for matte thread
  const reflectDir = reflect(lightDir, normal);
  const spec = Math.pow(Math.max(0, dot(viewDir, reflectDir)), 8);
  const specular = spec * 0.15;
  
  // Final color
  const intensity = ambient + diffuse + specular;
  return multiplyColor(threadColor, intensity);
}

// Helper: reflect vector
function reflect(incident, normal) {
  const d = 2 * dot(incident, normal);
  return {
    x: incident.x - d * normal.x,
    y: incident.y - d * normal.y,
    z: incident.z - d * normal.z
  };
}
```

### Shadow Mapping for Stitch Depth

```javascript
function calculateStitchShadow(x, y, stitchSize, lightOffset) {
  // Sample "height" at shadow-casting position
  const shadowX = x - lightOffset.x;
  const shadowY = y - lightOffset.y;
  
  const casterHeight = getStitchHeight(shadowX, shadowY, stitchSize);
  const currentHeight = getStitchHeight(x, y, stitchSize);
  
  // If caster is higher, we're in shadow
  if (casterHeight > currentHeight + 0.1) {
    return 0.7; // Shadow multiplier
  }
  return 1.0;
}
```

---

## 5. Compositing Stitch Over Canvas

### Layer Blending Strategy

```javascript
function renderNeedlepointPreview(x, y, pattern, stitchSize, meshCount) {
  // Layer 1: Background (dark behind holes)
  const background = { r: 40, g: 35, b: 30 };
  
  // Layer 2: Canvas mesh
  const canvas = renderCanvasMesh(x, y, meshCount, 0.35);
  
  // Layer 3: Check if this cell has a stitch
  const cellX = Math.floor(x / stitchSize);
  const cellY = Math.floor(y / stitchSize);
  const stitchColor = pattern.getColor(cellX, cellY);
  
  if (!stitchColor) {
    // No stitch - show canvas (or hole)
    return canvas.type === 'hole' ? background : canvas.color;
  }
  
  // Layer 4: Render stitch
  const stitch = renderBasketweaveStitch(x, y, stitchSize, stitchColor);
  
  if (!stitch) {
    // Between threads of stitch - show canvas
    return canvas.type === 'hole' ? background : canvas.color;
  }
  
  // Layer 5: Apply lighting and fiber texture
  const lit = lightThread(/* ... */);
  const textured = addThreadFibers(lit, x, y, 1.0, 0.1);
  
  return textured;
}
```

### Alpha Blending at Stitch Edges

```javascript
function blendStitchEdge(stitchColor, canvasColor, edgeDistance, blendWidth) {
  // Smooth transition at stitch edges
  const alpha = smoothstep(0, blendWidth, edgeDistance);
  
  return {
    r: lerp(canvasColor.r, stitchColor.r, alpha),
    g: lerp(canvasColor.g, stitchColor.g, alpha),
    b: lerp(canvasColor.b, stitchColor.b, alpha)
  };
}

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}
```

---

## 6. Complete Rendering Pipeline

### High-Level Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    Input: Pattern Grid                        │
│                    (color per stitch cell)                    │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                   For each output pixel:                      │
├──────────────────────────────────────────────────────────────┤
│  1. Map pixel to pattern cell                                 │
│  2. Get stitch color (or none)                                │
│  3. Calculate local position within cell                      │
│  4. Determine if on stitch thread or gap                      │
│  5. If gap: render canvas mesh                                │
│  6. If thread: apply lighting + fiber texture                 │
│  7. Composite layers with shadows                             │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                     Output: Preview Image                     │
└──────────────────────────────────────────────────────────────┘
```

### Canvas Implementation (2D Context)

```javascript
class NeedlepointRenderer {
  constructor(canvas, pattern, options = {}) {
    this.ctx = canvas.getContext('2d');
    this.pattern = pattern;
    this.stitchSize = options.stitchSize || 10;
    this.meshCount = options.meshCount || 14;
    this.lightDir = options.lightDir || { x: 0.5, y: -0.5, z: 0.7 };
  }
  
  render() {
    const imageData = this.ctx.createImageData(
      this.canvas.width,
      this.canvas.height
    );
    const data = imageData.data;
    
    for (let y = 0; y < this.canvas.height; y++) {
      for (let x = 0; x < this.canvas.width; x++) {
        const color = this.renderPixel(x, y);
        const idx = (y * this.canvas.width + x) * 4;
        data[idx] = color.r;
        data[idx + 1] = color.g;
        data[idx + 2] = color.b;
        data[idx + 3] = 255;
      }
    }
    
    this.ctx.putImageData(imageData, 0, 0);
  }
  
  renderPixel(x, y) {
    // Implementation from previous sections
    // ...
  }
}
```

### WebGL Shader Implementation (Fragment Shader)

```glsl
precision mediump float;

uniform sampler2D u_pattern;      // Pattern colors
uniform vec2 u_resolution;         // Canvas size
uniform float u_stitchSize;        // Pixels per stitch
uniform float u_meshCount;         // Threads per inch
uniform vec3 u_lightDir;           // Light direction
uniform vec3 u_canvasColor;        // Base canvas color

varying vec2 v_texCoord;

// Simplex noise function (include implementation)
float snoise(vec2 v);

void main() {
  vec2 pixel = v_texCoord * u_resolution;
  
  // Which pattern cell?
  vec2 cell = floor(pixel / u_stitchSize);
  vec2 local = fract(pixel / u_stitchSize);
  
  // Get stitch color from pattern texture
  vec4 stitchColor = texture2D(u_pattern, cell / vec2(textureSize(u_pattern, 0)));
  
  // Is this pixel on the diagonal thread?
  float diag = local.x + (1.0 - local.y);
  float threadWidth = 0.7;
  float inThread = smoothstep(1.0 - threadWidth/2.0 - 0.05, 1.0 - threadWidth/2.0, diag)
                 - smoothstep(1.0 + threadWidth/2.0, 1.0 + threadWidth/2.0 + 0.05, diag);
  
  // Thread height for lighting
  float distFromCenter = abs(diag - 1.0) / (threadWidth / 2.0);
  float threadHeight = sqrt(1.0 - distFromCenter * distFromCenter);
  
  // Calculate normal for lighting
  vec3 normal = normalize(vec3(
    -dFdx(threadHeight) * 10.0,
    -dFdy(threadHeight) * 10.0,
    1.0
  ));
  
  // Basic diffuse lighting
  float diffuse = max(dot(normal, normalize(u_lightDir)), 0.0);
  float lighting = 0.3 + 0.7 * diffuse;
  
  // Add fiber texture noise
  float fiber = snoise(pixel * 5.0) * 0.1;
  
  // Compose final color
  vec3 threadFinal = stitchColor.rgb * (lighting + fiber);
  vec3 canvasFinal = u_canvasColor * 0.9;
  
  // Mix based on thread coverage
  vec3 finalColor = mix(canvasFinal, threadFinal, inThread * stitchColor.a);
  
  gl_FragColor = vec4(finalColor, 1.0);
}
```

---

## 7. Optimization Strategies

### Tile-Based Rendering
Pre-render repeating patterns and composite:
```javascript
// Pre-render one stitch tile
const stitchTile = renderStitchTile(stitchSize, color);

// Composite tiles for full preview
for (let y = 0; y < patternHeight; y++) {
  for (let x = 0; x < patternWidth; x++) {
    const color = pattern[y][x];
    const tintedTile = tintTile(stitchTile, color);
    ctx.drawImage(tintedTile, x * stitchSize, y * stitchSize);
  }
}
```

### LOD (Level of Detail)
Adjust detail based on zoom:
```javascript
function getDetailLevel(zoom) {
  if (zoom > 2.0) return 'high';    // Full fiber texture
  if (zoom > 0.5) return 'medium';  // Basic thread shading
  return 'low';                      // Flat color per stitch
}
```

### Caching
Cache expensive calculations:
```javascript
const noiseCache = new Map();
function cachedNoise(x, y) {
  const key = `${Math.floor(x*100)},${Math.floor(y*100)}`;
  if (!noiseCache.has(key)) {
    noiseCache.set(key, computeNoise(x, y));
  }
  return noiseCache.get(key);
}
```

---

## 8. Cross-Stitch Software Analysis

### How Existing Software Renders Previews

**PCStitch** and **StitchFiddle** typically use:
1. Pre-rendered stitch texture tiles
2. Color multiplication for thread colors
3. Simple shadow overlays at cell boundaries
4. Optional canvas texture background

**Ink/Stitch** (open source embroidery):
- Renders actual stitch paths as vectors
- Simulates needle penetration points
- More realistic but computationally expensive

### Common Simplifications in Cross-Stitch Software:
- Single texture per stitch type (e.g., X-stitch tile)
- Color tinting via multiply blend mode
- Canvas shown as static texture, not computed
- No per-thread fiber simulation

---

## 9. References

### Academic & Technical
- Ebert et al: "Texturing and Modeling: A Procedural Approach" (Morgan Kaufmann, 2003)
- Ken Perlin: "Improving Noise" (SIGGRAPH 2002)
- Stefan Gustavson: "Simplex Noise Demystified" (Linköping University)

### Wikipedia Articles
- [Procedural Texture](https://en.wikipedia.org/wiki/Procedural_texture)
- [Texture Synthesis](https://en.wikipedia.org/wiki/Texture_synthesis)
- [Perlin Noise](https://en.wikipedia.org/wiki/Perlin_noise)
- [Needlepoint](https://en.wikipedia.org/wiki/Needlepoint)
- [Tent Stitch](https://en.wikipedia.org/wiki/Tent_stitch)
- [Weaving](https://en.wikipedia.org/wiki/Weaving)

### Online Resources
- [The Book of Shaders - Patterns](https://thebookofshaders.com/09/)
- [The Book of Shaders - Noise](https://thebookofshaders.com/11/)
- [Inigo Quilez - 2D Distance Functions](https://iquilezles.org/articles/distfunctions2d/)
- [Shadertoy](https://shadertoy.com) - GPU shader examples

### Software
- [Ink/Stitch](https://inkstitch.org) - Open source embroidery design
- [PCStitch](https://pcstitch.com) - Cross-stitch pattern software
- [StitchFiddle](https://stitchfiddle.com) - Online pattern editor
- [canvas-sketch-util](https://github.com/mattdesl/canvas-sketch-util) - Generative art utilities

---

## 10. Recommended Implementation Approach

For the needlepoint canvas app, the recommended approach is:

### Phase 1: Basic Preview
1. Implement flat color per-stitch rendering
2. Add simple diagonal line pattern for tent stitch
3. Show canvas mesh as static background image

### Phase 2: Enhanced Realism
1. Add per-thread lighting (Phong model)
2. Implement cylindrical thread profile
3. Add subtle noise for variation

### Phase 3: Advanced Features
1. Fiber texture simulation
2. Proper canvas mesh computation
3. Real-time WebGL rendering for zoom/pan
4. Multiple stitch type support

### Key Parameters to Expose
- `stitchSize` - Pixels per stitch (affects detail)
- `meshCount` - Canvas mesh density (e.g., 14-count, 18-count)
- `threadCoverage` - How much thread covers canvas (0.6-0.8)
- `lightDirection` - For 3D shading effect
- `fiberIntensity` - Amount of texture variation
