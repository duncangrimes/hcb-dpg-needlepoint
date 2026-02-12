# Lasso Undo/Clear UX Design

> **Status:** Design Proposal  
> **Author:** UX Design Subagent  
> **Date:** 2026-02-12

---

## Problem Statement

Users drawing lasso selections have no recovery path if they make a mistake mid-draw. Currently:
- If they mess up during drawing → must exit photo and re-enter
- The existing "Undo" button only undoes **completed** cutouts (via zundo temporal store)
- No way to clear/restart an in-progress lasso
- No way to undo the last few points while drawing

---

## Current State Analysis

### What Exists Today

```
┌─────────────────────────────────────────────────────┐
│ Header: [✕ Cancel] [Draw Selection] [0 cutouts]    │
├─────────────────────────────────────────────────────┤
│                                                     │
│                  Photo Canvas                       │
│                                                     │
│        ·····user drawing lasso·····                │
│                                                     │
├─────────────────────────────────────────────────────┤
│ Bottom: [✏️ Lasso] [↩️ Undo] [🗑️]        [Done →] │
└─────────────────────────────────────────────────────┘
```

### State Management (`editor-store.ts`)

| State | Type | Purpose |
|-------|------|---------|
| `isDrawing` | boolean | True while finger/mouse is down drawing |
| `currentPath` | Point[] | Array of points being drawn (not in undo stack) |
| `cutouts` | Cutout[] | Completed cutouts (tracked by zundo) |

### Available Actions

| Action | Status | Notes |
|--------|--------|-------|
| `startDrawing(point)` | ✅ Works | Begins new path |
| `continueDrawing(point)` | ✅ Works | Adds point to path |
| `finishDrawing()` | ✅ Works | Converts path to cutout |
| `cancelDrawing()` | ⚠️ Exists but not exposed | Clears current path |
| `undo()` (zundo) | ⚠️ Only for completed cutouts | Doesn't affect `currentPath` |

### The Gap

The `currentPath` array is **not** tracked by zundo's temporal store:

```typescript
partialize: (state) => {
  // Only these fields are tracked for undo/redo
  const { cutouts, placedCutouts, canvasConfig } = state;
  return { cutouts, placedCutouts, canvasConfig };
},
```

**Result:** User is drawing → messes up → no escape except completing a bad cutout or lifting finger to cancel (if < 10 points).

---

## Design Options Evaluated

### Option A: "Clear" Button (Recommended ✓)

**Concept:** Single button to discard current in-progress lasso and start over.

| Pros | Cons |
|------|------|
| Simple mental model | No granular point-by-point undo |
| One tap to recover | — |
| Mobile-friendly large touch target | — |
| Low implementation complexity | — |

### Option B: Point-by-Point Undo Stack

**Concept:** Track each point in an undo stack; tap undo to remove last N points.

| Pros | Cons |
|------|------|
| Granular control | Complex state management |
| Power-user friendly | Confusing for casual users |
| — | Slow to recover from big mistakes |
| — | Higher implementation cost |

### Option C: Shake to Undo (iOS Pattern)

**Concept:** Shake device to trigger undo/clear.

| Pros | Cons |
|------|------|
| Familiar iOS pattern | Android users won't discover it |
| No UI clutter | Requires device motion API |
| — | Not accessible |
| — | Can't shake while drawing (finger down) |

### Option D: Long-Press to Clear

**Concept:** Long-press anywhere to clear current lasso.

| Pros | Cons |
|------|------|
| No extra UI elements | Not discoverable |
| — | Conflicts with drawing gesture |
| — | Frustrating if triggered accidentally |

### Option E: Two-Finger Tap

**Concept:** Two-finger tap to clear (similar to some drawing apps).

| Pros | Cons |
|------|------|
| Quick gesture | Very low discoverability |
| — | Hard to execute while drawing |

---

## Recommendation: Clear Button + Completed Cutout Undo

### Dual-Mode Undo System

| Mode | Trigger | Behavior |
|------|---------|----------|
| **Drawing in progress** | Show "Clear" button | Clears `currentPath`, user can start over |
| **Drawing complete** | Show "Undo" button | Removes last completed cutout (existing behavior) |

### Why This Works

1. **Simple mental model:** "Clear" = throw away what I'm drawing now
2. **Fast recovery:** One tap, start over immediately
3. **Mobile-optimized:** Large touch target, no complex gestures
4. **Builds on existing code:** Just expose `cancelDrawing()` to UI

---

## UI Mockup

### During Drawing (finger down, path in progress)

```
┌─────────────────────────────────────────────────────┐
│ [✕]                Draw Selection         0 cutouts │
├─────────────────────────────────────────────────────┤
│                                                     │
│                                                     │
│            ·····active lasso path·····             │
│                                                     │
│                                                     │
│                                  ┌───────────────┐  │
│                                  │  🔄 Clear    │  │ ← FAB
│                                  └───────────────┘  │
├─────────────────────────────────────────────────────┤
│  Drawing... lift finger near start to complete     │
└─────────────────────────────────────────────────────┘
```

### After Completing a Cutout (or idle)

```
┌─────────────────────────────────────────────────────┐
│ [✕]                Draw Selection         1 cutout  │
├─────────────────────────────────────────────────────┤
│                                                     │
│            ┌────────────────┐                       │
│            │ completed      │ ← dashed outline     │
│            │ cutout         │                       │
│            └────────────────┘                       │
│                                                     │
│                                                     │
├─────────────────────────────────────────────────────┤
│ [✏️ Lasso] [↩️ Undo]  [🗑️ Delete]       [Done →]  │
└─────────────────────────────────────────────────────┘
```

