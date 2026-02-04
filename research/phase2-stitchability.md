# Phase 2: Stitchability Deep Dive

**Research Date:** February 3-4, 2026
**Purpose:** Define exactly what makes a needlepoint canvas enjoyable and practical to stitch, expressed as quantifiable metrics a computer can evaluate.

---

## Executive Summary

"Stitchability" is the ease and enjoyment with which a stitcher can complete a canvas. It is the single most important quality differentiator between a photo-to-needlepoint conversion that looks like a pixelated photo and one that feels like a *designed needlepoint canvas*.

Our current pipeline measures stitchability as average horizontal run length. This is a good start but far too narrow. This document defines a comprehensive stitchability framework with 8 quantifiable metrics.

**The core insight:** Great needlepoint canvases are fundamentally *simple*. They use few colors, have large contiguous regions, clear boundaries, and minimal "noise." The challenge is achieving visual appeal *within* these constraints — not despite them.

---

## I. The Confetti Problem

### What Is Confetti?

"Confetti stitching" refers to isolated single stitches or tiny clusters (2-3 stitches) of a color surrounded by different colors. The term comes from the cross-stitch community where it's the #1 complaint about photo-conversion patterns.

### Why Stitchers Hate It

From community research (Reddit r/CrossStitch, r/Needlepoint, forums):

1. **Constant thread changes**: Each isolated stitch requires starting a new thread, stitching 1-3 stitches, ending the thread, and picking up a new color. A single confetti stitch might take 10x longer than one stitch in a run.
2. **Thread waste**: Starting and ending threads consumes extra thread for anchoring (typically 1-2 inches on each end). Isolated stitches waste more thread than they use.
3. **Back-of-canvas mess**: Many isolated thread starts/stops create a thick, tangled back that's hard to manage and can show through on the front.
4. **Mental fatigue**: Constantly tracking which tiny area gets which color is exhausting. Stitchers describe it as "soul-crushing."
5. **Error-prone**: Easy to miscount or place the wrong color when dealing with scattered single stitches.

### Community Consensus

- **Zero tolerance for single isolated pixels**: No single-stitch color islands should exist in a finished pattern.
- **Minimum cluster size of 4-6 stitches** is widely considered the floor for a "reasonable" color area.
- **Preferred minimum: 8-10+ stitches** per color region for a pleasant stitching experience.
- **Photo-conversion patterns are notorious** for confetti — this is the primary reason stitchers avoid them. Pattern "mills" on Etsy that auto-convert photos are universally criticized.

### What This Means for Our Pipeline

Our 3×3 majority filter is a good start but may not be aggressive enough. A single pixel surrounded by different colors gets corrected, but a scattered group of 2-3 same-color pixels may survive filtering. We need to consider:
- Larger filter windows (5×5) for backgrounds
- Connected-component analysis to find and eliminate small isolated regions
- Minimum region size enforcement (dissolve regions smaller than N stitches into their neighbors)

---

## II. Optimal Color Count

### What Do Popular Canvases Use?

Based on Phase 1 market analysis and needlepoint industry norms:

