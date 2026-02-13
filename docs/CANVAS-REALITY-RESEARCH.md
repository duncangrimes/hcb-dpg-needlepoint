# Canvas Reality Research

Research findings comparing real needlepoint canvases to our current preview implementation.

## Real Canvas Image Sources

### Sources Examined
- **Needlepoint.com** - Pre-cut blank canvas product pages
- **Atlantic Blue Canvas Blog** - "How to Choose the Right Needlepoint Canvas" guide
- **DMC** - Mono blank tapestry needlepoint canvas product
- **Google Images** - Searches for "mono needlepoint canvas mesh close up", "painted needlepoint canvas texture", "zweigart canvas detail"
- **Wikipedia** - Needlepoint article with technical canvas descriptions

### Key Reference Images Found
1. Zweigart mono canvas close-ups showing thread weave structure
2. Blank canvas texture shots showing ecru/cream coloring
3. Painted/stitch-painted canvases showing how ink sits on threads
4. Various mesh counts (10, 12, 13, 14, 18 mesh) for comparison

---

## Real Canvas Characteristics

### Thread Structure
- **Material**: 100% cotton threads (most common), sometimes linen or polyester blends
- **Weave**: Single-thread intersections form an even grid (mono canvas)
- **Over/Under Pattern**: Weft threads pass OVER and UNDER warp threads at each intersection - creating actual woven fabric
- **Thread Width**: Threads have visible width with slight variation along their length
- **Thread Texture**: Individual cotton fibers visible, giving a slightly fuzzy/matte appearance
- **Thread Edges**: Slightly irregular/organic, not perfectly straight lines

### Canvas Base Color
- **Primary Colors**: White, ecru (off-white/cream), antique white
- **NOT black**: The base canvas is never black - holes appear as the background showing through
- **Warm undertone**: Most quality canvases have a warm, slightly yellowish ecru tone
- **Orange Line vs Red Line**: Zweigart identifies canvas types - orange line is typically ecru/white

### Holes and Openings
- **Location**: Holes are the GAPS BETWEEN thread intersections, NOT AT intersections
- **Shape**: Roughly square/rectangular openings
- **Size**: Determined by mesh count - smaller mesh count = larger holes
- **Visibility**: Through holes you see the background/backing (often appears as a soft shadow or the underlying surface)
- **Edges**: Hole edges are defined by the thread edges, slightly soft/organic

### Thread-to-Hole Ratio
Based on mesh count observations:
- **10-13 mesh (low)**: Larger holes, thicker threads - thread-to-hole roughly 60:40
- **14-18 mesh (high)**: Smaller holes, finer threads - thread-to-hole roughly 70:30
- **General rule**: Threads are WIDER than the gaps between them

### How Paint/Color Appears on Canvas
- **Absorption**: Paint is absorbed INTO the cotton fibers, not sitting on top like a solid layer
- **Translucency**: Through lighter colors, thread texture is often visible
- **Coverage**: Darker colors cover more completely, lighter colors show more thread texture
- **Color edges**: At color boundaries, there's often slight bleed/feathering into adjacent threads
- **Saturation**: Colors appear slightly muted/desaturated compared to pure digital colors due to absorption
- **Stitch-painted**: Professional painted canvases carefully paint each thread intersection

### 3D/Depth Characteristics
- **Thread height**: Threads have slight 3D volume above the canvas plane
- **Intersection points**: Where threads cross, there's a slight raised bump
- **Shadows**: Natural light creates subtle shadows in the holes and around thread edges
- **Overall texture**: Canvas has a tactile, textured appearance - not flat

---

## Our Current Preview Analysis

### What Our Preview Shows (03-canvas-preview.jpg)
1. **Grid pattern**: Uniform grid of colored lines with dark squares at intersections
2. **Holes**: Small dark squares positioned AT each thread intersection
3. **Thread representation**: Thin, perfectly straight colored lines
4. **Colors**: Solid, fully saturated colors (red, blue, green, yellow quadrants)
5. **Overall look**: Very digital/mathematical - like a pixel grid or graph paper

### Problems Identified

#### 1. **WRONG HOLE PLACEMENT** (Critical)
- **Current**: Dark squares appear AT thread intersections
- **Reality**: Holes are BETWEEN thread intersections (in the gaps of the weave)
- **Fix needed**: Move holes to be the gaps between horizontal and vertical threads

