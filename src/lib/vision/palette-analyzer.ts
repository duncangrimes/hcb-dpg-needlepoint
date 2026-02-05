/**
 * Vision-based Palette Analyzer
 * 
 * Uses Gemini to analyze an image and suggest a simplified color palette
 * optimized for needlepoint stitchability.
 */

import { GoogleGenAI } from "@google/genai";
import { VISION_PALETTE_PROMPT, VISION_MODEL_CONFIG } from "@/config/vision-palette.prompt";

export interface SuggestedColor {
  /** Descriptive name (e.g., "cream fur") */
  name: string;
  /** Hex color value (#RRGGBB) */
  hex: string;
  /** Approximate coverage percentage */
  coverage_percent: number;
  /** Where this color appears */
  region: string;
}

export interface PaletteAnalysisResult {
  /** Brief description of the subject */
  subject_description: string;
  /** Suggested color palette */
  suggested_palette: SuggestedColor[];
  /** AI notes on stitchability */
  notes: string;
}

/**
 * Analyzes an image using Gemini vision and suggests a needlepoint-optimized color palette.
 * 
 * @param imageBuffer - The image to analyze (PNG or JPEG buffer)
 * @param maxColors - Maximum number of colors to suggest (default: 8)
 * @param mimeType - Image MIME type (default: "image/png")
 * @returns Structured palette analysis result
 */
export async function analyzeImageForPalette(
  imageBuffer: Buffer,
  maxColors: number = 8,
  mimeType: string = "image/png"
): Promise<PaletteAnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  // Build prompt with maxColors substituted
  const prompt = VISION_PALETTE_PROMPT.replace("{maxColors}", String(maxColors));
  
  console.log(`🎨 Analyzing image for palette (max ${maxColors} colors)...`);
  
  // Convert image to base64
  const base64Image = imageBuffer.toString("base64");
  
  // Call Gemini with image + prompt
  const response = await ai.models.generateContent({
    model: VISION_MODEL_CONFIG.model,
    contents: [
      { text: prompt },
      {
        inlineData: {
          mimeType,
          data: base64Image,
        },
      },
    ],
    config: VISION_MODEL_CONFIG.generationConfig,
  });

  // Extract text response
  const textResponse = response.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!textResponse) {
    throw new Error("Gemini did not return a text response");
  }

  console.log(`📝 Gemini response received (${textResponse.length} chars)`);

  // Parse JSON response
  try {
    // Handle potential markdown code blocks
    let jsonStr = textResponse.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }
    
    const result = JSON.parse(jsonStr) as PaletteAnalysisResult;
    
    // Validate structure
    if (!result.suggested_palette || !Array.isArray(result.suggested_palette)) {
      throw new Error("Invalid response structure: missing suggested_palette array");
    }
    
    // Validate and normalize hex colors
    result.suggested_palette = result.suggested_palette.map((color) => ({
      ...color,
      hex: normalizeHex(color.hex),
    }));
    
    console.log(`✅ Palette analysis complete: ${result.suggested_palette.length} colors suggested`);
    for (const color of result.suggested_palette) {
      console.log(`   ${color.hex} — ${color.name} (${color.coverage_percent}%)`);
    }
    
    return result;
  } catch (parseError) {
    console.error("Failed to parse Gemini response:", textResponse);
    throw new Error(`Failed to parse palette response: ${parseError}`);
  }
}

/**
 * Normalizes a hex color string to #RRGGBB format
 */
function normalizeHex(hex: string): string {
  // Remove any spaces or extra characters
  let clean = hex.trim().toUpperCase();
  
  // Add # if missing
  if (!clean.startsWith("#")) {
    clean = "#" + clean;
  }
  
  // Expand 3-char hex to 6-char
  if (clean.length === 4) {
    clean = "#" + clean[1] + clean[1] + clean[2] + clean[2] + clean[3] + clean[3];
  }
  
  // Validate format
  if (!/^#[0-9A-F]{6}$/.test(clean)) {
    console.warn(`Invalid hex color: ${hex}, defaulting to gray`);
    return "#808080";
  }
  
  return clean;
}

/**
 * Converts a hex color to RGB array
 */
export function hexToRgb(hex: string): [number, number, number] {
  const normalized = normalizeHex(hex);
  const r = parseInt(normalized.slice(1, 3), 16);
  const g = parseInt(normalized.slice(3, 5), 16);
  const b = parseInt(normalized.slice(5, 7), 16);
  return [r, g, b];
}
