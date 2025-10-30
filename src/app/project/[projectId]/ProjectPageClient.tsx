"use client";

import { useState } from "react";
import { ProjectImageUploader } from "../../../components/project/uploader-client";
import { ImageModifier } from "../../../components/project/image-modifier";
import { CanvasDisplay } from "./CanvasDisplay";

type Image = {
  id: string;
  url: string;
  type: "RAW" | "CANVAS";
  createdAt: Date;
};

type Canvas = {
  id: string;
  name: string | null;
  meshCount: number;
  width: number;
  numColors: number;
  images: Image[];
  createdAt: Date;
};

type Project = {
  id: string;
  name: string;
  canvases: Canvas[];
};

type ProjectPageClientProps = {
  project: Project;
};

export function ProjectPageClient({ project }: ProjectPageClientProps) {
  const [selectedCanvasId, setSelectedCanvasId] = useState<string | null>(null);

  const handleCanvasSelect = (canvasId: string) => {
    if (selectedCanvasId === canvasId) {
      // If clicking the same canvas, deselect it
      setSelectedCanvasId(null);
    } else {
      // Select the new canvas
      setSelectedCanvasId(canvasId);
    }
  };

  const selectedCanvas = project.canvases.find(canvas => canvas.id === selectedCanvasId);
  
  // Helper function to get images from a canvas
  const getCanvasImages = (canvas: Canvas) => {
    const rawImage = canvas.images.find(img => img.type === "RAW");
    const canvasImage = canvas.images.find(img => img.type === "CANVAS");
    return {
      originalImage: rawImage?.url ?? "",
      manufacturerImage: canvasImage?.url ?? null,
    };
  };

  return (
    <div className="bg-gray-100 dark:bg-gray-900 min-h-screen">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col items-start gap-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{project.name}</h1>
          {selectedCanvas ? (
            <ImageModifier 
              canvasName={selectedCanvas.name ?? "Canvas"}
              originalImage={getCanvasImages(selectedCanvas).originalImage}
              onDeselect={() => setSelectedCanvasId(null)} 
            />
          ) : (
            <ProjectImageUploader projectId={project.id} />
          )}
        </div>

        {project.canvases.length === 0 ? (
          <div className="mt-6 text-left text-gray-500 dark:text-gray-400">
            No images yet. Upload one above.
          </div>
        ) : (
          <div className="mt-6 flex flex-col gap-4">
            {project.canvases.map((canvas) => {
              const { originalImage, manufacturerImage } = getCanvasImages(canvas);
              return (
                <CanvasDisplay
                  key={canvas.id}
                  id={canvas.id}
                  name={canvas.name ?? "Canvas"}
                  originalImage={originalImage}
                  manufacturerImage={manufacturerImage}
                  meshCount={canvas.meshCount}
                  width={canvas.width}
                  numColors={canvas.numColors}
                  isSelected={selectedCanvasId === canvas.id}
                  onSelect={() => handleCanvasSelect(canvas.id)}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
