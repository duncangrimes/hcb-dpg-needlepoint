import sharp from "sharp";

export type BackgroundPattern =
  | "solid"
  | "gingham"
  | "stripes-horizontal"
  | "stripes-vertical"
  | "stripes-diagonal"
  | "polka-dots"
  | "chevron";

export interface BackgroundConfig {
  pattern: BackgroundPattern;
  /** Primary background color [r, g, b] */
  color1: [number, number, number];
  /** Secondary color for patterns [r, g, b] (defaults to white) */
  color2?: [number, number, number];
  /** Pattern cell size in stitches (default: 4) */
  patternSize?: number;
}

/**
 * Generates a pixel-perfect background pattern at exact stitch dimensions.
 * Each pixel = 1 stitch. Pattern repeats are aligned to the grid.
 *
 * @param width - Width in stitches
 * @param height - Height in stitches
 * @param config - Background configuration
 * @returns PNG buffer of the generated background
 */
export async function generateBackground(
  width: number,
  height: number,
  config: BackgroundConfig
): Promise<Buffer> {
  const { pattern, color1, patternSize = 4 } = config;
  const color2 = config.color2 ?? [255, 255, 255];

  console.log(
    `🎨 Generating ${pattern} background: ${width}×${height}, ` +
      `colors: rgb(${color1.join(",")}) / rgb(${color2.join(",")}), cell: ${patternSize}px`
  );

  const pixels = Buffer.alloc(width * height * 3);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 3;
      const color = getPatternColor(x, y, pattern, color1, color2, patternSize);
      pixels[idx] = color[0];
      pixels[idx + 1] = color[1];
      pixels[idx + 2] = color[2];
    }
  }

  return sharp(pixels, { raw: { width, height, channels: 3 } })
    .png()
    .toBuffer();
}

function getPatternColor(
  x: number,
  y: number,
  pattern: BackgroundPattern,
  c1: [number, number, number],
  c2: [number, number, number],
  size: number
): [number, number, number] {
  switch (pattern) {
    case "solid":
      return c1;

    case "gingham": {
      // Gingham: 3-color effect from overlapping horizontal and vertical stripes
      const hBand = Math.floor(x / size) % 2 === 0;
      const vBand = Math.floor(y / size) % 2 === 0;
      if (hBand && vBand) {
        // Both bands overlap → darker (color1)
        return c1;
      } else if (!hBand && !vBand) {
        // Neither band → lighter (color2)
        return c2;
      } else {
        // One band → blend (midpoint of c1 and c2)
        return [
          Math.round((c1[0] + c2[0]) / 2),
          Math.round((c1[1] + c2[1]) / 2),
          Math.round((c1[2] + c2[2]) / 2),
        ];
      }
    }

    case "stripes-horizontal":
      return Math.floor(y / size) % 2 === 0 ? c1 : c2;

    case "stripes-vertical":
      return Math.floor(x / size) % 2 === 0 ? c1 : c2;

    case "stripes-diagonal":
      return Math.floor((x + y) / size) % 2 === 0 ? c1 : c2;

    case "polka-dots": {
      // Dots centered in each cell
      const cellX = x % (size * 2);
      const cellY = y % (size * 2);
      const centerX = size;
      const centerY = size;
      const radius = Math.max(1, Math.floor(size * 0.4));
      const dist = Math.sqrt(
        (cellX - centerX) ** 2 + (cellY - centerY) ** 2
      );
      return dist <= radius ? c1 : c2;
    }

    case "chevron": {
      // V-shaped repeating pattern
      const period = size * 2;
      const py = y % period;
      const px = x % period;
      // Create V shape: above the V line = c1, below = c2
      const mid = period / 2;
      const vLine = px < mid ? px : period - px;
      return py < vLine ? c1 : c2;
    }

    default:
      return c1;
  }
}

/**
 * Suggests a contrasting background color based on the subject's dominant colors.
 * Picks a color that will create strong visual separation.
 *
 * @param subjectColors - Array of [r,g,b] colors from the subject
 * @returns Suggested background color [r,g,b]
 */
export function suggestBackgroundColor(
  subjectColors: [number, number, number][]
): [number, number, number] {
  if (subjectColors.length === 0) return [255, 255, 255];

  // Calculate average brightness of subject
  const avgBrightness =
    subjectColors.reduce((sum, [r, g, b]) => sum + (r + g + b) / 3, 0) /
    subjectColors.length;

  // If subject is dark, use light background; if light, use a mid-tone
  if (avgBrightness < 100) {
    return [245, 245, 240]; // Warm off-white
  } else if (avgBrightness < 180) {
    return [240, 240, 235]; // Light cream
  } else {
    return [70, 90, 110]; // Muted slate blue (contrast for light subjects)
  }
}
