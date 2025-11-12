"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import RawImageRow from "./RawImageRow";
import ManuFacturerImageRow from "./ManufacturerImageRow";
import PreviewBubble from "./PreviewBubble";
import { useRouter } from "next/navigation";
import ProjectToolbar from "./project-toolbar";
import { getProjectCanvases } from "@/actions/canvas/getProjectCanvases";
import { checkCanvasStatus } from "@/actions/canvas/checkCanvasStatus";
import { generateAIImage } from "@/actions/canvas/generateAIImage";
import { processGeneratedManufacturerImage } from "@/actions/canvas/processGeneratedManufacturerImage";
import { uploadUserImage } from "@/actions/canvas/uploadUserImage";
import { ImageType } from "@prisma/client";
import { DEFAULT_UPLOAD_CONFIG } from "@/config/upload.config";

type ImageRecord = { id: string; url: string; type: ImageType };
type CanvasRecord = {
  id: string;
  meshCount: number;
  width: number;
  numColors: number;
  images: ImageRecord[];
  createdAt?: Date;
};

enum ScrollTrigger {
  NONE = "NONE",
  INITIAL_LOAD = "INITIAL_LOAD",
  LOAD_MORE = "LOAD_MORE",
  NEW_CANVAS = "NEW_CANVAS",
  PREVIEW = "PREVIEW",
}

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
  const [meshCount, setMeshCount] = useState<number>(DEFAULT_UPLOAD_CONFIG.meshCount);
  const [width, setWidth] = useState<number>(DEFAULT_UPLOAD_CONFIG.width);
  const [numColors, setNumColors] = useState<number>(DEFAULT_UPLOAD_CONFIG.numColors);
  const [selectedCanvasId, setSelectedCanvasId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pendingGeneratedCanvasIdRef = useRef<string | null>(null);
  const previousCanvasIdsRef = useRef<Set<string>>(new Set());

  // Sync Canvas entities state with server data when new Canvases appear (for uploads)
  // This effect runs when the server refreshes and provides new data
  useEffect(() => {
    // Capture previous Canvas IDs BEFORE updating state
    const previousCanvasIds = new Set(canvases.map((c) => c.id));
    
    setCanvases((prev) => {
      const currentCanvasIds = new Set(prev.map((c) => c.id));
      const newCanvases = initialCanvases.filter((c) => !currentCanvasIds.has(c.id));
      
      // Update existing Canvas entities with latest data (in case images were added)
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
      
      // Merge new Canvas entities with existing ones, maintaining order (oldest first for chat)
      const merged = newCanvases.length > 0 
        ? [...updatedCanvases, ...newCanvases]
        : updatedCanvases;
      
      // Sort by createdAt if available, otherwise keep order
      const sorted = merged.sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        return a.createdAt.getTime() - b.createdAt.getTime();
      });
      
      // Update the ref with the new Canvas IDs for comparison in next render
      previousCanvasIdsRef.current = new Set(sorted.map((c) => c.id));
      
      return sorted;
    });
    
    setHasMore(initialHasMore);
    // Only update oldestCanvasCreatedAt if we don't have one yet
    if (!oldestCanvasCreatedAt && initialOldestCanvasCreatedAt) {
      setOldestCanvasCreatedAt(initialOldestCanvasCreatedAt);
    }
    
    // If we were processing and now we have Canvas entities with RAW images, stop processing
    if (isProcessing) {
      // If we're waiting for a specific generated MANUFACTURER image, check if it appeared
      if (pendingGeneratedCanvasIdRef.current) {
        const targetCanvas = initialCanvases.find(
          (c) => c.id === pendingGeneratedCanvasIdRef.current
        );
        if (targetCanvas?.images.some((img) => img.type === "RAW")) {
          setIsProcessing(false);
          pendingGeneratedCanvasIdRef.current = null;
        }
      } else {
        // For uploads, check if a NEW Canvas with RAW images appeared
        // Compare with previous Canvas IDs (before this update) to only detect truly new Canvas entities
        const newCanvasWithRaw = initialCanvases.find((c) => 
          !previousCanvasIds.has(c.id) && c.images.some((img) => img.type === "RAW")
        );
        if (newCanvasWithRaw) {
          setIsProcessing(false);
        }
      }
    }
  }, [initialCanvases, initialHasMore, initialOldestCanvasCreatedAt, oldestCanvasCreatedAt, isProcessing]);
  
  const hasInitialScrolledRef = useRef<boolean>(false);
  
  // Track scroll trigger to prevent conflicts
  const scrollTriggerRef = useRef<ScrollTrigger>(ScrollTrigger.NONE);
  
  const scrollToTop = (behavior: ScrollBehavior = "smooth") => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior });
      });
    });
  };
  
  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    // Scroll to absolute bottom - browsers will clamp to max scroll position
    const maxScroll = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight
    );
    
    if (behavior === "auto") {
      // Instant scroll - go to absolute bottom
      window.scrollTo({ top: maxScroll, behavior: "auto" });
    } else {
      // Smooth scroll
      requestAnimationFrame(() => {
        window.scrollTo({ top: maxScroll, behavior: "smooth" });
      });
    }
  };

  // Helper function to start processing action with scroll (assumes isProcessing is already set)
  const startProcessingAction = async <T,>(action: () => Promise<T>): Promise<T> => {
    // Scroll to bottom after spinner renders
    requestAnimationFrame(() => {
      scrollToBottom("auto");
    });
    
    try {
      const result = await action();
      return result;
    } catch (error) {
      // Reset processing state on error
      setIsProcessing(false);
      throw error;
    }
  };

  const messages = useMemo(() => {
    // Group by Canvas entity: RAW image (right), MANUFACTURER image (left)
    return canvases.map((c) => {
      const rawImage = c.images.find((i) => i.type === ImageType.RAW);
      const manufacturerImage = c.images.find((i) => i.type === ImageType.MANUFACTURER);
      return { 
        canvasId: c.id, 
        rawUrl: rawImage?.url, 
        manufacturerUrl: manufacturerImage?.url,
        rawImageId: rawImage?.id,
        manufacturerImageId: manufacturerImage?.id,
      };
    });
  }, [canvases]);

  // Get selected Canvas entity to use its values for the toolbar
  const selectedCanvas = useMemo(() => {
    if (!selectedCanvasId) return null;
    return canvases.find((c) => c.id === selectedCanvasId) || null;
  }, [selectedCanvasId, canvases]);

  // When a Canvas is selected, sync state values to Canvas values (as defaults)
  // This allows users to modify them from the toolbar
  useEffect(() => {
    if (selectedCanvas) {
      setMeshCount(selectedCanvas.meshCount);
      setWidth(selectedCanvas.width);
      setNumColors(selectedCanvas.numColors);
    }
  }, [selectedCanvas]);

  const handleCanvasClick = (canvasId: string) => {
    setSelectedCanvasId((prev) => (prev === canvasId ? null : canvasId));
  };

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Check if the click target is directly on an Image component
    const target = e.target as HTMLElement;
    const isImageClick = target.closest('[data-selectable-image]') !== null || target.tagName === 'IMG';
    
    // If clicking outside images, deselect
    if (!isImageClick && selectedCanvasId) {
      setSelectedCanvasId(null);
    }
  };

  const handleLoadMore = async () => {
    if (!oldestCanvasCreatedAt || isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    scrollTriggerRef.current = ScrollTrigger.LOAD_MORE;
    
    try {
      const result = await getProjectCanvases(projectId, oldestCanvasCreatedAt);
      
      if (result.canvases.length > 0) {
        // Prepend older Canvas entities at the beginning (old images appear above new ones)
        setCanvases(prev => [...result.canvases, ...prev]);
        const newOldest = result.canvases[0].createdAt; // First in asc order is oldest
        if (newOldest) {
          setOldestCanvasCreatedAt(newOldest);
        }
        setHasMore(result.hasMore);
        
        // Scroll to top after loading more (content appears at top)
        scrollToTop("smooth");
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error loading more Canvas entities:", error);
    } finally {
      setIsLoadingMore(false);
      // Reset trigger after a delay to allow DOM update
      setTimeout(() => {
        scrollTriggerRef.current = ScrollTrigger.NONE;
      }, 200);
    }
  };

  const canvasCount = useMemo(() => messages.length, [messages]);
  const hasPendingManufacturerImage = useMemo(
    () => messages.some((m) => m.rawUrl && !m.manufacturerUrl),
    [messages]
  );
  
  // Show spinner if we're uploading or if there are Canvas entities pending MANUFACTURER images
  const showSpinner = isProcessing || hasPendingManufacturerImage;
  
  // Get list of Canvas IDs that are pending (have RAW image but no MANUFACTURER image)
  const pendingCanvasIds = useMemo(
    () => messages.filter((m) => m.rawUrl && !m.manufacturerUrl).map((m) => m.canvasId),
    [messages]
  );
  

  // Initialize scroll state on mount
  useLayoutEffect(() => {
    // Start at the top
    window.scrollTo({ top: 0, behavior: "auto" });
    scrollTriggerRef.current = ScrollTrigger.INITIAL_LOAD;

    // Scroll to bottom after a short delay to allow DOM to render
    // Don't wait for all images to load - this causes significant delays
    const timeoutId = setTimeout(() => {
      if (scrollTriggerRef.current === ScrollTrigger.INITIAL_LOAD) {
        scrollToBottom("smooth");
        hasInitialScrolledRef.current = true;
        scrollTriggerRef.current = ScrollTrigger.NONE;
      }
    }, 100); // Small delay to ensure DOM is ready

    return () => clearTimeout(timeoutId);
  }, []);

  // Scroll to bottom when a new canvas appears (but not during load more)
  const prevCanvasCountRef = useRef<number>(0);
  useEffect(() => {
    if (!hasInitialScrolledRef.current) return;
    if (scrollTriggerRef.current === ScrollTrigger.LOAD_MORE) return; // Don't scroll during load more
    if (canvasCount > prevCanvasCountRef.current) {
      scrollTriggerRef.current = ScrollTrigger.NEW_CANVAS;
      // Use requestAnimationFrame instead of setTimeout for faster response
      requestAnimationFrame(() => {
        scrollToBottom("smooth");
        scrollTriggerRef.current = ScrollTrigger.NONE;
      });
    }
    prevCanvasCountRef.current = canvasCount;
  }, [canvasCount]);

  // Scroll to bottom when a new preview is shown
  useEffect(() => {
    if (!hasInitialScrolledRef.current) return;
    if (localPreview && scrollTriggerRef.current !== ScrollTrigger.LOAD_MORE) {
      scrollTriggerRef.current = ScrollTrigger.PREVIEW;
      scrollToBottom("auto");
      scrollTriggerRef.current = ScrollTrigger.NONE;
    }
  }, [localPreview]);

  // Track which Canvas entities are being processed to avoid duplicate processing
  const processingCanvasIdsRef = useRef<Set<string>>(new Set());

  // Poll for MANUFACTURER image completion when there are pending Canvas entities
  useEffect(() => {
    if (pendingCanvasIds.length === 0 && !isProcessing) return;

    const pollInterval = setInterval(async () => {
      // If we're processing, check for new Canvas entities first
      if (isProcessing) {
        // Refresh to see if the RAW image appeared
        router.refresh();
        return;
      }
      
      // Check each pending Canvas to see if MANUFACTURER image is ready
      for (const canvasId of pendingCanvasIds) {
        const status = await checkCanvasStatus(canvasId);
        
        // If we have RAW image but no MANUFACTURER image, check if this is an AI-generated Canvas
        // and trigger processing if not already processing
        if (
          status?.hasRaw &&
          !status.hasManufacturerImage &&
          status.rawSource === "AI_GENERATED" &&
          !processingCanvasIdsRef.current.has(canvasId)
        ) {
          // Mark as processing to avoid duplicate calls
          processingCanvasIdsRef.current.add(canvasId);
          
          // Trigger processing asynchronously to create the MANUFACTURER image
          processGeneratedManufacturerImage(canvasId).catch((error) => {
            console.error("Error processing MANUFACTURER image:", error);
            processingCanvasIdsRef.current.delete(canvasId);
          });
        }
        
        if (status?.hasManufacturerImage && status.manufacturerImageUrl) {
          // MANUFACTURER image is ready, update the specific Canvas entity in state
          setCanvases((prev) =>
            prev.map((canvas) => {
              if (canvas.id === canvasId) {
                // Check if MANUFACTURER image already exists to avoid duplicates
                const hasManufacturerImage = canvas.images.some((img) => img.type === ImageType.MANUFACTURER);
                if (!hasManufacturerImage) {
                  return {
                    ...canvas,
                    images: [
                      ...canvas.images,
                      {
                        id: `temp-${canvasId}-manufacturer`,
                        url: status.manufacturerImageUrl!,
                        type: ImageType.MANUFACTURER,
                      },
                    ],
                  };
                }
              }
              return canvas;
            })
          );
          
          // Remove from processing set once MANUFACTURER image is ready
          processingCanvasIdsRef.current.delete(canvasId);
        }
      }
    }, 1000); // Poll every second

    return () => clearInterval(pollInterval);
  }, [pendingCanvasIds, isProcessing, router, canvases]);

  async function handleConfirmConvert() {
    if (!selectedFile) return;
    
    // Force immediate state update to show spinner - must happen synchronously before any async work
    flushSync(() => {
      setIsProcessing(true);
    });
    
    // Wait for browser to paint the spinner before starting async work
    // This ensures the spinner is visible before we block with file operations
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          resolve();
        });
      });
    });
    
    await startProcessingAction(async () => {
      const file = selectedFile;
      if (localPreview) {
        URL.revokeObjectURL(localPreview);
      }
      setLocalPreview(null);
      
      // Create FormData with file and parameters
      const formData = new FormData();
      formData.append("file", file);
      formData.append("projectId", projectId);
      formData.append("meshCount", meshCount.toString());
      formData.append("width", width.toString());
      formData.append("numColors", numColors.toString());
      
      // Call server action
      const result = await uploadUserImage(formData);
      
      if (!result.success) {
        console.error("Upload error:", result.error);
        alert(result.error || "Failed to upload image");
        setIsProcessing(false);
        return;
      }
      
      setSelectedFile(null);
      
      // Refresh to get the RAW image (which is created immediately for the new Canvas)
      // The server action will handle revalidation, but we refresh to ensure UI updates
      router.refresh();
    }).catch((error) => {
      console.error("Upload error:", error);
      // Error handling is done in startProcessingAction
    });
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
      <div 
        className={localPreview ? "space-y-3 pb-72 sm:pb-64" : "space-y-3 pb-80 sm:pb-72"}
        onClick={handleContainerClick}
      >
        {messages.map((m) => {
          const isSelected = selectedCanvasId === m.canvasId;
          return (
            <div key={m.canvasId} className="space-y-3">
              {m.rawUrl && (
                <RawImageRow 
                  url={m.rawUrl} 
                  isSelected={isSelected}
                  onClick={() => handleCanvasClick(m.canvasId)}
                />
              )}
              {m.manufacturerUrl && (
                <ManuFacturerImageRow 
                  url={m.manufacturerUrl} 
                  isSelected={isSelected}
                  onClick={() => handleCanvasClick(m.canvasId)}
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
      </div>
      
      {/* Sentinel at true bottom of page - positioned after padding to represent actual bottom */}
      <div ref={bottomRef} className="h-1" />

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
          
          // Force immediate state update to show spinner - must happen synchronously before any async work
          flushSync(() => {
            setIsProcessing(true);
          });
          
          // Wait for browser to paint the spinner before starting async work
          // This ensures the spinner is visible before we block with API calls
          await new Promise<void>((resolve) => {
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                resolve();
              });
            });
          });
          
          await startProcessingAction(async () => {
            // Find the selected Canvas entity to get its config
            const selectedCanvas = canvases.find((c) => c.id === selectedCanvasId);
            if (!selectedCanvas) {
              console.error("Selected Canvas not found");
              setIsProcessing(false);
              return;
            }

            // Generate AI image (this awaits Gemini generation, spinner stays on)
            // Use current state values (meshCount, width, numColors) instead of selected Canvas values
            const result = await generateAIImage(
              selectedCanvasId,
              projectId,
              prompt,
              meshCount,
              width,
              numColors
            );
            
            if (!result.success || !result.canvasId) {
              console.error("Failed to generate AI image:", result.error);
              alert(result.error || "Failed to generate image");
              setIsProcessing(false);
              pendingGeneratedCanvasIdRef.current = null;
              return;
            }

            // Track the Canvas ID we're waiting for - spinner stays on until RAW image appears
            pendingGeneratedCanvasIdRef.current = result.canvasId;

            // Clear selection
            setSelectedCanvasId(null);

            // Refresh to show the new RAW image for the Canvas
            // Processing will be triggered automatically by the polling logic
            // when it detects the RAW image without a MANUFACTURER image
            // The useEffect will set isProcessing to false when the RAW image appears
            router.refresh();
          }).catch((error) => {
            console.error("Error generating AI image:", error);
            alert("An error occurred while generating the image");
            pendingGeneratedCanvasIdRef.current = null;
            // Error handling is done in startProcessingAction
          });
        }}
      />
    </div>
  );
}