#### 2. **WRONG HOLE/BACKGROUND COLOR** (Critical)
- **Current**: Using black/dark color for holes
- **Reality**: Canvas is ecru/cream - holes reveal the background which should be warm off-white or show-through shadow
- **Fix needed**: Change hole color to ecru/cream or a soft shadow color

#### 3. **MISSING THREAD WEAVE** (Important)
- **Current**: Threads just cross like a grid overlay
- **Reality**: Threads weave OVER and UNDER each other at intersections
- **Fix needed**: Add visual indication of over/under weave pattern at intersections

#### 4. **NO THREAD TEXTURE** (Important)
- **Current**: Threads are perfectly smooth solid colored lines
- **Reality**: Threads have fiber texture, slight irregularity
- **Fix needed**: Add subtle texture/noise to thread appearance

#### 5. **COLORS TOO SATURATED** (Moderate)
- **Current**: Pure, fully saturated digital colors
- **Reality**: Paint absorbed into cotton appears slightly muted
- **Fix needed**: Reduce saturation slightly, add warmth to colors

#### 6. **WRONG THREAD-TO-HOLE RATIO** (Moderate)
- **Current**: Threads and holes appear roughly equal in size
- **Reality**: Threads should be wider than the gaps (60:40 to 70:30 ratio)
- **Fix needed**: Make threads wider relative to holes

#### 7. **TOO PERFECT/MECHANICAL** (Minor)
- **Current**: Everything is perfectly uniform and regular
- **Reality**: Real canvas has subtle organic variations
- **Fix needed**: Add very slight randomness to thread widths/positions

#### 8. **MISSING DEPTH/SHADOW** (Minor)
- **Current**: Completely flat appearance
- **Reality**: Threads have slight 3D height, creating subtle shadows
- **Fix needed**: Add subtle shadow/highlight effects

---

## Recommendations for Improvement

### Priority 1: Fix Fundamental Structure
1. **Reposition holes**: Move holes to be the GAPS between thread crossings, not at intersections
2. **Change base color**: Use ecru/cream (approx #F5F0E1) instead of black for the background/holes
3. **Implement thread weave**: Show threads passing over/under each other

### Priority 2: Improve Visual Quality
4. **Adjust thread width**: Make threads wider relative to hole gaps
5. **Desaturate colors**: Reduce saturation ~10-15% to simulate paint absorption
6. **Add thread texture**: Apply subtle noise/texture to threads

### Priority 3: Add Polish
7. **Add subtle shadows**: Slight shadows in holes and at thread edges
8. **Introduce organic variation**: Tiny random variations in thread positioning
9. **Add intersection highlights**: Slight bumps where threads cross

### Visual Reference Specifications

**Recommended Canvas Base Color:**
- Ecru/Cream: `#F5F0E1` or `rgb(245, 240, 225)`
- Antique White: `#FAEBD7` or `rgb(250, 235, 215)`

**Thread-to-Hole Ratio (for 13 mesh):**
- Thread width: ~65% of cell
- Hole/gap: ~35% of cell

**Color Saturation Adjustment:**
- Reduce saturation by 10-15% from source colors
- Add slight warm tint to mimic cotton absorption

**Weave Pattern (Mono Canvas):**
```
Row 1: Warp over weft
Row 2: Weft over warp
(Alternating simple weave)
```

---

## Canvas Type Reference

### Mono Canvas (Most Common for Painted Canvases)
- Single-thread plain weave
- Best for hand-painted designs
- Threads have consistent thickness
- Most flexible for different stitch types

### Interlock Canvas (Common for Printed Canvases)
- Threads twisted and locked together
- More stable, won't fray
- Softer feel
- Used for mass-produced printed canvases

### Mesh Count Reference
| Mesh | Holes/Inch | Thread Thickness | Common Use |
|------|-----------|------------------|------------|
| 10   | 10        | Thick            | Beginners, bold designs |
| 13   | 13        | Medium           | Most common, versatile |
| 14   | 14        | Medium           | Good detail |
| 18   | 18        | Fine             | Detailed work |

---

## Summary

Our current preview has a fundamental structural problem: it places holes AT thread intersections when they should be BETWEEN them. The visual is reading as a "pixel grid" rather than a "woven mesh." Key fixes needed:

1. **Structure**: Holes go in the GAPS of the weave, not at crossing points
2. **Color**: Base/holes should be warm ecru, not black
3. **Proportion**: Threads should be wider than holes
4. **Appearance**: Add texture, reduce saturation, show weave pattern

Implementing these changes will transform the preview from looking like a digital grid to an authentic representation of a painted needlepoint canvas.