| Canvas Type | Typical Color Count | Notes |
|---|---|---|
| Simple ornaments (4") | 5-10 colors | Best sellers, quick projects |
| Key fobs / small items | 4-8 colors | Minimal palette |
| Medium canvases (8-12") | 10-18 colors | Standard painted canvases |
| Large pillows (14"+) | 12-25 colors | More room for detail |
| Complex designs | 20-35 colors | High-end hand-painted, experienced stitchers |
| Photo conversions (bad) | 40-80+ colors | What we want to AVOID |

### The Sweet Spot

**8-15 colors** is the sweet spot for our target market (small-to-medium canvases with centered icons).

Rationale:
- **Fewer than 8**: Hard to achieve recognizable subjects with enough depth
- **8-12**: Ideal for ornaments and small canvases; "cute" aesthetic
- **12-18**: Good for medium canvases; allows shading and detail
- **More than 20**: Starts to feel complex; only for large or experienced-stitcher canvases
- **More than 30**: Approaches photo-conversion territory; thread management becomes a project itself

### Color Count Rules

For our pipeline, recommended constraints:
- **Small canvases (≤6")**: MAX 10 colors
- **Medium canvases (6-12")**: MAX 15 colors
- **Large canvases (12"+)**: MAX 20 colors
- **Never exceed 25 colors** regardless of canvas size

### Color Similarity Constraint

Having 15 colors is fine — having 15 colors where 4 of them are barely distinguishable blues is NOT fine. Adjacent colors in the palette must have sufficient perceptual distance.

- **Minimum ΔE (CIEDE2000)**: 8-10 between any two colors in the palette
- **Recommended ΔE**: 12+ for adjacent regions (colors that border each other on the canvas)
- **Practical test**: If a stitcher can't tell two colors apart at arm's length under normal lighting, they shouldn't both be in the palette

---

## III. Run Length Analysis

### What Is Run Length?

Run length measures consecutive same-color stitches in a row (horizontal) or column (vertical). Longer runs = easier stitching.

### Current Implementation

Our pipeline calculates average horizontal run length and rates it:
- **>7**: Excellent
- **5-7**: Good
- **3-5**: Fair
- **<3**: Poor

### Expanded Run Length Metrics

We should measure run length in BOTH directions and also consider the distribution:

**Horizontal Run Length (HRL)**:
- Measures consecutive same-color stitches left-to-right per row
- **Target average: ≥6 for backgrounds, ≥3 for subject areas**
- **Minimum: No runs of 1** (isolated stitches)

**Vertical Run Length (VRL)**:
- Measures consecutive same-color stitches top-to-bottom per column
- Important because many stitchers work in columns (continental stitch)
- **Target average: ≥4**

**Run Length Distribution**:
- Don't just measure the average — measure the DISTRIBUTION
- A canvas with average HRL of 6 that's mostly 1s and 20s is worse than one that's mostly 4s and 8s
- **Target: <5% of runs should be length 1-2**
- **Target: Median run length ≥4**

### Thread Changes Per Row

This is the practical metric stitchers actually feel:
- Count how many times the color changes in a single row
- **Good: ≤5 changes per row** for small canvases
- **Acceptable: ≤8 changes per row** for medium canvases
- **Bad: >12 changes per row** — feels like confetti

---

## IV. Region Analysis

### Connected Component Metrics

Beyond run length, we need to analyze the *shape* and *size* of contiguous color regions.

**Region Size Distribution**:
- Use flood-fill / connected-component labeling to identify all contiguous same-color regions
- For each region, count the number of stitches (pixels)
- **Minimum region size: 4 stitches** (absolute floor)
- **Preferred minimum: 8 stitches**
- **Confetti percentage**: % of total stitches in regions smaller than 4 stitches
  - **Target: <2%** of stitches in confetti regions
  - **Acceptable: <5%**
  - **Bad: >10%** — pattern will be frustrating

**Region Shape**:
- Compact regions (roughly square/circular) are easier to stitch than long thin slivers
- A 10-stitch region that's 1×10 is harder than one that's 3×3+1
- Measure compactness as `area / (perimeter²)` — higher is more compact
- Target: avoid regions with compactness ratio < 0.05 (very elongated)

### Background vs. Subject

The canvas should be naturally divisible into:
1. **Background**: Large, simple, uniform regions (or repeating patterns)
2. **Subject**: More detailed, smaller regions acceptable

Different stitchability standards should apply:
- **Background regions**: Average size ≥20 stitches, ideally ≥50
- **Subject regions**: Average size ≥6 stitches, minimum 4

---

## V. Edge Complexity

### Why Edges Matter

The boundaries between color regions determine how "clean" or "jagged" a canvas looks. Smooth, intentional-looking edges are a hallmark of well-designed canvases. Noisy, jagged edges scream "auto-converted from a photo."

### Measuring Edge Complexity

**Edge Smoothness Score**:
- Trace the boundary between each pair of adjacent color regions
- Measure how "jagged" the boundary is vs. a smoothed version
- A straight horizontal or vertical line = perfectly smooth
- A diagonal staircase = expected, acceptable
- Random zigzag noise = bad

**Quantification**:
- For each boundary pixel, count how many of its 4 neighbors are in a different region
- **Boundary density**: total boundary pixels / total pixels
  - **Simple designs**: <20% of pixels are boundary pixels
  - **Complex designs**: 20-35%
  - **Over-complex**: >35% — too many edges, probably confetti

**Staircase regularity**:
- Diagonal lines should form regular staircases (1-pixel steps), not irregular jagged patterns
- Measure the variance of step lengths along diagonal boundaries
- Low variance = regular, intentional-looking edges
- High variance = noisy, auto-generated-looking edges

---

## VI. Background Stitch Patterns

### Why This Matters for Our Product

Duncan specified that ideal canvases have "a simple pattern or solid background." In traditional needlepoint, backgrounds are often stitched in decorative patterns rather than plain tent stitch. This is a major differentiator between our product and a simple photo conversion.

### Most Popular Background Treatments

From research across retailers and stitch guides:

**1. Basketweave (Tent Stitch)**
- The default. Small diagonal stitches covering one canvas intersection each.
- Used for detailed areas and simple backgrounds.
- Easy to do, durable, doesn't distort canvas.
- Our current pipeline assumes tent stitch everywhere.

**2. Scotch Stitch**
- Groups of diagonal stitches forming squares (typically 3×3 or 5×5).
- Creates a textured checkerboard appearance.
- Very popular for backgrounds — adds visual interest with one color.
- **Key insight**: This is a PATTERN that could be represented in our pixel grid as alternating stitch directions, or simply as solid color (the stitcher adds the pattern).

**3. Mosaic Stitch**
- Like mini scotch stitch — 2×2 diagonal groups.
- Creates a subtle woven texture.
- Good for smaller background areas.

**4. Brick Stitch**
- Horizontal stitches stacked in an offset brick pattern.
- Simple, fast to stitch, covers canvas well.
- Good for large solid areas.

**5. Diagonal Patterns (Byzantine, Milanese)**
- Diagonal staircases of long stitches.
- Create dynamic visual movement.
- Popular for intermediate+ stitchers.

**6. Bargello**
- Vertical stitches of varying lengths creating flame-like wave patterns.
- Can be done in multiple colors for gradient effects.
- Very trendy; "modern" bargello is popular on Instagram.

### Implication for Our Pipeline

For our manufacturer image, backgrounds will be painted as solid colors (or simple two-color patterns). The stitcher or stitch guide then specifies *which stitch pattern* to use for the background.

**Our job**: Ensure the background is a clean, continuous region that's suitable for decorative stitching. This means:
- Background regions should be LARGE (preferably one continuous area)
- Background should use 1-2 colors maximum
- Background edges against the subject should be clean and well-defined
- No subject-color "speckles" in the background

---

## VII. Thread System Considerations

### DMC Palette Constraints

From Phase 4-5 research:
- ~500 standard DMC floss colors
- Colors organized in families with shade progressions
- Some color ranges are better represented than others
- Greens had a blue/brown bias (partially fixed with 2018 additions)
- True neutral greys were lacking (fixed in 2018)
- Dark skin tones were underserved (partially fixed in 2018)

### What This Means for Stitchability

- **Thread availability**: All colors in our palette must map to real, purchasable DMC colors
- **Color distinguishability on canvas**: Thread colors that look different on a screen may look identical when stitched. Thread has texture, sheen, and interacts with canvas color.
- **Standard palette subsets**: Consider offering curated sub-palettes:
  - "Bright & Bold": High-saturation primaries (good for preppy/modern)
  - "Soft & Classic": Muted, warm tones (good for traditional)
  - "Nature": Earth tones + greens (good for animals, landscapes)

---

## VIII. Quantified Stitchability Scorecard v2

### Proposed Metrics

Here are 8 metrics, each computable from a pixel grid, with clear thresholds:

| # | Metric | What It Measures | How to Calculate | Good | Acceptable | Bad |
|---|---|---|---|---|---|---|
| 1 | **Color Count** | Palette complexity | Count unique colors | ≤12 | 13-20 | >20 |
| 2 | **Confetti %** | Isolated stitch percentage | % of stitches in regions < 4 pixels | <2% | 2-5% | >5% |
| 3 | **Avg Horizontal Run** | Ease of row stitching | Mean consecutive same-color per row | ≥6 | 4-6 | <4 |
| 4 | **Avg Vertical Run** | Ease of column stitching | Mean consecutive same-color per column | ≥5 | 3-5 | <3 |
| 5 | **Min Region Size** | Smallest color area | Min connected-component size (stitches) | ≥8 | 4-7 | <4 |
| 6 | **Avg Region Size** | Overall simplicity | Mean connected-component size | ≥30 | 15-30 | <15 |
| 7 | **Boundary Density** | Edge complexity | Boundary pixels / total pixels | <20% | 20-30% | >30% |
| 8 | **Color Distinctness** | Can stitcher tell colors apart? | Min ΔE2000 between any two palette colors | ≥12 | 8-12 | <8 |

### Composite Score

Weighted composite (suggested weights based on impact on stitcher experience):

```
stitchability_score = (
  0.25 × confetti_score +          // Most impactful — confetti ruins the experience
  0.20 × region_size_score +       // Large regions = satisfying stitching
  0.15 × h_run_score +             // Horizontal flow
  0.10 × v_run_score +             // Vertical flow
  0.10 × color_count_score +       // Simplicity
  0.08 × boundary_score +          // Clean edges
  0.07 × color_distinct_score +    // Can tell colors apart
  0.05 × min_region_score          // No tiny orphans
)
```

Each sub-score normalized to 0-100, where:
- 100 = "good" threshold met
- 50 = "acceptable" threshold
- 0 = "bad" threshold

**Target composite score: ≥70** for a canvas we'd ship.

---

## IX. Simplicity as a Design Principle

### The Simplicity Hierarchy

For our product, simplicity should be valued at every level:

1. **Fewer colors > more colors** (at equal visual quality)
2. **Larger regions > smaller regions** (at equal detail)
3. **Smooth edges > jagged edges** (at equal accuracy)
4. **Solid/patterned backgrounds > complex backgrounds** (always)
5. **Clear subject/background separation > gradual transitions**

### How to Enforce Simplicity in the Pipeline

1. **Aggressive quantization**: Use fewer colors than technically possible. It's better to have 10 well-chosen colors than 20 mediocre ones.
2. **Post-quantization cleanup**: After color reduction, run connected-component analysis and dissolve tiny regions into their largest neighbor.
3. **Edge smoothing**: After all color assignments, smooth jagged boundaries by majority-voting along edges.
4. **Background detection**: Identify the largest contiguous region(s) and enforce uniformity — any speckling in the background gets cleaned up.
5. **Subject simplification**: Reduce detail in the subject to what's recognizable at the target stitch count. A 50-stitch-wide face doesn't need nostril detail.

### The "Squint Test"

A good needlepoint canvas should be recognizable when you squint at it. If you need to look pixel-by-pixel to see what it is, it's too complex. This is actually testable:
- Downsample the canvas 4x with nearest-neighbor
- If the subject is still recognizable → good level of simplicity
- If it becomes unrecognizable → too much fine detail, not enough bold shapes

---

## X. Key Takeaways for Pipeline Development

1. **Our current stitchability score (avg horizontal run) captures maybe 15% of what matters.** The full scorecard above is needed.

2. **Confetti elimination is the #1 priority.** This is what separates "pattern mill garbage" from "designed canvas." Our 3×3 majority filter helps but isn't enough — we need connected-component cleanup.

3. **Color count should be capped based on canvas size**, not left as an unbounded user parameter. Less is more.

4. **Background must be treated separately from subject.** Different quality standards apply. The background should be a single clean region.

5. **Edge quality matters more than we think.** Clean, intentional-looking boundaries between colors are what make a canvas look "designed" vs. "auto-generated."

6. **Simplicity is not a compromise — it's the goal.** The best needlepoint canvases are bold, simple, and graphic. This aligns perfectly with what's actually easy to stitch.

---

## Sources

- Reddit r/CrossStitch — Multiple threads on confetti stitching (2018-2026)
- Reddit r/Needlepoint — Community discussions on canvas quality
- Wikipedia "Needlepoint" — Stitch types, canvas construction, techniques
- NeedlepointTeacher.com — Stitch encyclopedia (400+ stitch types documented)
- Needlepoint.com — Skill level categorization (Level 1-4)
- Phase 1 Market Analysis (companion document) — Color counts and formats from popular canvases
- Phase 4-5 Technical Research (companion document) — DMC color system details
- The Needlepoint Book by Jo Ippolito Christensen (referenced) — Industry standard reference
- American Needlepoint Guild standards
- Cross-stitch pattern software reviews (PCStitch, StitchFiddle) — quality control approaches
