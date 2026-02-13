# Stitched Needlepoint Reality Research

## Overview

This document analyzes what **real finished needlepoint** looks like compared to our current stitched preview. The goal is to identify visual characteristics that make needlepoint look authentic and how our preview can be improved.

---

## 1. Real Needlepoint Image Sources

### Reference Sites Found:
- **The Spruce Crafts** - Tent stitch tutorials with close-up photos
  - https://www.thesprucecrafts.com/basic-tent-needlepoint-stitches-2479706
  - https://www.thesprucecrafts.com/basketweave-tent-needlepoint-stitch-tutorial-2479707
  
- **Unwind Studio** - Detailed stitch library with examples
  - https://www.unwind.studio/blogs/needlepoint-stitches/tent-stitch
  
- **Needlework Tips and Techniques** - Technical stitch tutorials
  - https://www.needlework-tips-and-techniques.com/tent-stitch.html

- **Google Image Search** - Searched for:
  - "needlepoint tent stitch close up"
  - "finished needlepoint texture macro"
  - "needlepoint pillow close up stitch texture"
  - "basketweave stitch needlepoint"

---

## 2. Analysis of REAL Stitched Needlepoint

### Stitch Direction
- **All tent stitches go diagonally** - from lower-left to upper-right (or reverse depending on perspective)
- Each stitch covers **one canvas intersection** (one horizontal × one vertical thread)
- Stitches form **parallel diagonal lines** across the surface
- The angle is approximately **45 degrees**

### Thread Texture
- **Individual thread strands are visible** - wool/cotton thread typically has 3-6 plies twisted together
- Thread has a **slightly fuzzy/fibrous edge** - not perfectly smooth
- **Slight loft/dimension** - threads aren't flat, they have roundness
- Thread texture varies based on fiber type:
  - Wool = matte, fuzzy, warm appearance
  - Cotton = smoother, slight sheen
  - Silk = high sheen, smooth

### Shadow/Depth Between Stitches
- **Yes, visible shadows exist** between adjacent stitches
- Shadows appear where:
  - One stitch slightly overlaps or sits beside another
  - The canvas mesh shows through minimally at stitch edges
  - Thread rounds over the canvas creating tiny dark gaps
- Shadows are **subtle, not dramatic** - creates texture, not harsh lines

### Stitch Uniformity
- **Mostly uniform but with micro-variations**
- Human-made stitches have:
  - Slight tension differences (some stitches slightly tighter/looser)
  - Minor directional wobbles
  - Tiny gaps or overlaps at color boundaries
- This variation gives handmade character - **too perfect looks fake**

### Thread Sheen
- **Directional light reflection** - thread reflects light based on orientation
- All stitches going the same direction reflect light similarly
- Creates a **subtle directional sheen** across the surface
- Color appears slightly different at different viewing angles
- Highlights appear along the length of thread strands

### Individual Thread Strands
- **Yes, visible at close range**
- In wool: 2-4 plies typically visible
- Strands twist together creating **spiral-like texture**
- At macro level, you can see:
  - The twist pattern of the thread
  - Individual fiber "hairs" at edges
  - Slight color variation within strands (yarn dye variation)

---

## 3. Comparison to Our Current Preview

### Our Preview Characteristics:
Looking at `test-output/04-stitched-preview.jpg`:

1. **Oval/leaf-shaped elements** arranged in a regular pattern
2. **Strong checkerboard shading** - alternating light/dark versions of each color
3. **Diagonal direction is present** - which is correct
4. **Very uniform, computer-generated look** - too perfect
5. **Shapes have smooth, curved edges** - like ovals or scales

### What Looks WRONG:

| Issue | Our Preview | Real Needlepoint |
|-------|-------------|------------------|
| Shape | Rounded ovals/leaves | Linear diagonal strokes |
| Edges | Smooth curves | Slightly fuzzy thread edges |
| Uniformity | Perfectly identical stitches | Subtle variations |
| Shading | Strong checkerboard pattern | Subtle directional sheen |
| Texture | Scale-like/overlapping ovals | Parallel diagonal lines with thread texture |
| Depth | Artificial alternating shadow | Subtle shadows between stitches |
| Thread detail | None visible | Individual strands visible |

### The "Off" Feeling:

1. **Too oval/rounded** - Real tent stitches are diagonal LINES, not oval shapes. Our preview looks more like fish scales or overlapping leaves.

2. **Checkerboard is too strong** - Real needlepoint doesn't have that pronounced light/dark alternation. The shading should come from subtle directional light reflection, not alternating color values.

