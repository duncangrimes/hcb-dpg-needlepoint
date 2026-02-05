/**
 * Maps AI-suggested colors to DMC thread palette
 */

import { differenceEuclidean, converter } from "culori";
import { getThreadPalette, type Thread } from "@/lib/colors";
import type { SuggestedColor } from "./palette-analyzer";
import { hexToRgb } from "./palette-analyzer";

export interface MappedPaletteColor {
  /** Original AI suggestion */
  suggested: SuggestedColor;
  /** Matched DMC thread */
  thread: Thread;
  /** Color difference (lower = better match) */
  colorDifference: number;
}

/**
 * Maps AI-suggested colors to the nearest DMC threads.
 * 
 * @param suggestedColors - Colors from Gemini analysis
 * @returns Array of mapped colors with DMC thread info
 */
export async function mapSuggestedColorsToDMC(
  suggestedColors: SuggestedColor[]
): Promise<MappedPaletteColor[]> {
  const threadPalette = await getThreadPalette();
  const toOklab = converter("oklab");
  const colorDifference = differenceEuclidean("oklab");
  
  const usedThreads = new Set<string>();
  const mappedColors: MappedPaletteColor[] = [];
  
  console.log(`🧵 Mapping ${suggestedColors.length} suggested colors to DMC threads...`);
  
  for (const suggested of suggestedColors) {
    const [r, g, b] = hexToRgb(suggested.hex);
    const targetLab = toOklab({ r: r / 255, g: g / 255, b: b / 255, mode: "rgb" });
    
    // Find best matching thread (prefer unused threads for diversity)
    let bestThread: Thread | null = null;
    let bestDiff = Infinity;
    let bestUnusedThread: Thread | null = null;
    let bestUnusedDiff = Infinity;
    
    for (const thread of threadPalette) {
      const threadLab = toOklab({ 
        r: thread.r / 255, 
        g: thread.g / 255, 
        b: thread.b / 255, 
        mode: "rgb" 
      });
      const diff = colorDifference(targetLab, threadLab);
      
      if (diff < bestDiff) {
        bestDiff = diff;
        bestThread = thread;
      }
      
      if (!usedThreads.has(thread.floss) && diff < bestUnusedDiff) {
        bestUnusedDiff = diff;
        bestUnusedThread = thread;
      }
    }
    
    // Prefer unused thread if it's reasonably close (within 50% of best match)
    const selectedThread = (bestUnusedThread && bestUnusedDiff < bestDiff * 1.5)
      ? bestUnusedThread
      : bestThread;
    
    if (selectedThread) {
      usedThreads.add(selectedThread.floss);
      mappedColors.push({
        suggested,
        thread: selectedThread,
        colorDifference: selectedThread === bestUnusedThread ? bestUnusedDiff : bestDiff,
      });
      
      console.log(
        `   ${suggested.hex} "${suggested.name}" → DMC ${selectedThread.floss} "${selectedThread.name}" (ΔE=${(selectedThread === bestUnusedThread ? bestUnusedDiff : bestDiff).toFixed(3)})`
      );
    }
  }
  
  return mappedColors;
}

/**
 * Converts mapped palette to the format expected by the quantization pipeline.
 * 
 * @param mappedColors - Colors mapped to DMC threads
 * @returns Array of Thread objects ready for quantization
 */
export function extractThreadsFromMappedPalette(
  mappedColors: MappedPaletteColor[]
): Thread[] {
  return mappedColors.map((mc) => mc.thread);
}
