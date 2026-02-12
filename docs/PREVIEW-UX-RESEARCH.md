# Preview UX Research: Canvas vs Stitched Display

> **Research Date:** February 2026  
> **Purpose:** Determine best UX patterns for displaying canvas and stitched previews in our mobile-first needlepoint app

---

## Executive Summary

After researching competitor sites and common UX patterns, we recommend a **segmented toggle control** with **swipe gesture support** for switching between Canvas Preview and Stitched Preview. This provides the best mobile experience while being clear and intuitive.

**Key Recommendation:**
- Default to **Stitched Preview** (the aspirational "finished" view)
- Use **segmented toggle** at top of image for switching
- Support **horizontal swipe** as secondary interaction
- Label as **"Your Canvas"** and **"When Stitched"**

---

## 1. Competitor Analysis

### NeedlePaint (needlepaint.com)

**Primary competitor** — the only established photo-to-needlepoint service found.

**Pattern Used:** Thumbnail Gallery

**How It Works:**
- Vertical thumbnail strip on left side of main image
- Three thumbnails: "Canvas", "Stitched Preview", and finished product photo
- Clicking a thumbnail replaces the main image
- First thumbnail (Canvas) is selected by default

**Screenshot Analysis:**
```
┌─────────────────────────────────────┐
│ ┌───┐                               │
│ │ C │   ┌─────────────────────┐     │
│ │anv│   │                     │     │
│ │as │   │    MAIN IMAGE       │     │
│ └───┘   │    (Canvas View)    │     │
│ ┌───┐   │                     │     │
│ │Sti│   │                     │     │
│ │tch│   └─────────────────────┘     │
│ └───┘                               │
│ ┌───┐   Product Title               │
│ │Fin│   Price: $35.40               │
│ │ish│   [Add to Cart]               │
│ └───┘                               │
└─────────────────────────────────────┘
```

**Pros:**
- Standard e-commerce pattern (familiar)
- Supports multiple images easily
- Works well on desktop
- No special interactions to learn

**Cons:**
- Thumbnails are small and hard to distinguish
- Not optimized for mobile (tiny touch targets)
- No direct comparison feature
- Labels are minimal/unclear ("Canvas" label, others unlabeled)
- Requires deliberate clicking — easy to miss alternate views

### StitchFiddle (stitchfiddle.com)

**Type:** Pattern creation tool (not a preview display)

Not directly applicable — this is a design tool where users create patterns, not a preview comparison interface.

### Pic2Pat (pic2pat.com)

**Type:** Free cross-stitch pattern generator

**Pattern Used:** Single view with download

Not applicable for preview comparison — they generate a single pattern/chart output rather than showing canvas vs stitched previews.

### 123Stitch (123stitch.com)

**Type:** Craft supplies retailer

Standard product gallery — no canvas/stitched comparison feature found.

---

## 2. Common UX Patterns for Image Comparison

### Pattern A: Thumbnail Gallery

**Example:** NeedlePaint, most e-commerce sites

```
┌────┐ ┌──────────────────────┐
│ 1  │ │                      │
├────┤ │    MAIN IMAGE        │
│ 2  │ │                      │
├────┤ └──────────────────────┘
│ 3  │
└────┘
```

| Pros | Cons |
|------|------|
| Familiar pattern | Poor mobile experience |
| Supports many images | Small touch targets |
| Standard e-commerce | No direct comparison |

**Mobile Rating:** ⭐⭐ (2/5)

---

### Pattern B: Toggle Switch

**Example:** iOS-style segmented control

```
┌─────────────────────────────────────┐
│   ┌──────────────┬──────────────┐   │
│   │   CANVAS   ● │   STITCHED   │   │
│   └──────────────┴──────────────┘   │
│   ┌─────────────────────────────┐   │
│   │                             │   │
│   │         PREVIEW IMAGE       │   │
│   │                             │   │
│   └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

| Pros | Cons |
|------|------|
| Very clear binary choice | Can't see both at once |
| Large touch targets | Limited to 2 options |
| Minimal space | Requires deliberate tap |
| Familiar mobile pattern | |

**Mobile Rating:** ⭐⭐⭐⭐⭐ (5/5)

---

### Pattern C: Tab Navigation

**Example:** Standard web tabs

```
┌─────────────────────────────────────┐
│  ┌────────┐ ┌────────┐ ┌────────┐   │
│  │ Canvas │ │Stitched│ │ Other  │   │
│  └────────┘ └────────┘ └────────┘   │
│  ━━━━━━━━━━━                        │
│   ┌─────────────────────────────┐   │
│   │         PREVIEW             │   │
│   └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

| Pros | Cons |
|------|------|
| Clear separation | Uses horizontal space |
| Extensible | More "web" than "app" feeling |
| Familiar pattern | Less elegant on mobile |

**Mobile Rating:** ⭐⭐⭐ (3/5)

---

### Pattern D: Side-by-Side

**Example:** Photo comparison tools

