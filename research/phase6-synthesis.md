# Phase 6: Synthesis — Research Alignment & Implementation Plan

**Date:** February 4, 2026
**Purpose:** Reconcile all research findings, evaluate whether the current app architecture supports our goals, and chart a clear path forward.

---

## I. Research Alignment Check

### Do Our Findings Agree?

Yes — all four research phases converge on the same fundamental insight:

> **The current pipeline treats the entire photo as a single image and tries to quantize it into a stitchable grid. The research says we should instead: isolate the subject, simplify it into an illustration, generate a clean background separately, and composite them.**

Here's how each phase supports this:

| Phase | Key Finding | Alignment |
|---|---|---|
| **Phase 1: Market** | 70-80% of best sellers use "centered icon + simple background" | ✅ Confirms our target format |
| **Phase 2: Stitchability** | Confetti (isolated pixels) is the #1 quality problem; need min region sizes, limited colors | ✅ Current pipeline's confetti comes from treating the whole photo — separation would naturally reduce it |
| **Phase 3: Design** | Professional designers isolate, simplify, outline, and generate backgrounds separately | ✅ Directly prescribes the new architecture |
| **Phase 4-5: Technical** | Existing converters all do naive pixel mapping; no one does subject isolation; massive market gap | ✅ Confirms the opportunity and the technical approach |

### Where Research Phases Disagree or Add Nuance

**Color count:** Phase 1 shows popular canvases use 5-15 colors. Phase 2 recommends 8-15 as the sweet spot. The current pipeline supports 12-30. **Resolution: Cap at 20, default to 12, recommend 8-12 for small canvases.**

**Dithering:** Phase 2 says confetti is terrible, but our pipeline uses Floyd-Steinberg dithering which *intentionally creates* scattered color mixing. **This is a core tension.** Dithering improves visual smoothness but hurts stitchability. **Resolution: Dithering should be optional and OFF by default for the subject. It may be useful for gradient effects in specific cases, but the default mode should be flat color fills.**

**Background complexity:** Phase 1 shows gingham as the hottest trend. Phase 3 catalogs 12+ background options. Phase 2 says backgrounds should be simple (1-2 colors, large regions). **Resolution: Offer a library of simple pattern templates. Don't derive backgrounds from the photo.**

---

## II. Does the Current App Align With Research?

### What the Current Pipeline Does Well ✅

1. **DMC thread mapping** — Solid implementation, maps quantized colors to real purchasable threads
2. **Stitchability scoring** — Good start with horizontal run length measurement
3. **Majority filter** — Addresses confetti problem (partially)
4. **Wu's quantization** — Better than k-means for smooth color transitions
5. **Perceptual color space** — Using OKLab for dithering and color matching
6. **Adaptive preprocessing** — Edge density analysis to adjust blur
7. **Solid architecture** — Next.js + Prisma + Vercel is a good production stack
8. **1 pixel = 1 stitch** — Correct fundamental model

### What Needs to Change ❌

1. **No subject isolation** — The entire photo goes through the same pipeline. This is the #1 architectural gap. The background gets quantized along with the subject, wasting colors on irrelevant detail and creating noisy boundaries.

2. **No background generation** — The background comes from the photo. It should be independently generated (solid, gingham, stripes, etc.) and composited with the isolated subject.

3. **Dithering creates confetti** — Floyd-Steinberg error diffusion intentionally scatters pixels to simulate gradients. This is the opposite of what stitchers want. Flat color fills with sharp boundaries are preferred.

4. **No outline generation** — Professional canvases almost always have a dark outline around the subject. Our pipeline doesn't add one.

5. **Color count isn't size-aware** — Pipeline accepts any numColors. Should enforce size-based limits (8-10 for small, 12-15 for medium, max 20).

6. **Stitchability score is too narrow** — Only measures horizontal run length. Needs connected-component analysis, confetti percentage, vertical runs, boundary density, color distinctness (the 8-metric scorecard from Phase 2).

