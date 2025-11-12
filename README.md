This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Image Processing Pipeline

The application converts raw images into manufacturing-ready needlepoint patterns where each pixel represents one stitch. The pipeline prioritizes stitchability (practical stitching patterns) over pure visual aesthetics.

### Pipeline Overview

The complete pipeline processes images through the following steps:

#### 1. **Metadata Extraction**
- Extracts image dimensions and aspect ratio from the original image
- Used to calculate proper stitch dimensions

#### 2. **Stitch Dimension Calculation**
- Calculates target dimensions based on canvas width (inches) and mesh count (stitches per inch)
- Ensures the output matches the physical canvas size

#### 3. **Edge Density Analysis** (Adaptive Pre-processing)
- Uses Sobel operator to detect edges and calculate image complexity
- Determines edge density ratio (percentage of edge pixels)
- **Purpose**: Identifies high-detail images that need more aggressive noise reduction

#### 4. **Resize with Adaptive Blur**
- Resizes image to exact stitch dimensions using Lanczos3 interpolation
- Applies adaptive blur based on edge density:
  - **High-detail images** (>25% edge density): sigma = 1.0 (moderate blur to reduce noise)
  - **Normal images** (≤25% edge density): sigma = 0.3 (minimal blur to preserve sharpness)
- Applies moderate saturation boost (1.3x) and slight brightness adjustment (1.02x)
- **Purpose**: Reduces noise in complex images while preserving detail in simple designs

#### 5. **Color Correction**
- **Auto White Balance**: Neutralizes color casts (e.g., green from foliage) using gray world assumption
- **LAB Color Space Processing**: Converts to LAB for perceptual accuracy, applies subtle adjustments
- **Purpose**: Ensures accurate color representation before quantization

#### 6. **Color Quantization** (Wu's Algorithm)
- Reduces image to the specified number of colors (typically 12-30)
- Uses Wu's quantizer for smoother color transitions
- **Purpose**: Creates a limited palette suitable for thread colors

#### 7. **Thread Mapping**
- Maps quantized colors to actual thread colors from the DMC palette
- Filters to vibrant threads only
- **Purpose**: Ensures all colors in the pattern correspond to available thread shades

#### 8. **Perceptual Dithering**
- Applies Floyd-Steinberg dithering in OKLab color space for perceptual accuracy
- Uses error diffusion to simulate gradients with limited colors
- **Purpose**: Improves visual quality while maintaining discrete thread colors

#### 9. **Majority Filtering** (Post-processing)
- Applies 3×3 majority filter to remove isolated pixels and small clusters
- Each pixel is set to the most common color in its 3×3 neighborhood
- **Purpose**: Eliminates "confetti" patterns (isolated 1-2 pixel clusters) that are impractical to stitch
- **Impact**: Reduces thread changes by consolidating small color regions

#### 10. **Thread Counting**
- Counts stitches per thread color by analyzing the final image
- Maps RGB colors to thread colors and counts occurrences
- **Purpose**: Provides material estimation (helps users determine skeins needed)

#### 11. **Stitchability Score Calculation**
- Calculates average horizontal run length (consecutive same-color stitches per row)
- **Score Interpretation**:
  - **>7**: Excellent (long runs, easy to stitch)
  - **5-7**: Good (reasonable runs)
  - **3-5**: Fair (moderate color changes)
  - **<3**: Poor (many color changes, consider reducing colors)
- **Purpose**: Quantifies pattern practicality and flags patterns that may need re-processing

### Key Design Principles

- **1 Pixel = 1 Stitch**: Each pixel in the manufacturing image directly maps to a painted stitch on the canvas
- **No Anti-aliasing**: Removed from manufacturing pipeline to ensure pixel-accurate color mapping (anti-aliasing introduces blended colors that don't match discrete thread shades)
- **Stitchability First**: Pipeline optimizes for practical stitching patterns over pure visual smoothness
- **Adaptive Processing**: Adjusts blur and filtering based on image characteristics

### Output

The pipeline produces:
- **Manufacturer Image**: Pixel-accurate image where each pixel = one stitch color
- **Thread List**: Array of threads with stitch counts for each color
- **Stitchability Score**: Metric indicating how practical the pattern is to stitch
- **Dimensions**: Stitch dimensions and original image dimensions

## Getting Started

First, run the development server:

```bash
npm run devL
```

