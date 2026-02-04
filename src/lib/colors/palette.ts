import { z } from "zod";
import { differenceEuclidean, converter } from "culori";
import type { Thread } from "./types";

const threadSchema = z.object({
  floss: z.string(),
  name: z.string(),
  r: z.number().int().min(0).max(255),
  g: z.number().int().min(0).max(255),
  b: z.number().int().min(0).max(255),
  hex: z.string(),
});

const paletteSchema = z.array(threadSchema).min(1);

let cachedPalette: Thread[] | null = null;

export async function getThreadPalette(): Promise<Thread[]> {
  if (cachedPalette) return cachedPalette;
  // Importing JSON keeps it out of the client bundle if used only server-side
  const data = (await import("@/data/threadColors.json")).default as unknown;
  const parsed = paletteSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error("Invalid thread palette data");
  }
  
  // Include the full DMC palette — neutrals, grays, and whites are needed for
  // realistic subjects (skin tones, animals, buildings). Color vibrancy should
  // be achieved through palette selection, not by removing available colors.
  // The old filter removed grays, beiges, whites, and low-saturation colors,
  // which made it impossible to accurately represent many real-world subjects.
  console.log(`🎨 Thread palette loaded: ${parsed.data.length} colors available`);
  cachedPalette = parsed.data;
  return cachedPalette;
}

export function mapColorsToThreads(representativeColors: number[][], threadPalette: Thread[]) {
  const colorDifference = differenceEuclidean("oklab");
  const toOklab = converter("oklab");
  const MINDIFF_THRESHOLD = 0.08; // Even lower threshold for more vibrant results
  
  // Sort thread palette by vibrancy (saturation) to prioritize vibrant colors
  const vibrantThreads = [...threadPalette].sort((a, b) => {
    const aSat = getSaturation(a.r, a.g, a.b);
    const bSat = getSaturation(b.r, b.g, b.b);
    // Also consider brightness for even more vibrant results
    const aBrightness = (a.r + a.g + a.b) / 3;
    const bBrightness = (b.r + b.g + b.b) / 3;
    const aScore = aSat * 0.7 + (aBrightness / 255) * 0.3;
    const bScore = bSat * 0.7 + (bBrightness / 255) * 0.3;
    return bScore - aScore; // higher vibrancy + brightness first
  });
  
  const mappings: { original: number[]; thread: Thread }[] = [];
  const usedThreads = new Set<string>();
  for (let i = 0; i < representativeColors.length; i++) {
    const rgbColor = representativeColors[i];
    const targetColor = toOklab({ r: rgbColor[0] / 255, g: rgbColor[1] / 255, b: rgbColor[2] / 255, mode: "rgb" });
    let bestMatch: Thread | null = null;
    let minDifference = Infinity;
  
    // Try vibrant threads first
    for (const thread of vibrantThreads) {
      const threadColor = toOklab({ r: thread.r / 255, g: thread.g / 255, b: thread.b / 255, mode: "rgb" });
      const difference = colorDifference(targetColor, threadColor);
      if (difference < minDifference) {
        minDifference = difference;
        bestMatch = thread;
      }
    }
    // Map if duplicate and sufficiently different
    if (bestMatch && (!usedThreads.has(bestMatch.floss) || minDifference >= MINDIFF_THRESHOLD)) {
      usedThreads.add(bestMatch.floss);
      mappings.push({ original: rgbColor, thread: bestMatch });
    } else if (bestMatch) {
      // Accept duplicate if nothing else is close enough, but log it
      mappings.push({ original: rgbColor, thread: bestMatch });
    }
  }
  // For padding, use other available threads randomly
  while (mappings.length < representativeColors.length) {
    const randomThread = threadPalette[Math.floor(Math.random() * threadPalette.length)];
    mappings.push({ original: [randomThread.r, randomThread.g, randomThread.b], thread: randomThread });
  }
  return mappings;
}

// Helper function to calculate color saturation
function getSaturation(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
}


