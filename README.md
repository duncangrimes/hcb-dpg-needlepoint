# HCB Needlepoint Canvas Generator

Transform your photos into custom needlepoint canvases with complete creative control.

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma)

---

## ✨ Features

### 🖌️ Lasso Selection Tool
Draw freeform selections around exactly what you want in your canvas — pets, people, objects. No AI guessing; you're in control.

### 🎨 Photo-to-Needlepoint Pipeline
Advanced image processing converts your photos into stitchable patterns:
- **Color quantization** using Wu's algorithm
- **DMC thread mapping** to real embroidery floss colors
- **Majority filtering** eliminates impractical "confetti" stitches
- **Stitchability scoring** tells you how easy the pattern is to stitch

### 📐 Canvas Composition
Arrange multiple cutouts on your canvas:
- Drag, scale, and rotate elements
- Layer ordering and management
- Background patterns (solid, gingham, stripes)
- Configurable canvas size and mesh count

### 📱 Mobile-First Design
Optimized for the device where your photos live:
- Touch-friendly lasso drawing
- Camera capture integration
- Responsive, thumb-zone-aware UI

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| State | Zustand + zundo (undo/redo) |
| Canvas | react-konva |
| Database | PostgreSQL + Prisma |
| Storage | Vercel Blob |
| Auth | Auth.js (NextAuth v5) |
| Styling | Tailwind CSS + Headless UI |
| Image Processing | Sharp |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database
- Vercel Blob storage (or compatible S3)

### Installation

```bash
# Clone the repository
git clone https://github.com/duncangrimes/hcb-dpg-needlepoint.git
cd hcb-dpg-needlepoint

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your database and storage credentials

# Run database migrations
npx prisma migrate dev

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

---

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── editor/             # Main editor page
│   └── api/                # API routes
├── components/
│   └── editor/             # Editor components
│       ├── LassoCanvas     # Lasso drawing surface
│       ├── ArrangeCanvas   # Composition canvas
│       └── PreviewStep     # Result display
├── stores/
│   └── editor-store.ts     # Zustand state management
├── lib/
│   ├── colors/             # Color processing pipeline
│   └── editor/             # Geometry & extraction
└── data/
    └── dmc-threads.json    # DMC thread color database
```

---

## 🖼️ Image Processing Pipeline

The pipeline transforms photos into manufacturer-ready needlepoint patterns where **1 pixel = 1 stitch**:

1. **Resize** to target stitch dimensions (based on canvas size × mesh count)
2. **Color correct** with auto white balance
3. **Quantize** to limited color palette (Wu's algorithm)
4. **Map** colors to DMC thread codes
5. **Dither** in perceptual color space (OKLab)
6. **Filter** with majority filter to remove confetti pixels
7. **Score** stitchability based on horizontal run lengths

### Output

- **Manufacturer Image** — pixel-accurate PNG (1 pixel = 1 stitch)
- **Thread List** — DMC codes with stitch counts
- **Stitchability Score** — how practical the pattern is to stitch

---

## 📚 Documentation

Detailed documentation is available in the [`docs/`](./docs/) folder:

- **[MVP Specification](./docs/MVP.md)** — Current features and roadmap
- **[Technical Spec](./docs/TECHNICAL-SPECIFICATION.md)** — Architecture and data models
- **[Performance Analysis](./docs/PERFORMANCE-ANALYSIS.md)** — Optimization recommendations
- **[Color Palette](./docs/COLOR-PALETTE.md)** — Brand design system

---

## 🎨 Color Palette

| Color | Hex | Usage |
|-------|-----|-------|
| Terracotta | `#E86142` | Primary brand, CTAs |
| Sage | `#7A8A5E` | Secondary, accents |
| Golden Thread | `#FBBF24` | Highlights, badges |
| Stone | `#7A756C` | Text, neutrals |

See [COLOR-PALETTE.md](./docs/COLOR-PALETTE.md) for the full palette.

---

## 📝 License

Private project for HCB Needlepoint.

---

## 🤝 Contributing

This is a private project. Contact the maintainers for contribution guidelines.
