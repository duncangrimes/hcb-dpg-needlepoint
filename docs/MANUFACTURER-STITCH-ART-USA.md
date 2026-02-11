# Stitch Art USA — Manufacturing Partner

**Website:** https://www.stitchartusa.com  
**Status:** Pending vendor confirmation  
**Last Updated:** 2026-02-10

---

## Overview

Stitch Art USA is a US-based needlepoint canvas production company offering custom canvas painting and printing services. Key advantage: **no minimum order requirements** for dropshipping.

## Services

| Service | Available |
|---------|-----------|
| Canvas Painting & Printing | ✅ |
| Custom Design Conversion | ✅ |
| Drop Shipping | ✅ |
| White Label (ships under your brand) | ✅ |
| Single-unit orders | ✅ |

---

## Pricing

> ⚠️ **Not publicly available** — must contact for quotes

### Estimated Range (industry standards)

| Canvas Size | Estimated Cost |
|-------------|----------------|
| Small (8"×8") | $15–25 |
| Medium (12"×12") | $25–40 |
| Large (16"×16"+) | $40–60+ |

### Factors Affecting Price
- Canvas size and mesh count
- Design complexity
- Volume commitments
- Turnaround time

---

## File Output Requirements

> ⚠️ **Awaiting vendor confirmation** — specifications below based on industry standards

### Output Pipeline

**Important:** Manufacturers need **high-resolution continuous images**, not stitch-mapped files.

See [MANUFACTURER-OUTPUT-SPEC.md](./MANUFACTURER-OUTPUT-SPEC.md) for full technical details.

```
Our stitch-mapped PNG  →  Nearest neighbor upscale  →  High-res manufacturer PNG
(130×182 px)                    (~23× at 300 DPI)        (3000×4200 px)
```

### Recommended Specifications

| Spec | Requirement | Notes |
|------|-------------|-------|
| **Format** | PNG (preferred) or JPG | PNG for lossless color accuracy |
| **Resolution** | 300 DPI | Industry standard for quality printing |
| **Color Space** | sRGB | Most compatible with print equipment |
| **Color Profile** | sRGB IEC61966-2.1 | Embedded in file |
| **Interpolation** | Nearest neighbor | Preserves crisp stitch boundaries |
| **Max File Size** | TBD | Likely 50-100 MB acceptable |

### Example Output Dimensions

| Canvas Size | Mesh | Stitch Grid | @ 300 DPI |
|-------------|------|-------------|-----------|
| 10" × 14" | 13 | 130 × 182 | 3000 × 4200 px |
| 12" × 12" | 13 | 156 × 156 | 3600 × 3600 px |
| 14" × 14" | 13 | 182 × 182 | 4200 × 4200 px |

### Open Questions (confirm with vendor)

- [ ] Preferred file format (PNG vs JPG?)
- [ ] Exact DPI requirement (200, 300, or flexible?)
- [ ] Maximum file size limits
- [ ] Color calibration requirements
- [ ] Submission method (upload portal, email, API?)

---

## Production Timeline

| Stage | Estimated |
|-------|-----------|
| Custom Design Work | ~1 week |
| Canvas Production | TBD |
| US Shipping | 3–7 days |
| **Total** | **~2–3 weeks** |

---

## Integration Questions

### Technical
- [ ] What file formats do you accept? (We can provide PNG or JPG)
- [ ] What resolution/DPI do you require? (We default to 300 DPI)
- [ ] Do you accept high-res continuous images? (Not low-res stitch-mapped files)
- [ ] What mesh counts do you offer? (We currently support 13, 14, 18 mesh)
- [ ] Do you have an API for automated order submission?
- [ ] What's the maximum file size for uploads?

### Business
- [ ] Per-canvas pricing at 1, 10, 50, 100 units/month?
- [ ] Typical turnaround time?
- [ ] API or automated order submission?
- [ ] Available canvas sizes?

### Quality
- [ ] Is this true stitch-printing (aligned to mesh) or direct printing?
- [ ] Can you send sample canvases?
- [ ] What brand of canvas (Zweigart, etc.)?

---

## Comparison: Stitch Art USA vs Contrado

| Factor | Stitch Art USA | Contrado |
|--------|----------------|----------|
| Location | USA | UK |
| Minimum Orders | None | None |
| Print Type | Stitch-printed (TBC) | Direct print (not stitch-aligned) |
| White-label | ✅ | ✅ |
| Dropship | ✅ | ✅ (Shopify integration) |
| US Shipping | 3–7 days | 5–10 days |
| Pricing | Contact for quote | ~$18–30/canvas |
| API | Unknown | Shopify app |

**Recommendation:** Prefer Stitch Art USA if they offer true stitch-printing.

---

## Next Steps

1. Contact Stitch Art USA — request pricing and file specs
2. Order test canvas — evaluate print quality
3. Confirm stitch-printing — verify mesh-aligned colors
4. Discuss API/automation
5. Update this document with confirmed details

---

## Contact

**Services Page:** https://www.stitchartusa.com/pages/services