```
┌─────────────────────────────────────┐
│  ┌───────────┐   ┌───────────┐      │
│  │  CANVAS   │   │  STITCHED │      │
│  │           │   │           │      │
│  │           │   │           │      │
│  └───────────┘   └───────────┘      │
└─────────────────────────────────────┘
```

| Pros | Cons |
|------|------|
| Direct comparison | Images become very small |
| Both visible at once | Poor mobile experience |
| | Wastes vertical space |

**Mobile Rating:** ⭐ (1/5)

---

### Pattern E: Swipe Carousel

**Example:** Instagram multi-photo, app onboarding

```
┌─────────────────────────────────────┐
│   ┌─────────────────────────────┐   │
│   │                             │   │
│   │      PREVIEW IMAGE          │   │
│   │         (swipeable)         │   │
│   │                     ◀── ──▶ │   │
│   │                             │   │
│   └─────────────────────────────┘   │
│               ● ○                   │
│         (indicator dots)            │
└─────────────────────────────────────┘
```

| Pros | Cons |
|------|------|
| Full-width images | Not obvious swipe exists |
| Natural mobile gesture | Easy to miss second view |
| Immersive experience | Need clear affordance |

**Mobile Rating:** ⭐⭐⭐⭐ (4/5)

---

### Pattern F: Before/After Slider

**Example:** Photo editing apps, retouching demos

```
┌─────────────────────────────────────┐
│   ┌─────────────────────────────┐   │
│   │             │               │   │
│   │   CANVAS    │   STITCHED    │   │
│   │             │               │   │
│   │             ┃◀━━━━━━━━━━━━━▶│   │
│   │             │               │   │
│   └─────────────────────────────┘   │
│         (drag slider to compare)    │
└─────────────────────────────────────┘
```

| Pros | Cons |
|------|------|
| Dramatic comparison | Requires aligned images |
| Engaging interaction | Complex to implement |
| Works well for A/B | Our images may not align perfectly |

**Mobile Rating:** ⭐⭐⭐ (3/5) — great for aligned images, less ideal for our use case

---

### Pattern G: Tap-and-Hold Reveal

**Example:** Some photo apps, "hold to compare"

```
┌─────────────────────────────────────┐
│   ┌─────────────────────────────┐   │
│   │                             │   │
│   │      STITCHED PREVIEW       │   │
│   │                             │   │
│   │   (hold anywhere for canvas)│   │
│   │                             │   │
│   └─────────────────────────────┘   │
│         Hold to see canvas          │
└─────────────────────────────────────┘
```

| Pros | Cons |
|------|------|
| Quick comparison | Not discoverable |
| Full-size images | Requires instruction |
| Minimalist UI | Finger obscures image |

**Mobile Rating:** ⭐⭐⭐ (3/5)

---

## 3. Mobile-First Considerations

### Screen Real Estate
- Mobile screens are typically 360-428px wide
- Preview images should be **full-width** or close to it
- Controls should be **above or below** the image, not overlaid
- Thumbnail galleries waste space on mobile

### Touch Interactions
| Gesture | Best For |
|---------|----------|
| Tap | Toggle, buttons, selection |
| Swipe | Carousel, navigation between views |
| Hold | Secondary/power-user features |
| Pinch | Zoom (if needed) |

### Key Questions
1. **Which view shows first?** → Stitched (aspirational goal)
2. **How obvious is the toggle?** → Must be immediately visible
3. **Can users swipe?** → Yes, as secondary interaction
4. **Is it clear which view is active?** → Yes, via toggle state

---

## 4. Design Recommendation

### Recommended Pattern: **Segmented Toggle + Swipe**

A hybrid approach combining:
- **Segmented toggle control** (explicit, clear selection)
- **Swipe gesture** (natural mobile interaction)

### Wireframe

```
┌─────────────────────────────────────┐
│                                     │
│  ┌───────────────────────────────┐  │
│  │  Your Canvas  │  When Stitched│  │  ← Segmented toggle
│  │               │       ●       │  │    (pill-shaped)
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │                               │  │
│  │                               │  │
│  │                               │  │
│  │      [PREVIEW IMAGE]          │  │  ← Full-width image
│  │                               │  │    (swipeable)
│  │                               │  │
│  │                               │  │
│  │                          ←──▶ │  │  ← Subtle swipe hint
│  └───────────────────────────────┘  │
│                                     │
│  "What you'll receive, ready to     │  ← Helper text
│   stitch into the finished look"    │    (first time only)
│                                     │
└─────────────────────────────────────┘
```

### Implementation Details

#### Segmented Toggle
```jsx
// React/Tailwind concept
<div className="flex rounded-full bg-gray-100 p-1">
  <button 
    className={cn(
      "flex-1 py-2 px-4 rounded-full text-sm font-medium transition",
      activeView === 'canvas' 
        ? "bg-white shadow text-gray-900" 
        : "text-gray-500"
    )}
    onClick={() => setActiveView('canvas')}
  >
    Your Canvas
  </button>
  <button 
    className={cn(
      "flex-1 py-2 px-4 rounded-full text-sm font-medium transition",
      activeView === 'stitched' 
        ? "bg-white shadow text-gray-900" 
        : "text-gray-500"
    )}
    onClick={() => setActiveView('stitched')}
  >
    When Stitched
  </button>
</div>
```