7. **No color distinctness check** — Two palette colors could be nearly identical, confusing stitchers. Need minimum ΔE between palette colors.

8. **Double saturation boost** — Saturation is boosted in BOTH the resize step (1.3x) AND the quantization step (1.6x + 1.4x enhancement). This compounds to extreme over-saturation. Needs calibration.

### Verdict: Architecture Needs Restructuring

The current pipeline is a solid v1 prototype that proves the core concept works. But to produce canvases that match what people actually buy, we need to **restructure around subject/background separation**. This isn't a tweak — it's a paradigm shift from "process the whole photo" to "compose a designed canvas from a photo reference."

---

## III. The New Pipeline Architecture

### Current Flow
```
Photo → Resize → Color Correct → Quantize → Map to DMC → Dither → Majority Filter → Score → Output
```

### Proposed Flow
```
Photo
  ├── SUBJECT PATH
  │   ├── AI Background Removal (rembg/SAM)
  │   ├── Optional: AI Style Simplification
  │   ├── Resize to target stitch dimensions
  │   ├── Color Quantize (limited palette, NO dithering by default)
  │   ├── Map to DMC threads
  │   ├── Connected-component cleanup (dissolve tiny regions)
  │   ├── Edge smoothing
  │   └── Outline generation (1-2px dark border)
  │
  ├── BACKGROUND PATH
  │   ├── User selects background type (solid, gingham, stripes, etc.)
  │   ├── User selects background color(s)
  │   └── Generate pixel-perfect background pattern at stitch resolution
  │
  └── COMPOSITE
      ├── Place subject centered on background
      ├── Final connected-component cleanup
      ├── Stitchability scorecard v2 (8 metrics)
      ├── Thread count computation
      └── Output manufacturer image
```

### Key Architectural Changes

**1. Subject Isolation Layer (NEW)**
- Add `rembg` as a dependency (Python, but can call via child process or use ONNX model in Node.js)
- Alternative: Use a hosted API for background removal (remove.bg, Clipdrop)
- Alternative: Client-side using a WASM/ONNX model (SAM has ONNX export)
- Produces a mask separating subject from background

**2. Background Generator (NEW)**
- New module: `src/lib/background/`
- Generates pixel-perfect repeating patterns at the exact stitch dimensions
- Patterns implemented as functions: `generateSolid()`, `generateGingham()`, `generateStripes()`, `generatePolkaDots()`, `generateChevron()`, etc.
- Each pattern takes: `width`, `height`, `color1`, `color2?`, `patternSize?`

**3. Subject Simplification (ENHANCED)**
- After isolation, quantize ONLY the subject pixels
- Use flat color fills (no dithering) as default
- Fewer colors allocated to subject vs. overall (3-8 subject colors + 1-2 background + 1 outline)
- Connected-component analysis to merge regions smaller than N stitches

**4. Outline Generation (NEW)**
- Detect subject boundary from the mask
- Add a 1-2 pixel dark outline (user-selectable color, default: black or darkest palette color)
- Outline sits between subject and background

**5. Compositor (NEW)**
- Layers: Background → Outline → Subject
- Ensures clean edges at layer boundaries
- Final cleanup pass

**6. Enhanced Stitchability Scoring (ENHANCED)**
- Implement all 8 metrics from Phase 2
- Composite score with thresholds
- Auto-flag canvases that score below 70

---

## IV. Does Building This App Make Sense?

### Market Opportunity Assessment

**YES**, unequivocally. Here's why:

**1. Clear Market Gap**
- NeedlePaint is the only real competitor, and they explicitly warn that "some photos are just too complicated for needlepoint"
- No tool does intelligent subject extraction for needlepoint
- Cross-stitch tools exist but are generic and produce poor needlepoint results
- Zero tools optimize for stitchability

