"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateProjectOwnership } from "@/lib/upload/validation";
import { downloadImageBuffer } from "@/lib/upload/image-processing";
import { getRawImagePath, uploadImageBuffer } from "@/lib/upload/storage";
import { ImageSource, ImageType } from "@prisma/client";
import { GoogleGenAI } from "@google/genai";
import { revalidatePath } from "next/cache";

export interface GenerateAIImageResult {
  success: boolean;
  canvasId?: string;
  error?: string;
}

/**
 * Generates a new AI image using Gemini API with a selected canvas's RAW image as context
 * @param canvasId - The selected canvas ID
 * @param projectId - The project ID
 * @param prompt - The user's prompt text
 * @param meshCount - The mesh count to use for the new canvas
 * @param width - The width to use for the new canvas
 * @param numColors - The number of colors to use for the new canvas
 * @returns Result with new canvas ID or error
 */
export async function generateAIImage(
  canvasId: string,
  projectId: string,
  prompt: string,
  meshCount: number,
  width: number,
  numColors: number
): Promise<GenerateAIImageResult> {
  try {
    // 1) Validate authentication and ownership
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    const userId = session.user.id;
    await validateProjectOwnership(projectId, userId);

    // 2) Fetch the selected canvas and its RAW image
    const selectedCanvas = await prisma.canvas.findUnique({
      where: { id: canvasId },
      include: {
        images: {
          where: { type: ImageType.RAW },
        },
        project: {
          select: { id: true, userId: true },
        },
      },
    });

    if (!selectedCanvas || selectedCanvas.project.userId !== userId) {
      return { success: false, error: "Canvas not found or not authorized" };
    }

    const rawImage = selectedCanvas.images.find((img) => img.type === ImageType.RAW);
    if (!rawImage) {
      return { success: false, error: "Selected canvas does not have a RAW image" };
    }

    // 3) Download RAW image and convert to base64 for Gemini
    const rawImageBuffer = await downloadImageBuffer(rawImage.url);
    const base64Image = rawImageBuffer.toString("base64");
    const mimeType = rawImage.url.match(/\.(jpg|jpeg|png|webp)$/i)
      ? `image/${rawImage.url.split(".").pop()}`
      : "image/png";

    // 4) Call Gemini API with image + prompt
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return { success: false, error: "GEMINI_API_KEY not configured" };
    }

    // Initialize GoogleGenAI with API key
    const ai = new GoogleGenAI({ apiKey });

    console.log("Calling Gemini API with prompt:", prompt);
    console.log("Image size (bytes):", rawImageBuffer.length);
    console.log("MIME type:", mimeType);

    // Prepare the prompt with image and text
    const promptContents = [
      {
        text: `Generate a new image based on this image and the following prompt: ${prompt}`,
      },
      {
        inlineData: {
          mimeType: mimeType,
          data: base64Image,
        },
      },
    ];

    // Call the image generation model
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: promptContents,
    });

    // Log the full response structure
    console.log("=== GEMINI API RESPONSE ===");
    console.log("Full response object:", JSON.stringify(response, null, 2));
    
    // Extract image data from response following the documentation pattern
    let generatedImageBuffer: Buffer | null = null;
    
    try {
      // Response structure: response.candidates[0].content.parts
      const candidates = response.candidates;
      if (candidates && candidates.length > 0) {
        const parts = candidates[0]?.content?.parts;
        if (parts) {
          console.log("Response parts:", JSON.stringify(parts, null, 2));
          
          // Iterate through parts to find image data
          for (const part of parts) {
            if (part.text) {
              console.log("Text response:", part.text);
            } else if (part.inlineData) {
              console.log("Found image data in inlineData");
              const imageData = part.inlineData.data;
              if (imageData) {
                generatedImageBuffer = Buffer.from(imageData, "base64");
                console.log("Successfully extracted image buffer, size:", generatedImageBuffer.length, "bytes");
                break; // Found the image, no need to continue
              }
            }
          }
        }
      }
      
      // If no image found, log the structure for debugging
      if (!generatedImageBuffer) {
        console.log("No image data found in response. Response structure:");
        console.log("- Response type:", typeof response);
        console.log("- Response keys:", Object.keys(response));
        console.log("- Candidates length:", response.candidates?.length || 0);
        
        // Return error if no image was generated
        return {
          success: false,
          error: "Gemini API did not return an image. Check the response logs.",
        };
      }
    } catch (error) {
      console.error("Error parsing Gemini response:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to parse Gemini response",
      };
    }

    // 5) Create new Canvas record with provided config values
    const newCanvas = await prisma.canvas.create({
      data: {
        project: { connect: { id: projectId } },
        user: { connect: { id: userId } },
        meshCount: meshCount,
        width: width,
        numColors: numColors,
        threads: [],
      },
      select: { id: true, projectId: true },
    });

    // 6) Upload generated image to blob storage
    const rawImagePath = getRawImagePath(userId, projectId, newCanvas.id);
    const uploadedBlob = await uploadImageBuffer(generatedImageBuffer!, rawImagePath);

    // 8) Create Image record (type=RAW, source=AI_GENERATED)
    const generatedImage = await prisma.image.create({
      data: {
        url: uploadedBlob.url,
        type: ImageType.RAW,
        source: ImageSource.AI_GENERATED,
        canvas: { connect: { id: newCanvas.id } },
        project: { connect: { id: projectId } },
        user: { connect: { id: userId } },
      },
      select: { id: true },
    });

    // 9) Create Prompt record linking original to generated
    await prisma.prompt.create({
      data: {
        text: prompt,
        originalImageId: rawImage.id,
        generatedImageId: generatedImage.id,
        canvas: { connect: { id: newCanvas.id } },
        project: { connect: { id: projectId } },
        user: { connect: { id: userId } },
      },
    });

    revalidatePath(`/project/${projectId}`);

    return { success: true, canvasId: newCanvas.id };
  } catch (error) {
    console.error("Error generating AI image:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

