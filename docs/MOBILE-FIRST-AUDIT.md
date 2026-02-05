# Mobile-First Audit & Implementation Plan

**Date:** February 5, 2026  
**Priority:** HIGH — This is where our users' photos live

---

## Executive Summary

Our target users take photos on their phones. They don't want to transfer to a laptop just to create a needlepoint canvas. The app must be a **native-feeling mobile web experience** first, with desktop as an enhancement.

---

## Current State Assessment

### ✅ What's Working
- Responsive Tailwind classes (`md:` breakpoints)
- Flexbox/grid layouts that stack on mobile
- Fixed bottom toolbar pattern (good for mobile)

### ❌ Critical Gaps

| Issue | Impact | Fix Priority |
|-------|--------|--------------|
| No viewport meta tag | Zooming issues, wrong scale | P0 |
| No PWA manifest | Can't "Add to Home Screen" | P0 |
| No camera capture button | Forces file picker instead of camera | P0 |
| No touch-action CSS | Gestures conflict with browser | P0 |
| Sliders hard to use on mobile | Bad UX for settings | P1 |
| No haptic feedback | Feels like a website, not an app | P2 |
| No offline support | Can't work without connection | P2 |

---

## Implementation Changes

### 1. Viewport & Meta Tags (P0)

**File:** `src/app/layout.tsx`

```tsx
export const metadata: Metadata = {
  title: "HCB Needlepoint",
  description: "Turn your photos into custom needlepoint canvases",
  // Mobile-specific meta
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,        // Prevent zoom on input focus
    userScalable: false,    // Prevent pinch zoom (we handle it)
  },
  // PWA meta
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Needlepoint",
  },
  // Theme color for browser chrome
  themeColor: "#4F46E5",    // Indigo-600
};
```

### 2. PWA Manifest (P0)

**File:** `public/manifest.json`

```json
{
  "name": "HCB Needlepoint Canvas Generator",
  "short_name": "Needlepoint",
  "description": "Turn your photos into custom needlepoint canvases",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#4F46E5",
  "orientation": "portrait",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

### 3. Camera Capture (P0)

**Current:** `<input type="file" accept="image/*">`

**Improved:**
```tsx
// Primary: Camera capture (opens camera directly on mobile)
<input 
  type="file" 
  accept="image/*" 
  capture="environment"  // Back camera
  className="hidden"
/>

// Secondary: Photo library (for existing photos)
<input 
  type="file" 
  accept="image/*"
  // No capture attribute = shows file picker
  className="hidden"
/>
```

**UI Pattern:**
```tsx
<div className="flex gap-2">
  <button onClick={() => cameraInputRef.current?.click()}>
    📷 Take Photo
  </button>
  <button onClick={() => libraryInputRef.current?.click()}>
    🖼️ Choose Photo
  </button>
</div>
```

### 4. Touch-Action CSS (P0)

**File:** `src/app/globals.css`

```css
/* Prevent browser gestures from interfering with our canvas */
.editor-canvas {
  touch-action: none;  /* We handle ALL touch events */
}

/* Allow vertical scroll in lists */
.scrollable-list {
  touch-action: pan-y;
}

/* Prevent pull-to-refresh on the editor page */
.editor-page {
  overscroll-behavior: none;
}

/* Ensure touch targets are 44x44px minimum (Apple HIG) */
.touch-target {
  min-width: 44px;
  min-height: 44px;
}
```

### 5. Mobile-Optimized Settings UI (P1)

**Current:** Range sliders in horizontal row (hard to use on mobile)

**Improved:** Bottom sheet with large touch targets

```tsx
// Use a bottom sheet pattern for settings
<Sheet>
  <SheetTrigger asChild>
    <button className="touch-target">
      ⚙️ Settings
    </button>
  </SheetTrigger>
  <SheetContent side="bottom" className="h-[60vh]">
    <div className="space-y-6 p-4">
      {/* Large, easy-to-tap options */}
      <SegmentedControl 
        label="Canvas Size"
        options={["Small (6\")", "Medium (8\")", "Large (10\")"]}
        value={size}
        onChange={setSize}
      />
      
      <SegmentedControl
        label="Mesh Count"
        options={["10", "13", "18"]}
        value={mesh}
        onChange={setMesh}
      />
      
      <SegmentedControl
        label="Colors"
        options={["8", "12", "16"]}
        value={colors}
        onChange={setColors}
      />
    </div>
  </SheetContent>
</Sheet>
```

### 6. Gesture Library (P0 for Lasso Editor)

**Add dependency:**
```bash
npm install @use-gesture/react
```

**Usage in Lasso Editor:**
```tsx
import { useGesture } from '@use-gesture/react';

