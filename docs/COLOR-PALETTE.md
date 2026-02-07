# 🎨 Needlepoint Color Palette

## Design Philosophy
Inspired by the warmth of Etsy, the creativity of Pinterest, and the tool-feel of Canva—but grounded in the tactile, artisanal world of needlecraft. Think yarn, linen, natural dyes, and the cozy feeling of handmade goods.

---

## Core Palette

### Primary — **Terracotta Rose**
A warm, earthy coral that evokes natural dyes and handcrafted textiles.

| Shade | Hex | Usage |
|-------|-----|-------|
| 50 | `#FEF5F3` | Subtle backgrounds |
| 100 | `#FCE8E3` | Hover states |
| 200 | `#FACFBF` | Light accents |
| 300 | `#F6AD93` | Secondary buttons |
| 400 | `#EF8360` | Hover primary |
| **500** | `#E86142` | **Primary brand** |
| 600 | `#D34429` | Pressed states |
| 700 | `#B1341F` | Dark accents |
| 800 | `#922E1F` | Heavy emphasis |
| 900 | `#7A2B20` | Darkest |
| 950 | `#42120B` | Near-black |

### Secondary — **Sage Olive**
A muted, natural green that grounds the palette and feels organic.

| Shade | Hex | Usage |
|-------|-----|-------|
| 50 | `#F6F7F4` | Light backgrounds |
| 100 | `#E9ECE4` | Cards (light mode) |
| 200 | `#D4DACC` | Borders |
| 300 | `#B8C2A8` | Disabled states |
| 400 | `#98A67F` | Secondary text |
| **500** | `#7A8A5E` | **Secondary brand** |
| 600 | `#5F6E48` | Dark secondary |
| 700 | `#4B5639` | Dark mode accents |
| 800 | `#3E462F` | Dark surfaces |
| 900 | `#353C29` | Dark backgrounds |
| 950 | `#1B1F14` | Darkest |

### Accent — **Golden Thread**
A rich amber/gold that evokes metallic thread and premium craft supplies.

| Shade | Hex | Usage |
|-------|-----|-------|
| 50 | `#FFFBEB` | Highlight backgrounds |
| 100 | `#FEF3C7` | Badges, tags |
| 200 | `#FDE68A` | Hover accents |
| 300 | `#FCD34D` | Active states |
| **400** | `#FBBF24` | **Accent brand** |
| 500 | `#F59E0B` | Strong accent |
| 600 | `#D97706` | Pressed accent |
| 700 | `#B45309` | Dark accent |
| 800 | `#92400E` | Heavy accent |
| 900 | `#78350F` | Darkest |

---

## Neutral — **Stone**
Warm grays with a slight cream undertone, like natural fabric.

| Shade | Hex | Usage |
|-------|-----|-------|
| 50 | `#FAFAF8` | Page background (light) |
| 100 | `#F5F4F0` | Card background |
| 200 | `#E8E6E0` | Borders, dividers |
| 300 | `#D4D1C8` | Placeholder text |
| 400 | `#A8A49A` | Disabled text |
| 500 | `#7A756C` | Secondary text |
| 600 | `#5C5850` | Body text |
| 700 | `#45423C` | Headings |
| 800 | `#2D2B27` | Dark mode surfaces |
| 900 | `#1E1D1A` | Dark mode bg |
| 950 | `#0F0E0D` | True dark |

---

## Semantic Colors

### Success — **Moss**
- Light: `#D1FAE5`
- Base: `#059669`
- Dark: `#047857`

### Error — **Berry**
- Light: `#FEE2E2`
- Base: `#DC2626`
- Dark: `#B91C1C`

### Warning — **Honey**
- Light: `#FEF3C7`
- Base: `#D97706`
- Dark: `#B45309`

### Info — **Indigo Stitch**
- Light: `#E0E7FF`
- Base: `#4F46E5`
- Dark: `#4338CA`

---

## Usage in Code

Tailwind classes use `terracotta-{shade}` for primary, `sage-{shade}` for secondary, `amber-{shade}` for accent, and `stone-{shade}` for neutrals.

```jsx
// Primary button
<button className="bg-terracotta-500 hover:bg-terracotta-600 text-white">
  Create Pattern
</button>

// Secondary/ghost button
<button className="border border-sage-300 text-sage-600 hover:bg-sage-50">
  Cancel
</button>

// Accent highlight
<span className="bg-amber-100 text-amber-700 px-2 py-1 rounded">
  NEW
</span>
```
