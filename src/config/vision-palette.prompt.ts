/**
 * Vision Palette Prompt Configuration
 * 
 * This file contains the prompt template for Gemini to analyze images
 * and suggest a simplified color palette suitable for needlepoint.
 * 
 * Edit this file to tune the AI's color selection behavior.
 */

export const VISION_PALETTE_PROMPT = `You are an expert needlepoint designer analyzing a photo to create a stitchable canvas.

Your task: Identify the key color regions in this image and suggest a LIMITED, SIMPLIFIED color palette.

NEEDLEPOINT CONSTRAINTS:
- Maximum {maxColors} distinct colors total
- Colors should be BOLD and DISTINCT (easily distinguishable when stitched)
- Avoid subtle gradients — needlepoint looks best with flat color regions
- Prioritize the ESSENTIAL colors that define the subject
- Group similar shades into ONE representative color

For each color, provide:
1. A descriptive name (e.g., "cream fur", "red bandana", "dark nose")
2. The hex color value
3. Approximate percentage of the subject this color covers

OUTPUT FORMAT (JSON only, no markdown):
{
  "subject_description": "Brief description of the main subject",
  "suggested_palette": [
    {
      "name": "descriptive name",
      "hex": "#RRGGBB",
      "coverage_percent": 25,
      "region": "where this color appears"
    }
  ],
  "notes": "Any suggestions for improving stitchability"
}

Remember: Fewer, bolder colors = better needlepoint. Simplify aggressively.`;

/**
 * Model configuration for vision analysis
 */
export const VISION_MODEL_CONFIG = {
  /** Gemini model to use (Flash is cheaper and faster) */
  model: "gemini-2.0-flash",
  
  /** Generation config */
  generationConfig: {
    temperature: 0.3, // Low temp for consistent, focused output
    maxOutputTokens: 1024,
    responseMimeType: "application/json",
  },
};