**2. Validated Demand**
- Custom/personalized needlepoint commands 15-30% price premiums
- NeedlePaint has built a successful business on this exact premise (custom photo canvases)
- Pet portraits and personalized gifts are the fastest-growing categories
- Subscription models prove ongoing engagement (Gnome of the Month, etc.)

**3. Technical Feasibility**
- AI background removal (rembg) is mature, fast, and free/open-source
- The core pipeline (quantization, DMC mapping, stitchability) already works
- Subject simplification can be achieved with existing image processing techniques
- Background generation is straightforward pixel-level pattern rendering

**4. Competitive Moat**
- AI-powered subject extraction + stitchability optimization is a real differentiator
- The combination of "cute character isolation" + "background pattern library" + "stitchability scoring" doesn't exist anywhere
- First-mover advantage in a space where competitors are doing naive pixel conversion

**5. Unit Economics**
- NeedlePaint charges $38-209+ per canvas
- Our per-canvas cost is primarily compute (AI inference) + materials (canvas + thread)
- Compute cost per canvas: likely <$1 (rembg is fast, quantization is CPU-only)
- Canvas + thread materials: ~$15-30 depending on size
- Potential margin: 50-70% on kits priced at $45-150

### Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Output quality not good enough | High | Iterative testing with real stitchers; HCB as alpha tester |
| AI subject extraction fails on complex photos | Medium | Offer manual mask editing; guide users to use clear photos |
| Manufacturing quality issues | Medium | Partner with established printer (or use NeedlePaint-style Zweigart + digital printing) |
| Small market | Low | Needlepoint is a $100M+ US market; custom segment is growing fastest |
| NeedlePaint copies our approach | Low | They're craft-focused, not tech-focused; our ML advantage is hard to replicate quickly |

### Recommendation

**Build it.** The research validates every aspect of the concept. The market gap is clear, the technology is available, and the current codebase gives us a 3-month head start on anyone starting from scratch.

---

## V. Implementation Roadmap

### Phase A: Foundation (Week 1-2)
*Branch: `feature/subject-isolation`*

**Goal:** Add subject isolation and background generation capabilities.

**Tasks:**
1. Integrate background removal
   - Evaluate: rembg via Python subprocess vs. ONNX runtime in Node vs. hosted API
   - Implement mask generation from uploaded photo
   - Add mask preview to UI
   
2. Build background pattern generator
   - Create `src/lib/background/` module
   - Implement: `solid`, `gingham`, `stripes`, `polkaDots`
   - Each takes: dimensions, colors, pattern scale
   - Test output at various stitch counts

3. Build compositor
   - Layer background + subject using mask
   - Center subject on canvas
   - Handle edge blending

### Phase B: Subject Simplification (Week 2-3)
*Branch: `feature/subject-simplification`*

**Goal:** Make the subject look like a designed needlepoint illustration, not a pixelated photo.

**Tasks:**
1. Refactor quantization to process subject-only pixels
   - Mask out background before color quantization
   - Allocate color budget: N colors for subject, 1-2 for background, 1 for outline
   
2. Add "no-dither" mode as default
   - Quantize to flat color fills
   - Optional dithering toggle for users who want it
   
3. Connected-component cleanup
   - After quantization, identify all contiguous regions
   - Dissolve regions smaller than `minRegionSize` (default: 6) into nearest large neighbor
   - Re-run until no small regions remain

4. Edge smoothing
   - Smooth jagged boundaries between color regions
   - Majority vote along edges (1-pixel border smoothing)

5. Outline generation
   - Detect subject boundary from mask
   - Draw 1-2px outline in selected dark color
   - Place outline between subject and background layers

### Phase C: Enhanced Stitchability (Week 3-4)
*Branch: `feature/stitchability-v2`*

**Goal:** Implement the full 8-metric stitchability scorecard.

**Tasks:**
1. Connected-component analysis module
   - Flood-fill based region labeling
   - Region size counting
   - Confetti percentage calculation

