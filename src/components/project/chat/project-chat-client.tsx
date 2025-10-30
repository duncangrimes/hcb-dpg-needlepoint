"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import RawImageRow from "./RawImageRow";
import CanvasImageRow from "./CanvasImageRow";
import PreviewBubble from "./PreviewBubble";
import { useRouter } from "next/navigation";
import ProjectToolbar from "./project-toolbar";

type ImageRecord = { id: string; url: string; type: "RAW" | "CANVAS" };
type CanvasRecord = {
  id: string;
  meshCount: number;
  width: number;
  numColors: number;
  images: ImageRecord[];
};

export default function ProjectChatClient({
  projectId,
  initialCanvases,
}: {
  projectId: string;
  initialCanvases: CanvasRecord[];
}) {
  const router = useRouter();
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [meshCount, setMeshCount] = useState<number>(13);
  const [width, setWidth] = useState<number>(8);
  const [numColors, setNumColors] = useState<number>(12);
  const [optimisticRaw, setOptimisticRaw] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
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
    return initialCanvases.map((c) => {
      const raw = c.images.find((i) => i.type === "RAW");
      const canvas = c.images.find((i) => i.type === "CANVAS");
      return { canvasId: c.id, rawUrl: raw?.url, canvasUrl: canvas?.url };
    });
  }, [initialCanvases]);

  // Clear optimistic RAW only after we observe an increase in server RAW count
  const prevRawCountRef = useRef<number>(0);
  const rawCount = useMemo(() => messages.filter((m) => Boolean(m.rawUrl)).length, [messages]);
  const canvasCount = useMemo(() => messages.filter((m) => Boolean(m.canvasUrl)).length, [messages]);
  const hasPendingCanvas = useMemo(
    () => messages.some((m) => m.rawUrl && !m.canvasUrl),
    [messages]
  );
  useEffect(() => {
    if (rawCount > prevRawCountRef.current) {
      setOptimisticRaw(null);
    }
    prevRawCountRef.current = rawCount;
  }, [rawCount]);

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

  // Scroll to bottom when a new preview is shown or optimistic RAW is added
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
  useEffect(() => {
    if (!didInitialScrollRef.current) return;
    if (optimisticRaw) {
      // Wait a tick for the DOM to update, then scroll to absolute bottom
      setTimeout(() => scrollToAbsoluteBottom("smooth"), 100);
    }
  }, [optimisticRaw]);

  // While a canvas is pending (or we have an optimistic RAW), poll for updates
  useEffect(() => {
    if (!hasPendingCanvas && !optimisticRaw) return;
    const interval = setInterval(() => {
      router.refresh();
    }, 1000);
    return () => clearInterval(interval);
  }, [hasPendingCanvas, optimisticRaw, router]);

  async function handleConfirmConvert() {
    if (!selectedFile) return;
    setIsProcessing(true);
    try {
      const file = selectedFile;
      if (localPreview) {
        setOptimisticRaw(localPreview);
        URL.revokeObjectURL(localPreview);
      }
      setLocalPreview(null);
      await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/images/upload",
        clientPayload: JSON.stringify({ projectId, meshCount, width, numColors }),
      });
      setSelectedFile(null);
      router.refresh();
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="relative">
      <div className={localPreview ? "space-y-3 pb-28 sm:pb-18" : "space-y-3 pb-36 sm:pb-26"}>
        {messages.map((m) => (
          <div key={m.canvasId} className="space-y-3">
            {m.rawUrl && (
              <RawImageRow url={m.rawUrl} onLoaded={() => setInitialLoadedImages((v) => v + 1)} />
            )}
            {m.canvasUrl && (
              <CanvasImageRow url={m.canvasUrl} onLoaded={() => setInitialLoadedImages((v) => v + 1)} />
            )}
          </div>
        ))}

        {optimisticRaw && optimisticRaw.length > 0 && (
          <div>
            <RawImageRow url={optimisticRaw} />
          </div>
        )}

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

        {((optimisticRaw && optimisticRaw.length > 0) || hasPendingCanvas) && (
          <div className="w-full flex justify-center">
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
      />
    </div>
  );
}


