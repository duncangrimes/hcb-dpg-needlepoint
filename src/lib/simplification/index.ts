import sharp from "sharp";

/**
 * Applies bilateral-style filtering to flatten textures while preserving edges.
 * Uses Sharp's blur + sharpen combo as an approximation since Sharp doesn't
 * have a native bilateral filter.
 *
 * The effect: smooth interior textures (fur, skin, fabric) while keeping
 * the subject's silhouette and major feature edges crisp.
 *
 * @param imageBuffer - Subject image (RGBA with transparent background)
 * @param strength - Filter strength: 'light' | 'medium' | 'heavy' (default: medium)
 * @returns Filtered image buffer
 */
export async function flattenTextures(
  imageBuffer: Buffer,
  strength: "light" | "medium" | "heavy" = "medium"
): Promise<Buffer> {
  const config = {
    light: { blur: 0.8, sharpenSigma: 0.8 },
    medium: { blur: 1.2, sharpenSigma: 1.0 },
    heavy: { blur: 1.8, sharpenSigma: 1.2 },
  }[strength];

  console.log(`🔧 Flattening textures (${strength}): blur=${config.blur}, sharpen=${config.sharpenSigma}`);

  return sharp(imageBuffer)
    .blur(config.blur)
    .sharpen({ sigma: config.sharpenSigma, m1: 1.0, m2: 3.0 })
    .png()
    .toBuffer();
}

/**
 * Performs connected-component labeling on a pixel grid.
 * Returns region labels and sizes for cleanup operations.
 *
 * @param pixelData - Raw RGB pixel data
 * @param width - Image width
 * @param height - Image height
 * @returns Object with labels array and region sizes map
 */
export function labelConnectedComponents(
  pixelData: Buffer | Uint8Array,
  width: number,
  height: number,
  channels: number = 3
): { labels: Int32Array; regionSizes: Map<number, number> } {
  const totalPixels = width * height;
  const labels = new Int32Array(totalPixels).fill(-1);
  let nextLabel = 0;
  const regionSizes = new Map<number, number>();

  function getColorKey(idx: number): string {
    const base = idx * channels;
    return `${pixelData[base]},${pixelData[base + 1]},${pixelData[base + 2]}`;
  }

  // Flood-fill BFS for each unlabeled pixel
  for (let i = 0; i < totalPixels; i++) {
    if (labels[i] !== -1) continue;

    const label = nextLabel++;
    const color = getColorKey(i);
    const queue = [i];
    let size = 0;

    while (queue.length > 0) {
      const p = queue.pop()!;
      if (labels[p] !== -1) continue;
      if (getColorKey(p) !== color) continue;

      labels[p] = label;
      size++;

      const x = p % width;
      const y = Math.floor(p / width);

      // 4-connected neighbors
      if (x > 0) queue.push(p - 1);
      if (x < width - 1) queue.push(p + 1);
      if (y > 0) queue.push(p - width);
      if (y < height - 1) queue.push(p + width);
    }

    regionSizes.set(label, size);
  }

  return { labels, regionSizes };
}

/**
 * Dissolves small regions into their nearest large neighbor.
 * This eliminates confetti — isolated small clusters of color that are
 * impractical and frustrating to stitch.
 *
 * @param pixelData - Raw RGB pixel data (modified in place)
 * @param width - Image width
 * @param height - Image height
 * @param minRegionSize - Minimum stitches per region (default: 6)
 * @param channels - Number of channels (default: 3)
 * @returns Number of regions dissolved
 */
export function dissolveSmallRegions(
  pixelData: Buffer | Uint8Array,
  width: number,
  height: number,
  minRegionSize: number = 6,
  channels: number = 3
): number {
  let dissolved = 0;
  let pass = 0;
  const maxPasses = 5; // Safety limit

  while (pass < maxPasses) {
    const { labels, regionSizes } = labelConnectedComponents(
      pixelData, width, height, channels
    );

    // Find small regions
    const smallRegions = new Set<number>();
    for (const [label, size] of regionSizes) {
      if (size < minRegionSize) smallRegions.add(label);
    }

    if (smallRegions.size === 0) break;

    // For each small region pixel, replace with the most common neighbor color
    // from a non-small region
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const p = y * width + x;
        if (!smallRegions.has(labels[p])) continue;

        // Sample 5×5 neighborhood for replacement color
        const colorCounts = new Map<string, { count: number; r: number; g: number; b: number }>();

        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
            const np = ny * width + nx;
            // Only consider colors from non-small regions
            if (smallRegions.has(labels[np])) continue;

            const base = np * channels;
            const key = `${pixelData[base]},${pixelData[base + 1]},${pixelData[base + 2]}`;
            const existing = colorCounts.get(key);
            if (existing) {
              existing.count++;
            } else {
              colorCounts.set(key, {
                count: 1,
                r: pixelData[base],
                g: pixelData[base + 1],
                b: pixelData[base + 2],
              });
            }
          }
        }

        // Pick the most common large-region neighbor color
        let bestColor = null;
        let bestCount = 0;
        for (const entry of colorCounts.values()) {
          if (entry.count > bestCount) {
            bestCount = entry.count;
            bestColor = entry;
          }
        }

        if (bestColor) {
          const base = p * channels;
          pixelData[base] = bestColor.r;
          pixelData[base + 1] = bestColor.g;
          pixelData[base + 2] = bestColor.b;
          dissolved++;
        }
      }
    }

    pass++;
  }

  console.log(
    `🧹 Dissolved ${dissolved} confetti pixels across ${pass} pass(es) ` +
    `(min region size: ${minRegionSize})`
  );
  return dissolved;
}

/**
 * Generates an outline around the subject by detecting the boundary
 * between subject and transparent background pixels.
 *
 * @param maskBuffer - Binary mask (255 = subject, 0 = background)
 * @param width - Image width
 * @param height - Image height
 * @param outlineWidth - Outline width in pixels/stitches (default: 1)
 * @returns Outline mask buffer (255 = outline pixel, 0 = not outline)
 */
export async function generateOutline(
  maskBuffer: Buffer,
  width: number,
  height: number,
  outlineWidth: number = 1
): Promise<Buffer> {
  const { data: maskData } = await sharp(maskBuffer)
    .resize(width, height, { fit: "fill" })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const outlineData = Buffer.alloc(width * height);
  const radius = outlineWidth;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = y * width + x;
      if (maskData[p] < 128) continue; // Skip background pixels

      // Check if any neighbor within radius is background
      let isEdge = false;
      for (let dy = -radius; dy <= radius && !isEdge; dy++) {
        for (let dx = -radius; dx <= radius && !isEdge; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
            isEdge = true; // Canvas edge counts as boundary
          } else if (maskData[ny * width + nx] < 128) {
            isEdge = true;
          }
        }
      }

      if (isEdge) outlineData[p] = 255;
    }
  }

  console.log(`✏️ Generated ${outlineWidth}px outline around subject`);

  return sharp(outlineData, { raw: { width, height, channels: 1 } })
    .png()
    .toBuffer();
}
