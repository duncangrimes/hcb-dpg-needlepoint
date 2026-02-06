/**
 * AI Subject Detection
 * 
 * Uses Gemini vision to detect subjects in an image and return
 * bounding boxes for user selection.
 */

import { GoogleGenAI } from "@google/genai";

export interface DetectedSubject {
  id: string;
  label: string;
  confidence: number;
  boundingBox: {
    x: number;      // 0-1 normalized
    y: number;
    width: number;
    height: number;
  };
  description?: string;
}

export interface SubjectDetectionResult {
  subjects: DetectedSubject[];
  sceneDescription: string;
}

const DETECTION_PROMPT = `Analyze this image and identify the main subjects/objects that someone might want to include in a needlepoint canvas.

For each distinct subject, provide:
1. A short label (e.g., "golden retriever", "wine glass", "person")
2. Approximate bounding box as percentages (x, y from top-left corner, width, height)
3. Confidence score (0-1) for how clearly defined this subject is

Focus on:
- Main focal subjects (people, pets, objects)
- Elements that would make good needlepoint subjects (clear shapes, interesting colors)
- Skip background elements unless they're distinctive

Respond with ONLY valid JSON in this exact format:
{
  "scene_description": "Brief scene description",
  "subjects": [
    {
      "label": "subject name",
      "confidence": 0.95,
      "bounding_box": {
        "x": 0.1,
        "y": 0.15,
        "width": 0.4,
        "height": 0.6
      },
      "description": "optional detail about this subject"
    }
  ]
}`;

/**
 * Detect subjects in an image using Gemini vision
 */
export async function detectSubjects(
  imageBuffer: Buffer,
  mimeType: string = "image/png"
): Promise<SubjectDetectionResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  const ai = new GoogleGenAI({ apiKey });

  const base64 = imageBuffer.toString("base64");

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType,
              data: base64,
            },
          },
          { text: DETECTION_PROMPT },
        ],
      },
    ],
    config: {
      temperature: 0.1,  // Low temp for consistent structured output
      maxOutputTokens: 1024,
    },
  });

  const text = response.text?.trim() || "";
  
  // Extract JSON from response (handle markdown code blocks)
  let jsonStr = text;
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  try {
    const parsed = JSON.parse(jsonStr);
    
    // Map to our interface with generated IDs
    const subjects: DetectedSubject[] = (parsed.subjects || []).map(
      (s: {
        label: string;
        confidence: number;
        bounding_box: { x: number; y: number; width: number; height: number };
        description?: string;
      }, i: number) => ({
        id: `subject-${i}-${Date.now()}`,
        label: s.label,
        confidence: s.confidence,
        boundingBox: {
          x: s.bounding_box.x,
          y: s.bounding_box.y,
          width: s.bounding_box.width,
          height: s.bounding_box.height,
        },
        description: s.description,
      })
    );

    return {
      subjects,
      sceneDescription: parsed.scene_description || "",
    };
  } catch (err) {
    console.error("Failed to parse subject detection response:", text);
    throw new Error("Failed to parse AI response");
  }
}

/**
 * Convert a bounding box to a lasso path (rectangle)
 * Used when user accepts an AI-detected subject without refinement
 */
export function boundingBoxToPath(box: DetectedSubject["boundingBox"]): { x: number; y: number }[] {
  return [
    { x: box.x, y: box.y },
    { x: box.x + box.width, y: box.y },
    { x: box.x + box.width, y: box.y + box.height },
    { x: box.x, y: box.y + box.height },
  ];
}