#### Swipe Container
```jsx
// Using a swipeable container
<div 
  className="relative overflow-hidden"
  onSwipeLeft={() => setActiveView('stitched')}
  onSwipeRight={() => setActiveView('canvas')}
>
  <img 
    src={activeView === 'canvas' ? canvasPreviewUrl : stitchedPreviewUrl}
    className="w-full transition-opacity"
  />
</div>
```

### Recommended Labels

| Technical Term | User-Facing Label | Rationale |
|---------------|-------------------|-----------|
| Canvas Preview | **"Your Canvas"** | Personal, clear what they receive |
| Stitched Preview | **"When Stitched"** | Action-oriented, shows the goal |

**Alternative labels considered:**
- "Printed Canvas" / "Finished Look" — Good, but less personal
- "Before" / "After" — Too generic
- "Canvas" / "Stitched" — Too technical
- "Kit Preview" / "Completed" — Decent alternatives

### Default View

**Recommendation: Start with "When Stitched"**

Rationale:
1. **Aspirational** — Users want to see the end result first
2. **Emotional hook** — The finished look is what sells
3. **NeedlePaint does opposite** — Differentiation opportunity
4. **Natural flow** — Dream first, then see the work

After first interaction, remember user's preference.

---

## 5. ASCII Mockup — Full Preview Component

```
┌─────────────────────────────────────────┐
│  ← Back              Generate New       │
├─────────────────────────────────────────┤
│                                         │
│    ╭─────────────────────────────────╮  │
│    │  Your Canvas │ When Stitched  ● │  │
│    ╰─────────────────────────────────╯  │
│                                         │
│    ┌─────────────────────────────────┐  │
│    │                                 │  │
│    │                                 │  │
│    │     🧵 STITCHED PREVIEW 🧵      │  │
│    │                                 │  │
│    │     (beautiful finished look)   │  │
│    │                                 │  │
│    │                                 │  │
│    │                        ← swipe  │  │
│    └─────────────────────────────────┘  │
│                                         │
│    18 mesh  •  6" × 6"  •  12 colors   │
│                                         │
│    ╭─────────────────────────────────╮  │
│    │     Order Custom Kit — $XX      │  │
│    ╰─────────────────────────────────╯  │
│                                         │
│    ╭─────────────────────────────────╮  │
│    │     💾  Save to Gallery         │  │
│    ╰─────────────────────────────────╯  │
│                                         │
└─────────────────────────────────────────┘

When toggled to "Your Canvas":

┌─────────────────────────────────────────┐
│    ╭─────────────────────────────────╮  │
│    │  Your Canvas  ● │ When Stitched │  │
│    ╰─────────────────────────────────╯  │
│                                         │
│    ┌─────────────────────────────────┐  │
│    │   ┼───┼───┼───┼───┼───┼───┼    │  │
│    │   ┼───┼───┼───┼───┼───┼───┼    │  │
│    │   ┼───┼───┼───┼───┼───┼───┼    │  │
│    │         CANVAS PREVIEW          │  │
│    │   (shows grid/mesh overlay)     │  │
│    │   ┼───┼───┼───┼───┼───┼───┼    │  │
│    │   ┼───┼───┼───┼───┼───┼───┼    │  │
│    │                        swipe →  │  │
│    └─────────────────────────────────┘  │
│                                         │
│    This is the printed canvas you'll   │
│    receive — ready for you to stitch!  │
│                                         │
└─────────────────────────────────────────┘
```

---

## 6. Implementation Checklist

- [ ] Create segmented toggle component (`PreviewToggle.tsx`)
- [ ] Add swipe gesture support (consider `react-swipeable` or Headless UI)
- [ ] Implement crossfade animation between views (300ms)
- [ ] Persist user's last-viewed preference in localStorage
- [ ] Add subtle swipe hint icon for first-time users
- [ ] Ensure toggle is accessible (keyboard nav, aria labels)
- [ ] Test on various mobile screen sizes
- [ ] Consider adding haptic feedback on toggle (iOS)

---

## 7. Future Enhancements

1. **Pinch-to-zoom** on preview images
2. **Share button** for each preview type
3. **Before/After slider** as an optional power-user feature
4. **Animation** showing transformation from canvas to stitched
5. **3D preview** showing the canvas on a pillow/frame (for finished products)

---

## Appendix: Research Screenshots

Screenshots captured during research are available at:
- NeedlePaint finished product: `/home/duncbot/.openclaw/media/browser/26fcfbd3-*`
- NeedlePaint kit page (with thumbnails): `/home/duncbot/.openclaw/media/browser/70c353dd-*`
- NeedlePaint custom upload: `/home/duncbot/.openclaw/media/browser/ce8993b1-*`

---

*Research conducted February 2026 for HCB-DPG Needlepoint project*