---

## Interaction Flow

```
┌────────────────────────────────────────────────────────────────┐
│                         USER JOURNEY                           │
└────────────────────────────────────────────────────────────────┘

  ┌─────────┐
  │  Idle   │ ← Bottom toolbar shows: [Lasso] [Undo] [Delete?]
  └────┬────┘
       │ finger down
       ▼
  ┌─────────────────┐
  │ Drawing Lasso   │ ← FAB appears: [🔄 Clear]
  │                 │   Bottom toolbar hidden or dimmed
  └────────┬────────┘
           │
     ┌─────┴─────┐
     │           │
     ▼           ▼
┌─────────┐  ┌─────────────┐
│ Tap     │  │ Lift finger │
│ Clear   │  │ near start  │
└────┬────┘  └──────┬──────┘
     │              │
     ▼              ▼
┌─────────┐  ┌──────────────┐
│  Idle   │  │ Cutout saved │
│(restart)│  │ show actions │
└─────────┘  └──────────────┘
```

---

## Component Specifications

### Clear Button (FAB)

| Property | Value |
|----------|-------|
| **Position** | Bottom-right, 16px from edges |
| **Size** | 56×56px (touch-friendly) |
| **Icon** | `ArrowPathIcon` (Heroicons) or `XMarkIcon` |
| **Label** | "Clear" (visible) or aria-label only |
| **Background** | `stone-700` with slight transparency |
| **Visibility** | Only when `isDrawing && currentPath.length > 0` |
| **Z-index** | Above canvas, below header |

### Button States

```tsx
// Visible only during active drawing
{isDrawing && currentPath.length > 0 && (
  <button
    onClick={cancelDrawing}
    className="absolute bottom-24 right-4 
               flex items-center gap-2 
               px-4 py-3 
               bg-stone-700/90 text-white 
               rounded-full shadow-lg
               active:bg-stone-600"
    aria-label="Clear current selection"
  >
    <ArrowPathIcon className="w-5 h-5" />
    <span className="font-medium">Clear</span>
  </button>
)}
```

---

## Implementation Notes for Engineers

### 1. Expose `cancelDrawing` in ClipModal

```tsx
// In ClipModal.tsx
const cancelDrawing = useEditorStore((s) => s.cancelDrawing);
```

### 2. Add Clear FAB inside LassoCanvas or ClipModal

Best location: **ClipModal.tsx** (it already manages the overlay UI)

```tsx
// Inside the flex-1 relative container, after <LassoCanvas>
{isDrawing && currentPath.length > 3 && (
  <button
    onClick={cancelDrawing}
    className="absolute bottom-24 right-4 z-10
               flex items-center gap-2 
               px-4 py-3 
               bg-stone-700/90 backdrop-blur-sm
               text-white rounded-full shadow-lg
               active:scale-95 transition-transform"
  >
    <ArrowPathIcon className="w-5 h-5" />
    <span className="font-medium text-sm">Clear</span>
  </button>
)}
```

### 3. Get `currentPath` in ClipModal

```tsx
const currentPath = useEditorStore((s) => s.currentPath);
```

### 4. Haptic Feedback (Optional Enhancement)

```tsx
const handleClear = () => {
  // Haptic feedback on iOS/Android
  if (navigator.vibrate) {
    navigator.vibrate(10);
  }
  cancelDrawing();
};
```

### 5. Animation (Optional Enhancement)

Add entrance animation for the FAB:

```css
@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.clear-fab {
  animation: fade-in-up 150ms ease-out;
}
```

---

## Accessibility

| Requirement | Implementation |
|-------------|----------------|
| Screen reader | `aria-label="Clear current selection and start over"` |
| Touch target | Minimum 44×44px (we use 56×56px) |
| Contrast | White text on `stone-700` = 7.2:1 ratio ✓ |
| Focus visible | Add `focus:ring-2 focus:ring-white` |

---

## Future Enhancements (Phase 2)

### Point-by-Point Undo (If Requested)

If users request granular undo, add a second action:

```tsx
// New store action
undoLastPoints: (count = 10) => set((state) => {
  if (state.currentPath.length > count) {
    state.currentPath = state.currentPath.slice(0, -count);
  }
}),
```

UI: Replace "Clear" with segmented control `[Undo 10pts] [Clear All]`

### Shake to Undo

If we add shake support later:

```tsx
useEffect(() => {
  if (!isDrawing) return;
  
  const handleShake = (e: DeviceMotionEvent) => {
    const { acceleration } = e;
    if (!acceleration) return;
    const magnitude = Math.sqrt(
      (acceleration.x || 0) ** 2 +
      (acceleration.y || 0) ** 2 +
      (acceleration.z || 0) ** 2
    );
    if (magnitude > 25) cancelDrawing();
  };
  
  window.addEventListener('devicemotion', handleShake);
  return () => window.removeEventListener('devicemotion', handleShake);
}, [isDrawing, cancelDrawing]);
```

---

## Summary

| What | Recommendation |
|------|----------------|
| **Primary action** | "Clear" FAB during active drawing |
| **Position** | Bottom-right floating action button |
| **Icon** | `ArrowPathIcon` + "Clear" label |
| **Behavior** | Calls existing `cancelDrawing()` action |
| **Visibility** | Only when `isDrawing && currentPath.length > 3` |
| **Implementation effort** | ~30 minutes (expose existing action + add button) |

This approach is:
- ✅ Discoverable (visible button)
- ✅ Fast (one tap)
- ✅ Mobile-friendly (large touch target)
- ✅ Low-risk (builds on existing `cancelDrawing` action)
- ✅ Accessible (proper labels, contrast, touch targets)
