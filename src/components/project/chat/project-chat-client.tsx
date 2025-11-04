"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import RawImageRow from "./RawImageRow";
import CanvasImageRow from "./CanvasImageRow";
import PreviewBubble from "./PreviewBubble";
import { useRouter } from "next/navigation";
import ProjectToolbar from "./project-toolbar";
import { getProjectCanvases } from "@/actions/getProjectCanvases";
import { checkCanvasStatus } from "@/actions/checkCanvasStatus";
import { generateAIImage } from "@/actions/generateAIImage";
import { processGeneratedCanvas } from "@/actions/processGeneratedCanvas";

type ImageRecord = { id: string; url: string; type: "RAW" | "CANVAS" };
type CanvasRecord = {
  id: string;
  meshCount: number;
  width: number;
  numColors: number;
  images: ImageRecord[];
  createdAt?: Date;
};

export default function ProjectChatClient({
  projectId,
  initialCanvases,
  hasMore: initialHasMore,
  oldestCanvasCreatedAt: initialOldestCanvasCreatedAt,
}: {
  projectId: string;
  initialCanvases: CanvasRecord[];
  hasMore: boolean;
  oldestCanvasCreatedAt: Date | null;
}) {
  const router = useRouter();
  const [canvases, setCanvases] = useState<CanvasRecord[]>(initialCanvases);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [oldestCanvasCreatedAt, setOldestCanvasCreatedAt] = useState<Date | null>(initialOldestCanvasCreatedAt);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [meshCount, setMeshCount] = useState<number>(13);
  const [width, setWidth] = useState<number>(8);
  const [numColors, setNumColors] = useState<number>(12);
  const [selectedCanvasId, setSelectedCanvasId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Sync canvases state with server data when new canvases appear (for uploads)
  // This effect runs when the server refreshes and provides new data
  useEffect(() => {
    setCanvases((prev) => {
      const currentCanvasIds = new Set(prev.map((c) => c.id));
      const newCanvases = initialCanvases.filter((c) => !currentCanvasIds.has(c.id));
      
      // Update existing canvases with latest data (in case images were added)
      const updatedCanvases = prev.map((canvas) => {
        const updated = initialCanvases.find((c) => c.id === canvas.id);
        if (updated) {
          // Only update if the server version has more images
          // This prevents unnecessary re-renders when we've already updated locally
          if (updated.images.length > canvas.images.length) {
            return updated;
          }
          return canvas;
        }
        return canvas;
      });
      
      // Merge new canvases with existing ones, maintaining order (oldest first for chat)
      const merged = newCanvases.length > 0 
        ? [...updatedCanvases, ...newCanvases]
        : updatedCanvases;
      
      // Sort by createdAt if available, otherwise keep order
      return merged.sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        return a.createdAt.getTime() - b.createdAt.getTime();
      });
    });
    
    setHasMore(initialHasMore);
    // Only update oldestCanvasCreatedAt if we don't have one yet
    if (!oldestCanvasCreatedAt && initialOldestCanvasCreatedAt) {
      setOldestCanvasCreatedAt(initialOldestCanvasCreatedAt);
    }
    
    // If we were processing and now we have canvases with RAW images, stop processing
    if (isProcessing) {
      const hasRawImages = initialCanvases.some((c) => 
        c.images.some((img) => img.type === "RAW")
      );
      if (hasRawImages) {
        setIsProcessing(false);
      }
    }
  }, [initialCanvases, initialHasMore, initialOldestCanvasCreatedAt, oldestCanvasCreatedAt, isProcessing]);
  const [initialExpectedImages, setInitialExpectedImages] = useState<number>(0);
  const [initialLoadedImages, setInitialLoadedImages] = useState<number>(0);
  const didInitialScrollRef = useRef<boolean>(false);
  const scrollToAbsoluteBottom = (behavior: ScrollBehavior = "auto") => {
    // Double tick to ensure layout is fully settled
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const maxHeight = Math.max(
          document.body.scrollHeight,
          document.documentElement.scrollHeight,
          document.body.offsetHeight,
          document.documentElement.offsetHeight,
          document.body.clientHeight,
          document.documentElement.clientHeight
        );
        window.scrollTo({ top: maxHeight, behavior });
      });
    });
  };

  const messages = useMemo(() => {
    // Group by canvas: RAW (right), CANVAS (left)
    return canvases.map((c) => {
      const raw = c.images.find((i) => i.type === "RAW");
      const canvas = c.images.find((i) => i.type === "CANVAS");
      return { 
        canvasId: c.id, 
        rawUrl: raw?.url, 
        canvasUrl: canvas?.url,
        rawImageId: raw?.id,
        canvasImageId: canvas?.id,
      };
    });
  }, [canvases]);

  const handleCanvasClick = (canvasId: string) => {
    setSelectedCanvasId((prev) => (prev === canvasId ? null : canvasId));
  };

  const handleLoadMore = async () => {
    if (!oldestCanvasCreatedAt || isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    try {
      const result = await getProjectCanvases(projectId, oldestCanvasCreatedAt);
      
      if (result.canvases.length > 0) {
        // Prepend older canvases at the beginning (old images appear above new ones)
        setCanvases(prev => [...result.canvases, ...prev]);
        const newOldest = result.canvases[0].createdAt; // First in asc order is oldest
        if (newOldest) {
          setOldestCanvasCreatedAt(newOldest);
        }
        setHasMore(result.hasMore);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error loading more canvases:", error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const canvasCount = useMemo(() => messages.filter((m) => Boolean(m.canvasUrl)).length, [messages]);
  const hasPendingCanvas = useMemo(
    () => messages.some((m) => m.rawUrl && !m.canvasUrl),
    [messages]
  );
  
  // Show spinner if we're uploading or if there are pending canvases
  const showSpinner = isProcessing || hasPendingCanvas;
  
  // Get list of canvas IDs that are pending (have RAW but no CANVAS)
  const pendingCanvasIds = useMemo(
    () => messages.filter((m) => m.rawUrl && !m.canvasUrl).map((m) => m.canvasId),
    [messages]
  );
  

  // On mount, start at the top, then after initial images load, scroll to bottom
  useLayoutEffect(() => {
    // Ensure we begin at the very top
    window.scrollTo({ top: 0, behavior: "auto" });

    // Count how many images are expected on initial render
    const expected = messages.reduce((acc, m) => acc + (m.rawUrl ? 1 : 0) + (m.canvasUrl ? 1 : 0), 0);
    setInitialExpectedImages(expected);
    setInitialLoadedImages(0);

    // If there are no images, consider initial load done immediately
    if (expected === 0) {
      didInitialScrollRef.current = true;
      const maxHeight = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.offsetHeight,
        document.body.clientHeight,
        document.documentElement.clientHeight
      );
      window.scrollTo({ top: maxHeight, behavior: "smooth" });
    }
  }, []);

  // When all initially expected images finish loading, scroll to very bottom once
  useEffect(() => {
    if (didInitialScrollRef.current) return;
    if (initialExpectedImages === 0) return;
    if (initialLoadedImages < initialExpectedImages) return;
    const maxHeight = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.offsetHeight,
      document.body.clientHeight,
      document.documentElement.clientHeight
    );
    window.scrollTo({ top: maxHeight, behavior: "smooth" });
    didInitialScrollRef.current = true;
  }, [initialExpectedImages, initialLoadedImages]);

  // Scroll to bottom when a new canvas appears
  const prevCanvasCountRef = useRef<number>(0);
  useEffect(() => {
    if (!didInitialScrollRef.current) return;
    if (canvasCount > prevCanvasCountRef.current) {
      // Wait a tick for the DOM to update, then scroll to absolute bottom
      setTimeout(() => scrollToAbsoluteBottom("smooth"), 100);
    }
    prevCanvasCountRef.current = canvasCount;
  }, [canvasCount]);

  // Scroll to bottom when a new preview is shown
  useEffect(() => {
    if (!didInitialScrollRef.current) return;
    if (localPreview) {
      const maxHeight = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.offsetHeight,
        document.body.clientHeight,
        document.documentElement.clientHeight
      );
      window.scrollTo({ top: maxHeight, behavior: "auto" });
    }
  }, [localPreview]);

  // Track which canvases are being processed to avoid duplicate processing
  const processingCanvasIdsRef = useRef<Set<string>>(new Set());

  // Poll for canvas completion when there are pending canvases
  useEffect(() => {
    if (pendingCanvasIds.length === 0 && !isProcessing) return;

    const pollInterval = setInterval(async () => {
      // If we're processing, check for new canvases first
      if (isProcessing) {
        // Refresh to see if the RAW image appeared
        router.refresh();
        return;
      }
      
      // Check each pending canvas to see if CANVAS image is ready
      for (const canvasId of pendingCanvasIds) {
        const status = await checkCanvasStatus(canvasId);
        
        // If we have RAW but no CANVAS, check if this is an AI-generated canvas
        // and trigger processing if not already processing
        if (
          status?.hasRaw &&
          !status.hasCanvas &&
          status.rawSource === "AI_GENERATED" &&
          !processingCanvasIdsRef.current.has(canvasId)
        ) {
          // Mark as processing to avoid duplicate calls
          processingCanvasIdsRef.current.add(canvasId);
          
          // Trigger processing asynchronously
          processGeneratedCanvas(canvasId).catch((error) => {
            console.error("Error processing canvas:", error);
            processingCanvasIdsRef.current.delete(canvasId);
          });
        }
        
        if (status?.hasCanvas && status.canvasUrl) {
          // Canvas is ready, update the specific canvas in state
          setCanvases((prev) =>
            prev.map((canvas) => {
              if (canvas.id === canvasId) {
                // Check if CANVAS image already exists to avoid duplicates
                const hasCanvasImage = canvas.images.some((img) => img.type === "CANVAS");
                if (!hasCanvasImage) {
                  return {
                    ...canvas,
                    images: [
                      ...canvas.images,
                      {
                        id: `temp-${canvasId}-canvas`,
                        url: status.canvasUrl!,
                        type: "CANVAS" as const,
                      },
                    ],
                  };
                }
              }
              return canvas;
            })
          );
          
          // Remove from processing set once CANVAS is ready
          processingCanvasIdsRef.current.delete(canvasId);
        }
      }
    }, 1000); // Poll every second

    return () => clearInterval(pollInterval);
  }, [pendingCanvasIds, isProcessing, router, canvases]);

  async function handleConfirmConvert() {
    if (!selectedFile) return;
    setIsProcessing(true);
    try {
      const file = selectedFile;
      if (localPreview) {
        URL.revokeObjectURL(localPreview);
      }
      setLocalPreview(null);
      
      await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/images/upload",
        clientPayload: JSON.stringify({ projectId, meshCount, width, numColors }),
      });
      
      setSelectedFile(null);
      
      // Refresh to get the RAW image (canvas is created immediately, RAW is created in onUploadCompleted)
      // Wait a bit for the upload to complete server-side
      setTimeout(() => {
        router.refresh();
      }, 1000);
    } catch (error) {
      console.error("Upload error:", error);
      setIsProcessing(false);
    }
  }

  return (
    <div className="relative">
      {hasMore && (
        <div className="w-full flex justify-center mb-4">
          <button
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-md transition-colors"
          >
            {isLoadingMore ? "Loading..." : "Load More Images"}
          </button>
        </div>
      )}
      <div className={localPreview ? "space-y-3 pb-28 sm:pb-18" : "space-y-3 pb-36 sm:pb-26"}>
        {messages.map((m) => {
          const isSelected = selectedCanvasId === m.canvasId;
          return (
            <div key={m.canvasId} className="space-y-3">
              {m.rawUrl && (
                <RawImageRow 
                  url={m.rawUrl} 
                  isSelected={isSelected}
                  onClick={() => handleCanvasClick(m.canvasId)}
                  onLoaded={() => setInitialLoadedImages((v) => v + 1)} 
                />
              )}
              {m.canvasUrl && (
                <CanvasImageRow 
                  url={m.canvasUrl} 
                  isSelected={isSelected}
                  onClick={() => handleCanvasClick(m.canvasId)}
                  onLoaded={() => setInitialLoadedImages((v) => v + 1)} 
                />
              )}
            </div>
          );
        })}

        {localPreview && (
          <PreviewBubble
            url={localPreview}
            onRemove={() => {
              if (localPreview) URL.revokeObjectURL(localPreview);
              setLocalPreview(null);
              setSelectedFile(null);
            }}
          />
        )}

        {showSpinner && (
          <div className="w-full flex justify-center py-4">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700 dark:border-white/20 dark:border-t-white" aria-label="Processing canvas" />
          </div>
        )}
        {/* Minimal sentinel for scroll detection, no extra spacing */}
        <div ref={bottomRef} className="h-0" />
      </div>

      <ProjectToolbar
        isProcessing={isProcessing}
        meshCount={meshCount}
        width={width}
        numColors={numColors}
        selectedCanvasId={selectedCanvasId}
        onMeshCountChange={setMeshCount}
        onWidthChange={setWidth}
        onNumColorsChange={setNumColors}
        onPickFile={(
          file: File | null,
          previewUrl: string | null,
        ) => {
          setSelectedFile(file);
          setLocalPreview(previewUrl);
        }}
        onConfirmConvert={handleConfirmConvert}
        onSendPrompt={async (prompt: string) => {
          if (!selectedCanvasId) return;
          
          setIsProcessing(true);
          try {
            // Find the selected canvas to get its config
            const selectedCanvas = canvases.find((c) => c.id === selectedCanvasId);
            if (!selectedCanvas) {
              console.error("Selected canvas not found");
              return;
            }

            // Generate AI image
            const result = await generateAIImage(selectedCanvasId, projectId, prompt);
            
            if (!result.success || !result.canvasId) {
              console.error("Failed to generate AI image:", result.error);
              alert(result.error || "Failed to generate image");
              return;
            }

            // Clear selection
            setSelectedCanvasId(null);

            // Refresh to show the new RAW image
            // Processing will be triggered automatically by the polling logic
            // when it detects the RAW image without a CANVAS image
            router.refresh();
          } catch (error) {
            console.error("Error generating AI image:", error);
            alert("An error occurred while generating the image");
          } finally {
            setIsProcessing(false);
          }
        }}
      />
    </div>
  );
}


