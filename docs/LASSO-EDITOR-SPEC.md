# Lasso Editor Feature Specification

> **Status:** Implemented — See [MVP.md](./MVP.md) for current state

## Vision

Give users **complete control** over what appears in their needlepoint canvas. Instead of relying on AI to guess what's important, users draw selections around exactly what they want.

### Core Concept
1. User uploads photo
2. User draws lasso selection(s) around desired elements
3. User arranges/transforms selections on canvas
4. (Optional) Import snippets from other photos
5. System processes selections into needlepoint

---

## Key Features

### 1. Lasso Selection Tool
- Click-and-drag to draw freeform closed shape
- Auto-close: detect when user returns near starting point
- Visual feedback: dashed line while drawing, solid when complete
- Multiple selections allowed (independent blobs)
- Each selection is a separate "layer"

### 2. Selection Management
- Click to select/deselect a lasso
- Delete selected lasso
- Undo/redo support
- Visual distinction between active and inactive selections

### 3. Transform Controls (per selection)
- **Move**: drag to reposition
- **Scale**: corner handles to resize (maintain aspect ratio by default)
- **Rotate**: rotation handle or gesture
- **Flip**: horizontal/vertical mirror

### 4. Canvas Composition
- Background color/pattern picker
- Snap-to-grid for alignment
- Layer ordering (bring forward/send back)
- Preview mode: see how it looks as needlepoint

### 5. Cross-Image Import (Phase 2+)
- Import additional photos
- Lasso from imported photos
- Combine elements from multiple sources
- "Sticker library" of user's previous selections

---

## User Flow

```
┌─────────────────────────────────────────────────────────────┐
│  1. UPLOAD                                                  │
│  ┌─────────────┐                                           │
│  │   Photo     │  → User uploads image                      │
│  └─────────────┘                                           │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  2. SELECT (Lasso Editor)                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ┌──────┐                                           │   │
│  │  │ dog  │ ← User draws lasso around dog             │   │
│  │  └──────┘                                           │   │
│  │       ┌────┐                                        │   │
│  │       │wine│ ← User draws second lasso around glass │   │
│  │       └────┘                                        │   │
│  └─────────────────────────────────────────────────────┘   │
│  [+ Add from another photo]  [Next →]                      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  3. ARRANGE (Composition Editor)                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │         Canvas Preview                               │   │
│  │    ┌──────┐    ┌────┐                               │   │
│  │    │ dog  │    │wine│  ← Drag to position           │   │
│  │    └──────┘    └────┘    ↻ Rotate, ⤢ Scale          │   │
│  │                                                      │   │
│  │  [Background: Gingham ▼]                            │   │
│  └─────────────────────────────────────────────────────┘   │
│  [← Back]  [Preview as Needlepoint]  [Create Canvas →]     │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  4. PROCESS                                                 │
│  - Extract pixels within each lasso                         │
│  - Apply edge refinement (feather/smooth)                   │
│  - Composite onto background                                │
│  - Run needlepoint pipeline (quantize, DMC map, etc.)      │
└─────────────────────────────────────────────────────────────┘
```

---

## Technical Architecture

### Frontend Components

```
src/
├── components/
│   └── editor/
│       ├── LassoEditor.tsx        # Main editor container
│       ├── LassoCanvas.tsx        # Drawing surface (HTML Canvas)
│       ├── SelectionLayer.tsx     # Individual selection rendering
│       ├── TransformControls.tsx  # Resize/rotate handles
│       ├── Toolbar.tsx            # Tool selection, undo/redo
│       ├── LayerPanel.tsx         # List of selections
│       └── BackgroundPicker.tsx   # Background options
├── stores/
│   └── editorStore.ts             # State management
├── hooks/
│   ├── useLassoDrawing.ts         # Lasso drawing logic
│   ├── useTransform.ts            # Transform gesture handling
│   └── useEditorHistory.ts        # Undo/redo
└── lib/
    └── editor/
        ├── geometry.ts            # Point-in-polygon, path ops
        ├── extraction.ts          # Extract pixels from selection
        └── composition.ts         # Composite selections
```

### State Shape

```typescript
interface EditorState {
  // Source image
  sourceImage: {
    url: string;
    width: number;
    height: number;
    buffer?: ArrayBuffer;
  } | null;
  
  // Selections (lassos)
  selections: Selection[];
  activeSelectionId: string | null;
  
  // Canvas settings
  canvas: {
    width: number;      // in stitches
    height: number;
    meshCount: number;
    background: BackgroundConfig;
  };
  
  // Tool state
  tool: 'lasso' | 'select' | 'pan';
  isDrawing: boolean;
  currentPath: Point[];  // Points being drawn
  
  // History
  history: EditorState[];
  historyIndex: number;
}

interface Selection {
  id: string;
  sourceImageId: string;  // For multi-image support
  path: Point[];          // Lasso vertices
  transform: {
    x: number;            // Position on canvas
    y: number;
    scale: number;
    rotation: number;     // Degrees
    flipX: boolean;
    flipY: boolean;
  };
  zIndex: number;
}

interface Point {
  x: number;
  y: number;
}
```

---

## State Management Options

Given the stack (Next.js 14 + React 18):

