# Needlepoint Canvas Generator — MVP Specification

**Last Updated:** February 7, 2026  
**Status:** Active Development  
**Branch:** `feature/lasso-editor`

---

## Vision

Turn photos into custom needlepoint canvases. Users draw lasso selections around what they want, arrange them on a canvas, and generate a manufacturer-ready output where 1 pixel = 1 stitch.

---

## MVP User Flow

```
┌─────────────────────────────────────────────────────────────┐
│  1. UPLOAD                                                  │
│                                                             │
│     📷 Take Photo    🖼️ Choose from Library                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  2. CLIP (Modal)                                            │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │     [Photo with lasso drawing overlay]              │   │
│  │                                                     │   │
│  │     Draw around what you want to include            │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  After completing a lasso:                                  │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │ Continue Clipping│  │  Go to Canvas  │                  │
│  └─────────────────┘  └─────────────────┘                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  3. ARRANGE                                                 │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │     [Canvas with placed cutouts]                    │   │
│  │                                                     │   │
│  │     • Drag to move                                  │   │
│  │     • Pinch to scale                                │   │
│  │     • Two-finger rotate                             │   │
│  │     • Tap outside cutout to deselect                │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Toolbar: [+ Add More] [Layers] [Settings] [Generate →]   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  4. GENERATE                                                │
│                                                             │
│     Processing: quantize colors → map to DMC threads →     │
│                 apply majority filter → output              │
│                                                             │
│     Result: Stitchability score, thread list, download     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## MVP Features (Priority Order)

### Must Have (P0)

1. **Upload** — Camera capture or photo library picker
2. **Lasso Tool** — Draw freeform selection around subjects
3. **Multiple Cutouts** — Create multiple selections from same/different images
4. **Arrange Canvas** — Drag, scale, rotate cutouts on canvas
5. **Canvas Settings** — Size (inches), mesh count, background color
6. **Generate** — Process to needlepoint-ready image
7. **Download** — Save generated canvas

### Should Have (P1)

1. **Undo/Redo** — For lasso drawing and arrangement
2. **Layer Panel** — Reorder cutouts, delete individual layers
3. **Background Patterns** — Gingham, stripes, checkerboard
4. **Cutout Library** — Save/reuse cutouts across canvases

### Nice to Have (P2 — Post-MVP)

1. **AI Subject Detection** — Auto-detect subjects for selection
2. **Vision-Guided Palette** — AI-suggested color palettes
3. **Cross-Image Import** — Add cutouts from multiple source images
4. **Stitch Grid Preview** — Overlay showing individual stitches
5. **Export Thread List** — Printable shopping list

---

## Technical Stack

- **Framework:** Next.js 15 + React 19
- **State:** Zustand + zundo (undo/redo)
- **Canvas:** react-konva for transforms
- **Auth:** NextAuth v5
- **Database:** PostgreSQL (Supabase) + Prisma
- **Storage:** Vercel Blob
- **Styling:** Tailwind CSS + Headless UI

---

## Data Model (Simplified)

```
SourceImage
  - id, userId, url, width, height, createdAt

Cutout
  - id, userId, sourceImageId
  - path: Point[]  (normalized 0-1)
  - extractedUrl, thumbnailUrl
  - aspectRatio, createdAt

PlacedCutout (in-memory, on Canvas model if persisted)
  - id, cutoutId
  - transform: {x, y, scale, rotation, flipX, flipY}
  - widthInches, aspectRatio
  - zIndex

Canvas
  - id, userId
  - config: {widthInches, heightInches, meshCount, bgPattern, bgColor1, bgColor2}
  - cutouts: PlacedCutout[]
  - status, manufacturerUrl, threads, stitchability
```

---

## UI Components

### Modal: Clip Image (Headless UI Dialog)
- Full-screen modal for lasso drawing
- Shows source image with lasso overlay
- Bottom buttons: "Continue Clipping" | "Go to Canvas"
- Undo button for current drawing session

### Screen: Arrange
- Canvas preview with placed cutouts
- Konva Transformer for selection handles
- Bottom toolbar: Add, Layers, Settings, Generate
- Tap canvas background = deselect cutout

### Sheet: Settings (Bottom Sheet)
- Canvas size inputs
- Mesh count selector (10, 12, 13, 14, 18)
- Background pattern picker
- Color pickers

### Sheet: Layers (Bottom Sheet)
- Thumbnail list of placed cutouts
- Drag to reorder
- Swipe/tap to delete

---

## Processing Pipeline

1. **Composite** — Layer cutouts onto background at proper mesh scale
2. **Color Correct** — White balance, saturation adjustment
3. **Quantize** — Reduce to N colors (Wu's algorithm)
4. **DMC Map** — Map quantized colors to DMC thread palette
5. **Majority Filter** — Clean up "confetti" pixels
6. **Output** — PNG where 1 pixel = 1 stitch

---

## Sizing Rules

- Each cutout has `widthInches` (physical size at scale=1)
- Canvas has `meshCount` (stitches per inch)
- **Formula:** `stitches = widthInches × meshCount × scale`
- Frontend and backend use same formula for preview consistency

---

## Deferred Features (NOT in MVP)

- ❌ AI subject detection (Gemini)
- ❌ Vision-guided color palette
- ❌ Smart edge refinement
- ❌ Templates/presets
- ❌ Social sharing
- ❌ Print ordering integration

---

## File Structure

```
src/
├── app/
│   ├── editor/page.tsx       # Main editor route
│   └── login/page.tsx
├── components/
│   └── editor/
│       ├── UploadStep.tsx
│       ├── ClipModal.tsx      # NEW: Headless UI modal
│       ├── LassoCanvas.tsx
│       ├── ArrangeStep.tsx
│       ├── ArrangeCanvas.tsx
│       ├── PreviewStep.tsx
│       ├── SettingsSheet.tsx
│       ├── LayerPanel.tsx
│       └── CutoutLibrary.tsx
├── stores/
│   └── editor-store.ts
├── actions/
│   ├── generateCanvas.ts
│   ├── cutouts.ts
│   └── sourceImages.ts
└── lib/
    ├── editor/
    │   ├── geometry.ts
    │   └── extraction.ts
    └── colors/
        └── (processing pipeline)
```

---

## MVP Roadmap

### Phase 1: Core Clip & Arrange ✅ (Mostly Complete)
- [x] Upload (camera/library)
- [x] Lasso drawing tool
- [x] Arrange with transforms
- [x] Settings sheet
- [x] Canvas generation pipeline
- [ ] **Clip modal with "Continue Clipping" / "Go to Canvas"**
- [ ] **Deselect cutout when tapping canvas background**

### Phase 2: Polish & Persist
- [ ] Save cutouts to database on creation
- [ ] Cutout library (browse saved cutouts)
- [ ] Layer panel drag-to-reorder
- [ ] Undo/redo in lasso modal

### Phase 3: Output & Download
- [ ] Generate with progress indicator
- [ ] Thread list display
- [ ] Download button (PNG)
- [ ] Stitch count / dimensions display

---

**See also:**
- [TECHNICAL-SPECIFICATION.md](./TECHNICAL-SPECIFICATION.md) — Full technical details, data models, APIs
- [LASSO-EDITOR-SPEC.md](./LASSO-EDITOR-SPEC.md) — Detailed lasso tool implementation
- [MOBILE-FIRST-AUDIT.md](./MOBILE-FIRST-AUDIT.md) — Mobile UX requirements
- [UI-COMPETITOR-RESEARCH.md](./UI-COMPETITOR-RESEARCH.md) — Competitor analysis
