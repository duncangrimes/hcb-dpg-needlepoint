# Needlepoint Canvas Generator

**Turn photos into stitchable needlepoint patterns — where 1 pixel = 1 stitch.**

My girlfriend Hannah is an avid needlepointer, but hand-painted canvases regularly cost $100+. I built this app to generate personalized, manufacturer-ready canvases from your own photos at a fraction of the cost.

**What I learned:** Image processing and AI prompting alone don't produce canvases that match the beauty of hand-painted originals. The best needlepoint comes from real artists. But the engineering challenge of getting as close as possible — mapping millions of colors down to 15 DMC threads while keeping the result stitchable and recognizable — was a deeply satisfying problem.

---

## How It Works

The core pipeline converts an uploaded photo into a pixel-accurate PNG pattern mapped to real DMC embroidery thread colors:

```
Upload → Lasso Select Subject → Isolate Background (ML) → Flatten Textures
→ Auto White Balance → Quantize Colors → Map to DMC Threads → Dither (OKLab)
→ Dissolve Confetti Pixels → Composite onto Background → Score Stitchability
```

### Interesting Technical Problems

**Color Quantization** — Three algorithms available, each with different tradeoffs:
- Median-cut (better edge preservation)
- Wu's variance minimization (smoother gradients)
- K-means in 5D OKLab+spatial space (region-aware clustering with k-means++ init)

**Perceptual Color Science** — All color math happens in OKLab, a perceptually uniform color space where Euclidean distance actually correlates with how humans perceive difference. This matters for dithering (Floyd-Steinberg error diffusion in OKLab), color distinctness merging (ΔE < 0.06 threshold), and nearest-DMC-thread matching.

**Confetti Cleanup** — Connected-component analysis via BFS flood-fill identifies isolated pixel clusters (< 6 pixels), then dissolves them into neighboring colors across multiple passes. Without this, patterns are impractical to stitch.

**Adaptive Processing** — Sobel edge detection measures image complexity to auto-tune blur strength. High-detail images get heavier smoothing; simple subjects stay sharp.

**Stitchability Scoring** — Measures average horizontal run length (consecutive same-color pixels). Longer runs = easier stitching. Scores range from "Excellent" (>7) to "Poor" (<3).

---

## The Editor

A mobile-first, multi-step canvas editor built on HTML5 Canvas:

- **Lasso tool** — Freeform selection with path simplification (Douglas-Peucker) and smoothing (Chaikin's corner-cutting). Ray-casting point-in-polygon test with AABB fast rejection for 30-50% speedup.
- **Arrange canvas** — Drag, scale, rotate, and layer multiple cutouts with pinch-to-zoom on mobile.
- **Background patterns** — 7 pixel-aligned pattern generators (gingham, stripes, chevron, polka dots, etc.) where each pixel maps to exactly one stitch.
- **Undo/redo** — Zustand + Zundo temporal state with Immer immutability, tracking only essential state slices.

---

## Tech Stack

| | |
|---|---|
| **Framework** | Next.js 15, React 19, TypeScript |
| **Canvas** | Konva / react-konva, @use-gesture/react |
| **State** | Zustand + Immer + Zundo (undo/redo) |
| **Image Processing** | Sharp, image-q, culori (OKLab), skmeans |
| **ML** | @imgly/background-removal-node |
| **Database** | PostgreSQL, Prisma |
| **Auth** | NextAuth v5 |
| **Storage** | Vercel Blob |
| **Validation** | Zod |
| **Styling** | Tailwind CSS 4, Headless UI |

---

## Project Structure

```
src/
├── lib/
│   ├── colors/          # Quantization, dithering, correction, DMC mapping
│   ├── editor/          # Geometry (ray-casting, Douglas-Peucker, Chaikin's)
│   ├── isolation/       # ML background removal
│   ├── simplification/  # Confetti cleanup, texture flattening
│   ├── compositor/      # Final image assembly
│   └── background/      # Pattern generators
├── components/editor/   # Lasso, arrange, preview, settings UI
├── stores/              # Zustand store with temporal undo
├── app/                 # Next.js App Router, API routes
└── data/
    └── dmc-threads.json # 489 DMC thread colors
```

---

## Algorithms Used

| Algorithm | Purpose |
|---|---|
| K-Means++ (5D OKLab + spatial) | Region-aware color clustering |
| Median-Cut / Wu's Quantization | Color palette reduction |
| Floyd-Steinberg Dithering | Perceptual error diffusion in OKLab |
| Douglas-Peucker | Lasso path simplification |
| Chaikin's Corner-Cutting | Path smoothing |
| Ray Casting | Point-in-polygon for masking |
| Shoelace Formula | Polygon area calculation |
| BFS Flood-Fill | Connected-component labeling |
| Sobel Operator | Edge density detection |
| Gray World Assumption | Auto white balance |

---

## Running Locally

```bash
npm install
cp .env.example .env.local   # Add database + storage credentials
npx prisma migrate dev
npm run dev
```

Requires Node 20+, PostgreSQL, and Vercel Blob (or compatible S3).