function LassoCanvas() {
  const bind = useGesture({
    onDrag: ({ xy: [x, y], first, last }) => {
      if (first) startDrawing({ x, y });
      else if (last) finishDrawing();
      else continueDrawing({ x, y });
    },
    onPinch: ({ offset: [scale] }) => {
      setZoom(scale);
    },
    onDragStart: () => {
      // Haptic feedback
      if (navigator.vibrate) navigator.vibrate(10);
    },
  });
  
  return <canvas {...bind()} className="editor-canvas" />;
}
```

---

## File Changes Required

### New Files to Create

| File | Purpose |
|------|---------|
| `public/manifest.json` | PWA manifest |
| `public/icons/icon-192.png` | PWA icon |
| `public/icons/icon-512.png` | PWA icon |
| `src/components/ui/bottom-sheet.tsx` | Mobile settings sheet |
| `src/components/ui/segmented-control.tsx` | Mobile-friendly selector |

### Files to Modify

| File | Changes |
|------|---------|
| `src/app/layout.tsx` | Add viewport, manifest, theme-color meta |
| `src/app/globals.css` | Add touch-action, touch-target classes |
| `src/components/project/chat/project-toolbar.tsx` | Camera capture, bottom sheet |

---

## Design Patterns for Mobile

### 1. Bottom-Up Navigation
- Primary actions at bottom (thumb zone)
- Settings in bottom sheet
- Navigation minimal at top

### 2. Thumb Zone Optimization
```
┌─────────────────────┐
│   Hard to reach     │  ← Navigation only
│                     │
│   Comfortable       │  ← Content/canvas
│                     │
│   Easy to reach     │  ← Primary actions
│ [📷] [✏️] [⚙️] [✓] │
└─────────────────────┘
```

### 3. Progressive Disclosure
- Show only essential controls initially
- Advanced options in expandable sections
- Don't overwhelm on first use

### 4. Feedback & Confirmation
- Haptic feedback on actions
- Visual feedback (ripples, highlights)
- Confirmation before destructive actions

---

## Performance Considerations

### Image Handling
```tsx
// Resize images client-side before upload
async function resizeForUpload(file: File, maxDimension = 2048): Promise<Blob> {
  const img = await createImageBitmap(file);
  const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
  
  const canvas = new OffscreenCanvas(
    img.width * scale,
    img.height * scale
  );
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  
  return canvas.convertToBlob({ type: 'image/jpeg', quality: 0.85 });
}
```

### Lazy Loading
```tsx
// Don't load the full editor until needed
const LassoEditor = dynamic(() => import('@/components/editor/LassoEditor'), {
  loading: () => <EditorSkeleton />,
  ssr: false,  // Canvas doesn't work in SSR
});
```

### Memory Management
- Unload source images when not visible
- Use object URLs carefully (revoke when done)
- Limit undo history on mobile (memory constrained)

---

## Testing Checklist

### Device Testing
- [ ] iPhone SE (small screen)
- [ ] iPhone 14 Pro (standard)
- [ ] iPhone 14 Pro Max (large)
- [ ] Android mid-range (Galaxy A series)
- [ ] Android flagship (Pixel/Samsung S)
- [ ] iPad (tablet)

### Scenario Testing
- [ ] Take photo → lasso → generate (happy path)
- [ ] Choose from library → edit → generate
- [ ] Rotate device mid-edit
- [ ] Background the app and return
- [ ] Low memory conditions
- [ ] Slow network (3G)
- [ ] Offline attempt

### Gesture Testing
- [ ] Single finger draw (lasso)
- [ ] Two finger pan (move canvas)
- [ ] Pinch zoom
- [ ] Long press (select)
- [ ] Swipe to delete

---

## Dependencies to Add

```json
{
  "dependencies": {
    "@use-gesture/react": "^10.3.0",
    "vaul": "^0.9.0"  // For bottom sheet (shadcn compatible)
  }
}
```

---

## Success Criteria

1. **Lighthouse Mobile Score:** > 90 performance
2. **Touch Target Size:** All interactive elements ≥ 44x44px
3. **Time to Interactive:** < 3s on 4G
4. **Camera to Canvas:** < 60 seconds end-to-end
5. **Zero Zoom Issues:** App works without pinch-zoom
6. **Add to Home Screen:** Works as installed PWA

---

## Next Steps

1. [ ] Implement viewport/meta changes
2. [ ] Create PWA manifest and icons
3. [ ] Add camera capture buttons
4. [ ] Add touch-action CSS
5. [ ] Install @use-gesture/react
6. [ ] Build bottom sheet settings component
7. [ ] Test on real devices