### 1. **Zustand** ⭐ Recommended
- Minimal boilerplate, great DX
- Works seamlessly with Next.js
- Built-in middleware for history/undo
- Small bundle size (~1.5kb)
```typescript
import { create } from 'zustand';
import { temporal } from 'zundo';

const useEditorStore = create(
  temporal((set) => ({
    selections: [],
    addSelection: (sel) => set((s) => ({ 
      selections: [...s.selections, sel] 
    })),
  }))
);
```

### 2. **Jotai**
- Atomic state model (like Recoil)
- Lighter than Recoil, better TS support
- Good for derived state
- ~2kb bundle

### 3. **Recoil** (Duncan's preference)
- Powerful derived state (selectors)
- Good for complex interdependencies
- Larger bundle (~20kb)
- Some SSR quirks with Next.js

### 4. **React Context + useReducer**
- Built-in, no dependencies
- Gets complex for this use case
- Re-render optimization is manual

**Recommendation:** **Zustand** for simplicity, or **Recoil** if Duncan prefers the atom model. Both work well — Zustand is simpler, Recoil is more powerful for complex derived state.

---

## MVP Phases

### Phase 1: Basic Lasso Selection (1-2 weeks)
**Goal:** User can draw one lasso and see it processed

- [ ] Canvas component for lasso drawing
- [ ] Path closing detection
- [ ] Basic state management (Zustand/Recoil)
- [ ] Extract pixels within lasso path
- [ ] Send to existing pipeline (skip rembg)
- [ ] Output needlepoint result

**Success:** User draws around dog → gets needlepoint of just the dog

### Phase 2: Multi-Selection + Transform (1-2 weeks)
**Goal:** Multiple lassos with positioning

- [ ] Multiple selection support
- [ ] Selection list/layer panel
- [ ] Transform controls (move, scale, rotate)
- [ ] Delete selection
- [ ] Undo/redo

**Success:** User selects dog + wine glass, arranges them on canvas

### Phase 3: Composition + Background (1 week)
**Goal:** Full canvas composition before processing

- [ ] Background color/pattern picker
- [ ] Canvas size controls
- [ ] Preview mode (show stitch grid)
- [ ] Layer ordering
- [ ] Save/load compositions

**Success:** User builds complete composition, previews, then processes

### Phase 4: Cross-Image Import (1-2 weeks)
**Goal:** Combine elements from multiple photos

- [ ] Import additional images
- [ ] Switch between source images
- [ ] Lasso from any loaded image
- [ ] Selection library (save favorites)

**Success:** User combines dog from photo A with background element from photo B

### Phase 5: Polish + Edge Refinement (1 week)
**Goal:** Production-ready quality

- [ ] Edge feathering/smoothing algorithm
- [ ] Anti-aliased selection edges
- [ ] Performance optimization
- [ ] Mobile touch support
- [ ] Keyboard shortcuts

---

## Processing Pipeline (Updated)

```
User Selections
       ↓
┌─────────────────────────────────────────┐
│  1. Extract each selection              │
│     - Get pixels within lasso path      │
│     - Apply edge refinement             │
│     - Create RGBA with alpha from mask  │
└─────────────────────────────────────────┘
       ↓
┌─────────────────────────────────────────┐
│  2. Apply transforms                    │
│     - Scale to target stitch size       │
│     - Apply rotation                    │
│     - Position on canvas                │
└─────────────────────────────────────────┘
       ↓
┌─────────────────────────────────────────┐
│  3. Composite                           │
│     - Layer selections by z-index       │
│     - Apply background pattern          │
│     - Flatten to single image           │
└─────────────────────────────────────────┘
       ↓
┌─────────────────────────────────────────┐
│  4. Needlepoint processing              │
│     - Color quantization (Wu's)         │
│     - DMC thread mapping                │
│     - Majority filter                   │
│     - Generate outline                  │
│     - Final output                      │
└─────────────────────────────────────────┘
```

---

## Open Questions

1. **Mobile UX:** How does lasso work on touch? (Consider: long-press to start, drag, release to close)

2. **Edge quality:** How do we handle jagged lasso edges? (Options: feathering, bezier smoothing, AI edge refinement)

3. **Performance:** Large images + multiple selections = memory concerns. (Consider: work with downscaled preview, process full-res on submit)

4. **Persistence:** Save work-in-progress? (Consider: localStorage for drafts, server for completed)

5. **AI assist:** Optional "smart edge" that snaps to object boundaries? (Could use SAM/segment-anything for edge refinement after user draws rough lasso)

---

## Dependencies to Evaluate

- **fabric.js** — Full-featured canvas library, might be overkill
- **Konva** — React-friendly canvas lib, good for transforms
- **react-konva** — React bindings for Konva
- **paper.js** — Vector graphics, good path operations
- **Native Canvas API** — Most control, more work

**Recommendation:** Start with **react-konva** — good balance of features and React integration. Evaluate if we need paper.js for complex path operations.

---

## Next Steps

1. ✅ Document spec (this file)
2. ✅ Set up state management (Zustand)
3. ✅ Build basic LassoCanvas component
4. ✅ Implement path drawing + closing
5. ✅ Pixel extraction from lasso
6. ✅ Wire to pipeline
7. ✅ Test end-to-end

*Initial implementation complete — see [MVP.md](./MVP.md) for ongoing work.*