2. Enhanced scoring
   - Horizontal run length (existing, refactor)
   - Vertical run length (new)
   - Min/avg region size (new)
   - Confetti percentage (new)
   - Boundary density (new)
   - Color distinctness — min ΔE2000 between palette colors (new)
   - Color count relative to canvas size (new)
   - Composite weighted score

3. Auto-optimization loop
   - If score < 70: auto-increase majority filter, reduce colors, re-run
   - Report to user: "We simplified your design to improve stitchability"

4. Size-aware color limits
   - Enforce max colors based on canvas dimensions
   - Small (≤6"): max 10 | Medium (6-12"): max 15 | Large (12"+): max 20

### Phase D: UI & User Experience (Week 4-5)
*Branch: `feature/canvas-designer-ui`*

**Goal:** Let users control the new features.

**Tasks:**
1. Background selector UI
   - Pattern type picker (solid, gingham, stripes, dots, chevron)
   - Color picker for background colors
   - Live preview

2. Subject preview
   - Show isolated subject before processing
   - Allow user to adjust crop/position
   - Subject size slider (% of canvas)

3. Style presets
   - "Preppy" — bright colors, gingham background, bold outline
   - "Modern" — muted palette, solid background, thin outline
   - "Classic" — traditional colors, solid background
   - "Custom" — user controls everything

4. Stitchability dashboard
   - Show all 8 metrics visually
   - Overall score with color coding (green/yellow/red)
   - Tips: "Try reducing colors" or "Your design scores 85/100 — great stitchability!"

5. Thread list improvements
   - Show DMC number, color swatch, name, stitch count, estimated skeins needed
   - Sortable by stitch count

### Phase E: Polish & Testing (Week 5-6)
*Branch: `feature/testing-polish`*

**Goal:** Validate with real users and iterate.

**Tasks:**
1. Test with HCB (alpha tester!)
   - Process 10+ real photos through the new pipeline
   - Compare output to existing popular canvases
   - Get stitchability feedback from an actual stitcher

2. A/B comparison
   - Old pipeline vs. new pipeline side-by-side
   - Document improvements quantitatively (stitchability scores)

3. Edge cases
   - Very simple subjects (monograms, logos)
   - Very complex subjects (group photos, busy scenes)
   - Low-quality input photos
   - Various canvas sizes (4" to 14")

4. Performance optimization
   - Profile AI inference time
   - Optimize connected-component analysis for large canvases
   - Consider caching/precomputing background patterns

---

## VI. Quick Wins (Can Do Now)

Before the big architectural changes, these improvements to the *existing* pipeline would immediately improve output quality:

1. **Fix double saturation boost** — Remove the redundant saturation boost in quantization (it's already boosted in resize). This is likely causing over-saturated, unnatural colors.

2. **Add color distinctness check** — After DMC mapping, verify min ΔE2000 ≥ 8 between all palette colors. Merge colors that are too similar.

3. **Increase majority filter** — Try 5×5 kernel or 2 passes of 3×3 to further reduce confetti.

4. **Make dithering optional** — Add a `dither: boolean` parameter. When off, assign each pixel to its nearest palette color without error diffusion. Test both modes.

5. **Add size-based color limits** — Enforce max color counts based on canvas size to prevent over-complex patterns.

---

## VII. Summary

| Question | Answer |
|---|---|
| Does our research align? | ✅ Yes — all 4 phases converge on subject isolation + background generation |
| Does the current app support this? | ⚠️ Partially — good foundation, but needs architectural restructuring |
| Should we build this? | ✅ Absolutely — clear market gap, validated demand, technical feasibility confirmed |
| What's the biggest change needed? | Subject/background separation (new AI layer + compositor) |
| How long to implement? | ~5-6 weeks for full pipeline overhaul |
| What can we do right now? | Quick wins: fix saturation, add color checks, make dithering optional |

---

*Research complete. All findings documented in `research/` directory. Ready for implementation planning with Duncan.*