3. **No thread texture** - Real stitches show the actual twisted thread fibers. Ours look like solid color blobs.

4. **Too uniform** - Perfect repetition looks computer-generated. Real stitches have micro-variations.

5. **Wrong depth perception** - Our shadow pattern creates a 3D bumpy effect (like pillows or bubbles). Real needlepoint is relatively flat with subtle texture.

---

## 4. Recommendations for Improvement

### Critical Changes:

1. **Change stitch shape from oval to diagonal line**
   - Each stitch should be a diagonal stroke, not an oval
   - Length ≈ 1.4× the grid spacing (diagonal of a square)
   - Width ≈ thread thickness (much narrower than current)

2. **Add thread texture/striation**
   - Add subtle lines within each stitch representing thread strands
   - 2-4 parallel lines following the stitch direction
   - These can be slightly lighter or darker than base color

3. **Remove the checkerboard shading pattern**
   - Real needlepoint doesn't alternate light/dark this strongly
   - Replace with subtle directional sheen (all stitches reflect similarly)

4. **Add subtle shadow between stitches**
   - Thin dark line at one edge of each stitch (bottom-right typically)
   - Very subtle - just suggests depth, doesn't create "pillow" effect

5. **Introduce micro-variation**
   - Slight randomness in stitch position (±1-2 pixels)
   - Slight color variation (±2-5% saturation/brightness)
   - Occasional tiny gaps between stitches

### Visual Characteristics to Replicate:

```
REAL TENT STITCH APPEARANCE:
     ////
    ////
   ////
  ////

NOT (what we have):
   ◉◉◉◉
   ◉◉◉◉
   ◉◉◉◉
```

Each stitch should look like: **/** not like: **◉**

### Thread Texture Detail:

```
Single stitch close-up:

Our current:  ⬬  (solid oval blob)

Should be:    ╱   (diagonal line with texture)
             ┊┊┊  (subtle thread strands within)
```

### Shading Model:

- **Current**: Alternating cell brightness (checkerboard)
- **Should be**: 
  - Base color is mostly uniform
  - Slight highlight along top-left edge of each stitch (light hitting thread)
  - Slight shadow along bottom-right edge (thread depth)
  - Overall surface has directional sheen based on stitch angle

---

## 5. Technical Implementation Notes

### Stitch Geometry:
- Tent stitch covers 1×1 canvas intersection
- Diagonal from corner to corner of each cell
- All stitches parallel (same direction)
- Length = √2 × cell_size (diagonal)
- Width = thread_thickness (typically 0.3-0.5 × cell_size)

### Texture Generation:
- Add 2-4 subtle lines within each stitch stroke
- Lines follow the diagonal direction
- Slight variation in line spacing
- Consider adding very subtle "fuzz" at stitch edges

### Lighting Model:
- Light source assumed from upper-left (traditional)
- Each stitch gets:
  - Highlight on upper-left portion
  - Shadow on lower-right portion
  - Very subtle - not dramatic
- Eliminate the alternating cell brightness

### Color Variation:
- Add ±3% random variation to each stitch's color
- Simulates natural thread dye variation
- Don't make it uniform - should feel organic

---

## 6. Summary

**The core problem**: Our stitches look like **overlapping colored ovals** rather than **parallel diagonal thread strokes**.

**Key fixes needed**:
1. ✅ Make stitches linear (diagonal lines, not ovals)
2. ✅ Add thread strand texture within each stitch
3. ✅ Remove the artificial checkerboard brightness pattern
4. ✅ Add subtle, realistic shadow/highlight based on thread depth
5. ✅ Introduce micro-variation for handmade feel

**The goal**: When someone looks at the preview, they should think "that looks like stitched thread" not "that's a computer-generated pattern."

---

## Appendix: Reference Image Descriptions

### Image 1: Close-up tent stitch (The Spruce Crafts)
- Shows diagonal lines clearly going lower-left to upper-right
- Individual thread strands visible
- Slight shadow between stitch rows
- Matte wool texture

### Image 2: Finished needlepoint pillow
- Dense coverage, no canvas visible
- Uniform diagonal direction across surface
- Subtle color shading creates image, not stitch-level brightness variation
- Flat texture with slight dimension from thread loft

### Image 3: Basketweave stitch sample
- Perfect parallel diagonal lines
- Thread texture clearly visible at edges
- Very uniform coverage
- Back shows woven pattern (different from front)

### Image 4: Multi-color needlepoint detail
- Color changes are clean at boundaries
- All stitches maintain same diagonal direction regardless of color
- Shadows appear where colors meet (depth)
- Thread sheen visible where light catches surface
