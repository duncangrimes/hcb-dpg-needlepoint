# HCB Needlepoint Canvas Generator

## Technical Specification Document

**Version:** 1.0  
**Date:** February 4, 2026  
**Authors:** Duncan Grimes, Duncbot  
**Status:** Reference — See [MVP.md](./MVP.md) for current development status  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Mission & Vision](#2-mission--vision)
3. [Business Context](#3-business-context)
4. [User Research & Personas](#4-user-research--personas)
5. [Product Requirements](#5-product-requirements)
6. [User Experience](#6-user-experience)
7. [Technical Architecture](#7-technical-architecture)
8. [Data Models](#8-data-models)
9. [API Specification](#9-api-specification)
10. [Implementation Phases](#10-implementation-phases)
11. [Tech Stack](#11-tech-stack)
12. [Infrastructure & Deployment](#12-infrastructure--deployment)
13. [Security & Privacy](#13-security--privacy)
14. [Performance Requirements](#14-performance-requirements)
15. [Testing Strategy](#15-testing-strategy)
16. [Success Metrics](#16-success-metrics)
17. [Open Questions](#17-open-questions)
18. [Appendices](#18-appendices)

---

## 1. Executive Summary

HCB Needlepoint is a web application that transforms personal photographs into custom needlepoint canvas designs. Unlike existing solutions that apply blanket algorithms to entire images, our platform gives users precise control over what elements appear in their canvas through an intuitive lasso-based selection tool.

**Key Differentiators:**
- User-driven selection (not AI-guessed)
- Mobile-first design
- Multi-element composition from multiple source images
- Professional-grade output optimized for stitchability
- DMC thread color mapping

---

## 2. Mission & Vision

### 2.1 Mission Statement

> Empower anyone to transform their cherished photographs into beautiful, stitchable needlepoint canvases — with complete creative control and professional-quality output.

### 2.2 Vision

Create the definitive platform for custom needlepoint canvas generation that:
- Democratizes custom needlepoint (traditionally expensive, $200-500+ for custom designs)
- Preserves what matters to users (pets, family, memories)
- Produces output that professional stitchers actually want to work with
- Builds a community around personalized needlecraft

### 2.3 Core Values

| Value | Meaning |
|-------|---------|
| **User Control** | Users decide what's important, not algorithms |
| **Quality First** | Output must be stitchable and beautiful |
| **Accessibility** | Works on any device, intuitive for non-technical users |
| **Transparency** | Clear pricing, predictable results |

---

## 3. Business Context

### 3.1 Market Opportunity

The needlepoint/cross-stitch market is valued at $1.2B+ globally, with growing demand for personalized designs. Current solutions fall into two categories:

**Manual Custom Design ($200-500+)**
- Professional designers create custom patterns
- High quality but expensive and slow (weeks)
- Limited scalability

**Automated Conversion Tools ($0-50)**
- Upload photo → instant pattern
- Poor quality: too many colors, bad stitchability, photorealistic (not needlepoint aesthetic)
- No user control over what's included

**Our Position:** Premium automated tool with user control, priced between these extremes ($20-80 per canvas).

### 3.2 Competitive Landscape

| Competitor | Approach | Weakness |
|------------|----------|----------|
| NeedlePaint | AI conversion | Can't handle "busy" photos, no user control |
| Pic2Pat | Automated | Too many colors, poor stitchability |
| StitchFiddle | Manual grid | Time-consuming, requires skill |
| Etsy Custom | Human designers | Expensive, slow |

### 3.3 Revenue Model

- **Per-canvas pricing:** $X per generated canvas (tiered by size/complexity)
- **Subscription:** Unlimited generations for $Y/month (power users)
- **Upsell:** Physical canvas/thread kit fulfillment (future)

---

## 4. User Research & Personas

### 4.1 Primary Persona: Sarah (The Gift Giver)

**Demographics:** Female, 35-55, suburban, moderate disposable income  
**Behavior:** Creates personalized gifts for family/friends, active on Pinterest/Etsy  
**Goals:** Turn pet photo into needlepoint for mother's birthday  
**Pain Points:** 
- Existing tools produce ugly results
- Custom designers are too expensive
- Doesn't know what makes "good" needlepoint

**Quote:** *"I want my mom's face to light up when she sees her dog on a canvas I made myself."*

### 4.2 Secondary Persona: Martha (The Stitcher)

**Demographics:** Female, 50-70, experienced needlepointer  
**Behavior:** Completes 4-6 projects per year, buys from local needlework shops  
**Goals:** Find unique designs that aren't in catalogs  
**Pain Points:**
- Tired of generic commercial patterns
- Wants personal photos but can't design patterns herself
- Cares deeply about color accuracy and stitchability

**Quote:** *"If the colors don't match DMC threads properly, it's useless to me."*

### 4.3 Tertiary Persona: Mike (The First-Timer)

**Demographics:** Male, 28-40, tech-comfortable, buying gift for partner  
**Behavior:** Never done needlepoint, wants to give unique handmade gift  
**Goals:** Create canvas of couple's photo, learn to stitch it  
**Pain Points:**
- Doesn't understand needlepoint terminology
- Needs guidance on difficulty/complexity
- Wants instant gratification (mobile-friendly)

**Quote:** *"I want to make something meaningful without spending months learning a craft."*

---

## 5. Product Requirements

### 5.1 Functional Requirements

#### FR-1: Image Upload
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1.1 | Support JPEG, PNG, HEIC image formats | P0 |
| FR-1.2 | Accept images up to 20MB | P0 |
| FR-1.3 | Support camera capture on mobile | P0 |
| FR-1.4 | Support drag-and-drop on desktop | P1 |
| FR-1.5 | Show upload progress indicator | P1 |

#### FR-2: Selection Tool (Lasso Editor)
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-2.1 | Draw freeform closed shapes (lasso) | P0 |
| FR-2.2 | Auto-detect shape closure | P0 |
| FR-2.3 | Support multiple selections per image | P0 |
| FR-2.4 | Delete individual selections | P0 |
| FR-2.5 | Undo/redo support | P0 |
| FR-2.6 | Touch gesture support (mobile) | P0 |
| FR-2.7 | Pinch-to-zoom on source image | P1 |
| FR-2.8 | Selection path smoothing | P1 |

#### FR-3: Transform Controls
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-3.1 | Move selections on canvas | P0 |
| FR-3.2 | Scale selections (resize) | P0 |
| FR-3.3 | Rotate selections | P0 |
| FR-3.4 | Maintain aspect ratio by default | P0 |
| FR-3.5 | Flip horizontal/vertical | P1 |
| FR-3.6 | Layer ordering (z-index) | P1 |

#### FR-4: Canvas Composition
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-4.1 | Set canvas dimensions (inches + mesh count) | P0 |
| FR-4.2 | Select background style (solid, patterns) | P0 |
| FR-4.3 | Preview stitch grid overlay | P1 |
| FR-4.4 | Real-time needlepoint preview | P2 |

#### FR-5: Multi-Image Support
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-5.1 | Import additional source images | P1 |
| FR-5.2 | Lasso from any loaded image | P1 |
| FR-5.3 | Combine elements from multiple sources | P1 |
| FR-5.4 | Selection library (save/reuse) | P2 |

#### FR-6: Processing & Output
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-6.1 | Generate manufacturer-ready image | P0 |
| FR-6.2 | Map colors to DMC thread codes | P0 |
| FR-6.3 | Generate thread shopping list | P0 |
| FR-6.4 | Download high-res canvas image | P0 |
| FR-6.5 | Show stitchability score | P1 |
| FR-6.6 | Generate printable pattern PDF | P2 |

### 5.2 Non-Functional Requirements

| Category | Requirement | Target |
|----------|-------------|--------|
| **Performance** | Time to interactive | < 3 seconds |
| **Performance** | Lasso drawing latency | < 16ms (60fps) |
| **Performance** | Canvas generation time | < 30 seconds |
| **Reliability** | Uptime | 99.5% |
| **Scalability** | Concurrent users | 1,000+ |
| **Accessibility** | WCAG compliance | Level AA |
| **Mobile** | Minimum viewport | 320px width |
| **Browser** | Support | Last 2 versions of major browsers |

---

## 6. User Experience

### 6.1 Design Principles

1. **Mobile-First:** Design for phone screens first, enhance for desktop
2. **Progressive Disclosure:** Show only what's needed at each step
3. **Instant Feedback:** Every action shows immediate visual response
4. **Forgiving:** Easy to undo, hard to make irreversible mistakes
5. **Guided:** Clear next steps, helpful defaults

### 6.2 User Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         LANDING PAGE                            │
│                                                                 │
│    "Turn Your Photos Into Custom Needlepoint"                  │
│                                                                 │
│              ┌─────────────────────┐                           │
│              │   📷 Take Photo     │                           │
│              └─────────────────────┘                           │
│              ┌─────────────────────┐                           │
│              │   🖼️ Choose Photo   │                           │
│              └─────────────────────┘                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      CUTOUT SCREEN                              │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                                                           │ │
│  │                    [Source Photo]                         │ │
│  │                                                           │ │
│  │      Draw around what you want to include                 │ │
│  │                                                           │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌─────┐ ┌─────┐ ┌─────┐                    ┌────────────────┐ │
│  │ ✏️  │ │ ↩️  │ │ ↪️  │                    │  Continue →    │ │
│  │Lasso│ │Undo │ │Redo │                    └────────────────┘ │
│  └─────┘ └─────┘ └─────┘                                       │
│                                                                 │
│  Cutouts: [🐕 Dog] [🍷 Wine Glass]  [+ Add More]              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      CANVAS SCREEN                              │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │              ╔═══════════════════════╗                    │ │
│  │              ║                       ║                    │ │
│  │              ║    [Canvas Preview]   ║                    │ │
│  │              ║   ┌────┐    ┌──┐     ║                    │ │
│  │              ║   │ 🐕 │    │🍷│     ║                    │ │
│  │              ║   └────┘    └──┘     ║                    │ │
│  │              ║                       ║                    │ │
│  │              ╚═══════════════════════╝                    │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Canvas: [8" ▼] × [10" ▼]  Mesh: [13 ▼]  BG: [Gingham ▼]      │
│                                                                 │
│  ┌─────────────────┐                    ┌────────────────────┐ │
│  │  ← Back         │                    │  Generate Canvas → │ │
│  └─────────────────┘                    └────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       RESULT SCREEN                             │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                                                           │ │
│  │                  [Final Canvas Image]                     │ │
│  │                                                           │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Stitchability Score: ████████░░ 8.2 (Excellent)              │
│  Colors: 9 DMC threads                                         │
│                                                                 │
│  Thread List:                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ■ DMC 945  Tawny (23%)                                  │   │
│  │ ■ DMC 349  Coral Dark (18%)                             │   │
│  │ ■ DMC 3031 Mocha Brown (12%)                            │   │
│  │ ...                                                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │ Download PNG │  │ Download PDF │  │ Order Physical Kit → │ │
│  └──────────────┘  └──────────────┘  └──────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 6.3 Mobile Interaction Patterns

| Action | Gesture |
|--------|---------|
| Start lasso | Touch and drag |
| Complete lasso | Lift finger near start point |
| Cancel lasso | Lift finger far from start point |
| Pan image | Two-finger drag |
| Zoom image | Pinch |
| Select element | Tap |
| Move element | Drag selected element |
| Resize element | Drag corner handles |
| Rotate element | Drag rotation handle |
| Delete element | Select → tap delete button |
| Undo | Swipe left with two fingers (or button) |

### 6.4 Responsive Breakpoints

| Breakpoint | Width | Layout |
|------------|-------|--------|
| Mobile S | 320px | Single column, minimal UI |
| Mobile L | 428px | Single column, full toolbar |
| Tablet | 768px | Canvas centered, side panels appear |
| Desktop | 1024px | Full layout with persistent panels |

---

## 7. Technical Architecture

### 7.1 System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                           CLIENT                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Next.js App (React)                   │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │   │
│  │  │   Pages/    │  │ Components/ │  │     Stores/     │  │   │
│  │  │   Routes    │  │   Editor    │  │    (Zustand)    │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘  │   │
│  │                         │                                │   │
│  │              ┌──────────┴──────────┐                    │   │
│  │              │    react-konva      │                    │   │
│  │              │  (Canvas Rendering) │                    │   │
│  │              └─────────────────────┘                    │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                           SERVER                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 Next.js API Routes                       │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │   │
│  │  │  /upload    │  │  /process   │  │    /projects    │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│              ┌───────────────┼───────────────┐                 │
│              ▼               ▼               ▼                 │
│  ┌─────────────────┐ ┌─────────────┐ ┌─────────────────────┐  │
│  │  Vercel Blob    │ │  Prisma +   │ │  Processing Queue   │  │
│  │  (Image Store)  │ │  PostgreSQL │ │  (if needed)        │  │
│  └─────────────────┘ └─────────────┘ └─────────────────────┘  │
│                                              │                  │
│                              ┌───────────────┘                 │
│                              ▼                                  │
│              ┌─────────────────────────────────┐               │
│              │     Image Processing Pipeline   │               │
│              │  ┌──────┐ ┌──────┐ ┌─────────┐ │               │
│              │  │Sharp │ │Wu's  │ │DMC Map  │ │               │
│              │  │Resize│ │Quant │ │Thread   │ │               │
│              │  └──────┘ └──────┘ └─────────┘ │               │
│              └─────────────────────────────────┘               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ (Optional)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      EXTERNAL SERVICES                          │
│  ┌─────────────────┐  ┌─────────────────┐                      │
│  │  Gemini API     │  │  Auth Provider  │                      │
│  │  (Vision, opt)  │  │  (NextAuth)     │                      │
│  └─────────────────┘  └─────────────────┘                      │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 Frontend Architecture

```
src/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Landing page
│   ├── editor/
│   │   └── page.tsx              # Main editor page
│   ├── result/
│   │   └── [canvasId]/page.tsx   # Result view
│   └── api/
│       ├── upload/route.ts       # Image upload
│       ├── process/route.ts      # Canvas generation
│       └── projects/route.ts     # Project CRUD
│
├── components/
│   ├── ui/                       # Shadcn/ui components
│   ├── editor/
│   │   ├── EditorProvider.tsx    # Context + store provider
│   │   ├── EditorCanvas.tsx      # Main Konva canvas
│   │   ├── LassoTool.tsx         # Lasso drawing logic
│   │   ├── SelectionLayer.tsx    # Rendered selection
│   │   ├── TransformControls.tsx # Resize/rotate handles
│   │   ├── Toolbar.tsx           # Tool buttons
│   │   ├── LayerPanel.tsx        # Selection list
│   │   ├── CanvasSettings.tsx    # Dimensions, background
│   │   └── PreviewOverlay.tsx    # Stitch grid preview
│   └── result/
│       ├── CanvasViewer.tsx      # Final canvas display
│       ├── ThreadList.tsx        # DMC thread breakdown
│       └── DownloadButtons.tsx   # Export options
│
├── stores/
│   ├── editorStore.ts            # Main editor state
│   ├── selectionStore.ts         # Selection-specific state
│   └── historyMiddleware.ts      # Undo/redo logic
│
├── hooks/
│   ├── useLasso.ts               # Lasso drawing hook
│   ├── useTransform.ts           # Transform gesture hook
│   ├── useCanvasExport.ts        # Export canvas to image
│   └── useTouchGestures.ts       # Mobile gesture handling
│
├── lib/
│   ├── geometry/
│   │   ├── pointInPolygon.ts     # Hit detection
│   │   ├── pathSmoothing.ts      # Bezier smoothing
│   │   └── boundingBox.ts        # Selection bounds
│   ├── extraction/
│   │   ├── extractPixels.ts      # Get pixels in lasso
│   │   └── edgeRefinement.ts     # Smooth selection edges
│   └── canvas/
│       └── (existing pipeline)
│
└── types/
    ├── editor.ts                 # Editor type definitions
    └── canvas.ts                 # Canvas/processing types
```

### 7.3 State Management (Zustand)

```typescript
// stores/editorStore.ts
import { create } from 'zustand';
import { temporal } from 'zundo';
import { immer } from 'zustand/middleware/immer';

interface EditorState {
  // Source images
  sourceImages: SourceImage[];
  activeSourceId: string | null;
  
  // Cutouts (lasso'd regions)
  cutouts: Cutout[];
  placedCutouts: PlacedCutout[];  // Cutouts arranged on canvas
  activeCutoutId: string | null;
  
  // Drawing state
  tool: 'lasso' | 'select' | 'pan';
  isDrawing: boolean;
  currentPath: Point[];
  
  // Canvas config
  canvasConfig: CanvasConfig;
  
  // Actions
  addSourceImage: (image: SourceImage) => void;
  setActiveSource: (id: string) => void;
  startDrawing: (point: Point) => void;
  continueDrawing: (point: Point) => void;
  finishDrawing: () => void;
  cancelDrawing: () => void;
  selectCutout: (id: string | null) => void;
  updateCutoutTransform: (id: string, transform: Partial<Transform>) => void;
  deleteCutout: (id: string) => void;
  setCanvasConfig: (config: Partial<CanvasConfig>) => void;
}

export const useEditorStore = create<EditorState>()(
  temporal(
    immer((set, get) => ({
      // Initial state
      sourceImages: [],
      activeSourceId: null,
      cutouts: [],
      placedCutouts: [],
      activeCutoutId: null,
      tool: 'lasso',
      isDrawing: false,
      currentPath: [],
      canvasConfig: {
        widthInches: 8,
        heightInches: 10,
        meshCount: 13,
        background: { pattern: 'solid', color: '#FFFFFF' },
      },
      
      // Actions
      addSourceImage: (image) => set((state) => {
        state.sourceImages.push(image);
        state.activeSourceId = image.id;
      }),
      
      startDrawing: (point) => set((state) => {
        state.isDrawing = true;
        state.currentPath = [point];
      }),
      
      continueDrawing: (point) => set((state) => {
        if (state.isDrawing) {
          state.currentPath.push(point);
        }
      }),
      
      finishDrawing: () => set((state) => {
        if (state.currentPath.length > 2) {
          const newCutout: Cutout = {
            id: crypto.randomUUID(),
            sourceImageId: state.activeSourceId!,
            path: [...state.currentPath],
          };
          state.cutouts.push(newCutout);
          
          // Auto-place on canvas
          state.placedCutouts.push({
            cutoutId: newCutout.id,
            cutout: newCutout,
            transform: { x: 0, y: 0, scale: 1, rotation: 0, flipX: false, flipY: false },
            zIndex: state.placedCutouts.length,
          });
        }
        state.isDrawing = false;
        state.currentPath = [];
      }),
      
      // ... more actions
    })),
    { limit: 50 } // Undo history limit
  )
);

// Hook for undo/redo
export const useEditorHistory = () => {
  const { undo, redo, pastStates, futureStates } = useEditorStore.temporal.getState();
  return {
    undo,
    redo,
    canUndo: pastStates.length > 0,
    canRedo: futureStates.length > 0,
  };
};
```

### 7.4 Canvas Rendering (react-konva)

```typescript
// components/editor/EditorCanvas.tsx
import { Stage, Layer, Line, Image, Transformer } from 'react-konva';
import { useEditorStore } from '@/stores/editorStore';
import { useLasso } from '@/hooks/useLasso';

export function EditorCanvas() {
  const { 
    sourceImages, 
    activeSourceId, 
    selections, 
    activeSelectionId,
    currentPath,
    isDrawing,
  } = useEditorStore();
  
  const { handleMouseDown, handleMouseMove, handleMouseUp } = useLasso();
  const activeSource = sourceImages.find(s => s.id === activeSourceId);
  
  return (
    <Stage
      width={window.innerWidth}
      height={window.innerHeight}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchStart={handleMouseDown}
      onTouchMove={handleMouseMove}
      onTouchEnd={handleMouseUp}
    >
      {/* Source image layer */}
      <Layer>
        {activeSource && (
          <Image image={activeSource.element} />
        )}
      </Layer>
      
      {/* Selections layer */}
      <Layer>
        {selections.map((sel) => (
          <SelectionShape
            key={sel.id}
            selection={sel}
            isActive={sel.id === activeSelectionId}
          />
        ))}
      </Layer>
      
      {/* Drawing layer */}
      <Layer>
        {isDrawing && currentPath.length > 0 && (
          <Line
            points={currentPath.flatMap(p => [p.x, p.y])}
            stroke="#3B82F6"
            strokeWidth={2}
            dash={[5, 5]}
            closed={false}
          />
        )}
      </Layer>
    </Stage>
  );
}
```

---

## 8. Data Models

### 8.1 Core Concepts

| Concept | Description |
|---------|-------------|
| **Cutout** | A lasso'd region from a source photo |
| **Canvas** | The final needlepoint output with arranged cutouts |

No projects — keep it simple. Users create cutouts, arrange them, generate canvases.

### 8.2 Database Schema (Prisma)

```prisma
// prisma/schema.prisma

model User {
  id        String    @id @default(cuid())
  email     String    @unique
  name      String?
  cutouts   Cutout[]
  canvases  Canvas[]
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}

model SourceImage {
  id        String    @id @default(cuid())
  user      User      @relation(fields: [userId], references: [id])
  userId    String
  url       String    // Vercel Blob URL
  width     Int
  height    Int
  cutouts   Cutout[]
  createdAt DateTime  @default(now())
}

model Cutout {
  id            String      @id @default(cuid())
  user          User        @relation(fields: [userId], references: [id])
  userId        String
  sourceImage   SourceImage @relation(fields: [sourceImageId], references: [id])
  sourceImageId String
  path          Json        // Array of {x, y} points (lasso path)
  name          String?     // Optional user label ("dog", "wine glass")
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
  
  // Cutouts can be reused across multiple canvases
  canvasCutouts CanvasCutout[]
}

// Join table: a cutout placed on a canvas with transform
model CanvasCutout {
  id        String   @id @default(cuid())
  canvas    Canvas   @relation(fields: [canvasId], references: [id])
  canvasId  String
  cutout    Cutout   @relation(fields: [cutoutId], references: [id])
  cutoutId  String
  transform Json     // {x, y, scale, rotation, flipX, flipY}
  zIndex    Int
  
  @@unique([canvasId, cutoutId])
}

model Canvas {
  id              String         @id @default(cuid())
  user            User           @relation(fields: [userId], references: [id])
  userId          String
  name            String?
  config          Json           // {widthInches, heightInches, meshCount, background}
  cutouts         CanvasCutout[]
  
  // Generated output (null until processed)
  manufacturerUrl String?
  threads         Json?          // Array of thread colors
  stitchability   Float?
  widthStitches   Int?
  heightStitches  Int?
  
  status          CanvasStatus   @default(DRAFT)
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
}

enum CanvasStatus {
  DRAFT       // Being edited
  PROCESSING  // Generating needlepoint
  COMPLETE    // Ready to download
  FAILED      // Processing error
}
```

### 8.3 TypeScript Types

```typescript
// types/editor.ts

export interface Point {
  x: number;
  y: number;
}

export interface Transform {
  x: number;
  y: number;
  scale: number;
  rotation: number;  // degrees
  flipX: boolean;
  flipY: boolean;
}

// A lasso'd region from a source photo
export interface Cutout {
  id: string;
  sourceImageId: string;
  path: Point[];          // Lasso vertices
  name?: string;          // User label
}

// A cutout placed on a canvas with positioning
export interface PlacedCutout {
  cutoutId: string;
  cutout: Cutout;
  transform: Transform;
  zIndex: number;
}

export interface SourceImage {
  id: string;
  url: string;
  width: number;
  height: number;
  element?: HTMLImageElement;  // Loaded image element (client-side)
}

export interface CanvasConfig {
  widthInches: number;
  heightInches: number;
  meshCount: number;
  background: BackgroundConfig;
}

export interface BackgroundConfig {
  pattern: 'solid' | 'gingham' | 'stripes' | 'checkerboard';
  color: string;
  color2?: string;  // For patterns
  patternSize?: number;
}

export interface Thread {
  floss: string;    // DMC code
  name: string;
  hex: string;
  r: number;
  g: number;
  b: number;
  stitches?: number;
  percentage?: number;
}

// The final needlepoint canvas
export interface Canvas {
  id: string;
  name?: string;
  config: CanvasConfig;
  cutouts: PlacedCutout[];
  
  // Generated output (null until processed)
  manufacturerUrl?: string;
  threads?: Thread[];
  stitchabilityScore?: number;
  dimensions?: {
    widthInStitches: number;
    heightInStitches: number;
  };
  status: 'draft' | 'processing' | 'complete' | 'failed';
}
```

---

## 9. API Specification

### 9.1 Endpoints

#### POST /api/upload
Upload a source image.

**Request:**
```typescript
// FormData
{
  file: File,           // Image file
}
```

**Response:**
```typescript
{
  success: boolean,
  sourceImage: {
    id: string,
    url: string,
    width: number,
    height: number,
  },
}
```

#### POST /api/cutouts
Save a cutout (lasso'd region).

**Request:**
```typescript
{
  sourceImageId: string,
  path: Point[],        // Lasso vertices
  name?: string,        // Optional label
}
```

**Response:**
```typescript
{
  success: boolean,
  cutout: {
    id: string,
    sourceImageId: string,
    path: Point[],
    name?: string,
  },
}
```

#### POST /api/canvases
Create a new canvas (draft).

**Request:**
```typescript
{
  name?: string,
  config: CanvasConfig,
  cutouts: Array<{
    cutoutId: string,
    transform: Transform,
    zIndex: number,
  }>,
}
```

**Response:**
```typescript
{
  success: boolean,
  canvas: {
    id: string,
    status: 'draft',
  },
}
```

#### POST /api/canvases/[id]/generate
Process a canvas into needlepoint.

**Response:**
```typescript
{
  success: boolean,
  canvas: {
    id: string,
    manufacturerUrl: string,
    threads: Thread[],
    stitchabilityScore: number,
    dimensions: {
      widthInStitches: number,
      heightInStitches: number,
    },
    status: 'complete',
  },
}
```

#### GET /api/canvases
List user's canvases.

#### GET /api/canvases/[id]
Get canvas details.

#### GET /api/cutouts
List user's saved cutouts (for reuse).

---

## 10. Implementation Phases

### Phase 0: Foundation (1 week)
**Goal:** Project setup and infrastructure

- [ ] Set up Zustand store with basic structure
- [ ] Install and configure react-konva
- [ ] Create editor page route
- [ ] Set up responsive layout shell
- [ ] Add Prisma models for new entities
- [ ] Create basic API routes

**Deliverable:** Empty editor page with store and canvas rendering

### Phase 1: Basic Lasso (2 weeks)
**Goal:** Draw one lasso, see it processed

- [ ] Implement lasso drawing (mouse + touch)
- [ ] Path closing detection
- [ ] Visual feedback while drawing
- [ ] Extract pixels within lasso path
- [ ] Send selection to processing pipeline
- [ ] Display result

**Deliverable:** User can draw around subject → get needlepoint output

### Phase 2: Multi-Selection (1.5 weeks)
**Goal:** Multiple selections with management

- [ ] Support multiple lassos
- [ ] Selection list UI
- [ ] Select/deselect interactions
- [ ] Delete selection
- [ ] Undo/redo (Zustand temporal)

**Deliverable:** User can create multiple selections and manage them

### Phase 3: Transform Controls (1.5 weeks)
**Goal:** Move, scale, rotate selections

- [ ] Selection bounding box
- [ ] Move (drag) interaction
- [ ] Scale handles (corners)
- [ ] Rotation handle
- [ ] Aspect ratio lock toggle
- [ ] Touch gesture support for transforms

**Deliverable:** User can arrange selections on canvas

### Phase 4: Composition & Background (1 week)
**Goal:** Full canvas composition controls

- [ ] Canvas dimension inputs
- [ ] Mesh count selector
- [ ] Background picker (solid, patterns)
- [ ] Stitch grid preview overlay
- [ ] Layer ordering (z-index)

**Deliverable:** Complete composition controls

### Phase 5: Multi-Image Import (1.5 weeks)
**Goal:** Combine elements from multiple photos

- [ ] Add additional source images
- [ ] Source image switcher
- [ ] Lasso from any source
- [ ] Source image thumbnails

**Deliverable:** Combine dog from photo A with background element from photo B

### Phase 6: Polish & Edge Quality (1 week)
**Goal:** Production-ready quality

- [ ] Edge feathering algorithm
- [ ] Path smoothing (Bezier)
- [ ] Performance optimization (large images)
- [ ] Error handling and edge cases
- [ ] Loading states and feedback

**Deliverable:** Professional-quality output

### Phase 7: Mobile Optimization (1 week)
**Goal:** Excellent mobile experience

- [ ] Touch gesture refinement
- [ ] Mobile-specific UI adjustments
- [ ] Performance on lower-end devices
- [ ] PWA capabilities (offline, install)

**Deliverable:** Full-featured mobile experience

### Phase 8: Persistence & Accounts (1 week)
**Goal:** Save work, user accounts

- [ ] Save compositions to database
- [ ] Load previous work
- [ ] User authentication (NextAuth)
- [ ] Project organization

**Deliverable:** Users can save and resume work

---

## 11. Tech Stack

### 11.1 Core Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Framework** | Next.js 14 (App Router) | Existing stack, SSR, API routes |
| **Language** | TypeScript | Type safety, DX |
| **Styling** | Tailwind CSS | Existing stack, rapid development |
| **UI Components** | shadcn/ui | Existing stack, accessible |
| **Database** | PostgreSQL | Existing (via Prisma) |
| **ORM** | Prisma | Existing stack |
| **File Storage** | Vercel Blob | Existing stack |
| **Hosting** | Vercel | Existing stack |

### 11.2 New Dependencies

| Package | Purpose | Bundle Size |
|---------|---------|-------------|
| **zustand** | State management | ~1.5kb |
| **zundo** | Undo/redo middleware | ~1kb |
| **immer** | Immutable updates | ~5kb |
| **react-konva** | Canvas rendering | ~45kb |
| **konva** | Canvas library | ~140kb |
| **use-gesture** | Touch gestures | ~12kb |

### 11.3 Existing Dependencies (Relevant)

- `sharp` — Server-side image processing
- `culori` — Color space conversions
- `@google/genai` — Gemini API (optional vision features)

### 11.4 Development Tools

- ESLint + Prettier — Code quality
- Vitest — Unit testing
- Playwright — E2E testing
- Storybook — Component development (optional)

---

## 12. Infrastructure & Deployment

### 12.1 Environments

| Environment | URL | Purpose |
|-------------|-----|---------|
| Development | localhost:3000 | Local development |
| Preview | *.vercel.app | PR previews |
| Production | hcbneedlepoint.com | Live site |

### 12.2 Environment Variables

```bash
# Database
DATABASE_URL=postgresql://...

# Auth
NEXTAUTH_SECRET=...
NEXTAUTH_URL=...

# Storage
BLOB_READ_WRITE_TOKEN=...

# External APIs
GEMINI_API_KEY=...  # Optional

# Feature Flags
ENABLE_VISION_PALETTE=false
ENABLE_MULTI_IMAGE=false
```

### 12.3 CI/CD Pipeline

```yaml
# Vercel handles most of this automatically
# Additional checks in GitHub Actions:

on: [push, pull_request]
jobs:
  quality:
    - npm run lint
    - npm run type-check
    - npm run test
  
  preview:
    - Vercel auto-deploys PR previews
  
  production:
    - Merge to main → auto-deploy to production
```

---

## 13. Security & Privacy

### 13.1 Data Handling

| Data Type | Storage | Retention | Access |
|-----------|---------|-----------|--------|
| Source images | Vercel Blob | 90 days or until deleted | Owner only |
| Processed canvases | Vercel Blob | Permanent | Owner only |
| Compositions | PostgreSQL | Permanent | Owner only |
| User data | PostgreSQL | Until account deletion | Owner only |

### 13.2 Security Measures

- **Authentication:** NextAuth with secure session handling
- **Authorization:** All API routes check user ownership
- **Input validation:** Zod schemas on all inputs
- **File uploads:** Type checking, size limits, virus scanning (future)
- **HTTPS:** Enforced on all environments
- **CORS:** Restricted to same-origin

### 13.3 Privacy Considerations

- Images are user's personal photos — treat as sensitive
- No sharing without explicit consent
- Clear data deletion process
- GDPR/CCPA compliance (future)

---

## 14. Performance Requirements

### 14.1 Client-Side

| Metric | Target | Measurement |
|--------|--------|-------------|
| First Contentful Paint | < 1.5s | Lighthouse |
| Time to Interactive | < 3s | Lighthouse |
| Lasso drawing FPS | 60fps | Chrome DevTools |
| Touch response latency | < 50ms | Manual testing |
| Memory usage | < 200MB | Chrome DevTools |

### 14.2 Server-Side

| Metric | Target | Measurement |
|--------|--------|-------------|
| Image upload | < 5s for 10MB | API timing |
| Canvas processing | < 30s | API timing |
| API response (reads) | < 200ms | API timing |

### 14.3 Optimization Strategies

- **Image handling:** Work with downscaled preview, process full-res on submit
- **Canvas rendering:** Use layers, minimize redraws
- **State updates:** Batch updates, use immer for efficient immutability
- **Code splitting:** Lazy load editor components
- **Caching:** Cache processed canvases, thread palette

---

## 15. Testing Strategy

### 15.1 Unit Tests (Vitest)

- Geometry functions (point-in-polygon, path smoothing)
- State management (store actions, selectors)
- Utility functions

### 15.2 Integration Tests

- API routes (upload, process)
- Database operations
- Image processing pipeline

### 15.3 E2E Tests (Playwright)

- Complete user flow: upload → lasso → arrange → generate
- Mobile touch interactions
- Error handling scenarios

### 15.4 Visual Regression (optional)

- Canvas rendering consistency
- UI component snapshots

---

## 16. Success Metrics

### 16.1 Product Metrics

| Metric | Definition | Target |
|--------|------------|--------|
| Completion rate | Users who finish a canvas / users who start | > 60% |
| Time to first canvas | Time from landing to first generated canvas | < 5 min |
| Return rate | Users who create 2+ canvases | > 30% |
| NPS | Net Promoter Score | > 50 |

### 16.2 Technical Metrics

| Metric | Definition | Target |
|--------|------------|--------|
| Error rate | Failed processing / total attempts | < 2% |
| P95 latency | 95th percentile processing time | < 45s |
| Uptime | Availability | > 99.5% |
| Mobile usage | % of sessions on mobile | Track (expect > 50%) |

### 16.3 Business Metrics

| Metric | Definition | Target (Year 1) |
|--------|------------|-----------------|
| Monthly Active Users | Unique users per month | 1,000 |
| Canvases generated | Total per month | 500 |
| Conversion rate | Visitors → paid canvas | 5% |
| Revenue | Monthly recurring | $2,500 |

---

## 17. Open Questions

### 17.1 Product Questions

1. **Pricing model:** Per-canvas or subscription? What price points?

2. **Free tier:** How many free canvases before requiring payment?

3. **Physical fulfillment:** Partner with manufacturer for canvas/thread kits?

4. **Community features:** Gallery of user creations? Templates?

5. **Guided mode:** Auto-suggest selections using AI for users who don't want to draw?

### 17.2 Technical Questions

1. **Edge refinement:** Best algorithm for smoothing lasso edges?
   - Options: Gaussian blur alpha, morphological operations, AI edge detection (SAM)

2. **Large image handling:** How to handle 20MB+ images on mobile?
   - Options: Server-side resize before sending, progressive loading, WebWorker processing

3. **Offline support:** Should compositions be saveable offline?
   - Implications for PWA, localStorage vs IndexedDB

4. **Real-time preview:** Is real-time needlepoint preview feasible?
   - Would need client-side quantization, significant perf challenge

5. **Canvas library:** Is react-konva the right choice, or should we evaluate fabric.js or raw Canvas API?

6. **State persistence:** Auto-save frequency? Conflict resolution for multi-device?

### 17.3 Business Questions

1. **Launch market:** US-only initially, or international?

2. **SEO strategy:** Content marketing around needlepoint tutorials?

3. **Partnerships:** Needlework shops, craft bloggers, Etsy sellers?

4. **Intellectual property:** Terms of service for generated content ownership?

---

## 18. Appendices

### Appendix A: Competitive Analysis Details

*(See research/phase4-5-technical-competitive.md)*

### Appendix B: User Interview Notes

*(To be added after user research)*

### Appendix C: DMC Thread Color Reference

*(See src/data/threadColors.json — 454 colors)*

### Appendix D: Stitchability Score Algorithm

The stitchability score measures how easy a pattern is to stitch:

```
Score = Average Horizontal Run Length

Where:
- Run = consecutive pixels of same color in a row
- Higher score = longer runs = fewer thread changes = easier to stitch

Interpretation:
- > 7: Excellent
- 5-7: Good  
- 3-5: Fair
- < 3: Poor (consider reducing colors)
```

### Appendix E: Glossary

| Term | Definition |
|------|------------|
| **Canvas** | The final needlepoint design with arranged cutouts |
| **Cutout** | A lasso'd region from a source photo |
| **DMC** | Brand of embroidery thread, industry standard |
| **Lasso** | Freeform drawing tool to create cutouts |
| **Manufacturer image** | 1 pixel = 1 stitch output image |
| **Mesh count** | Stitches per inch (common: 10, 13, 18) |
| **Placed cutout** | A cutout positioned on a canvas with transform |
| **Stitchability** | Ease of stitching a pattern (longer color runs = better) |

---

*Document version 1.0 — Last updated February 4, 2026*
