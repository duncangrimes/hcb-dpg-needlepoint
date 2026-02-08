"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useEditorStore } from "@/stores/editor-store";
import { useEditorPersistence } from "@/hooks/useEditorPersistence";
import { UploadStep } from "@/components/editor/UploadStep";
import { CutoutStep } from "@/components/editor/CutoutStep";
import { ArrangeStep } from "@/components/editor/ArrangeStep";
import { PreviewStep } from "@/components/editor/PreviewStep";

function EditorContent() {
  const searchParams = useSearchParams();
  const canvasId = searchParams.get("canvasId");
  
  const step = useEditorStore((s) => s.step);
  const setCanvasId = useEditorStore((s) => s.setCanvasId);
  const reset = useEditorStore((s) => s.reset);

  // Persist editor state to localStorage for anonymous users
  useEditorPersistence();

  // Set canvasId from URL params
  useEffect(() => {
    if (canvasId) {
      setCanvasId(canvasId);
    }
    // Note: Don't reset on new canvas - let persistence hook restore if available
  }, [canvasId, setCanvasId]);

  return (
    <>
      {step === "upload" && <UploadStep />}
      {step === "cutout" && <CutoutStep />}
      {step === "arrange" && <ArrangeStep />}
      {step === "preview" && <PreviewStep />}
    </>
  );
}

function EditorLoading() {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin text-4xl mb-2">⏳</div>
        <p className="text-stone-500">Loading editor...</p>
      </div>
    </div>
  );
}

export default function EditorPage() {
  return (
    <div className="h-[100dvh] w-full flex flex-col bg-stone-50 dark:bg-stone-900 no-overscroll">
      {/* Step content */}
      <div className="flex-1 overflow-hidden">
        <Suspense fallback={<EditorLoading />}>
          <EditorContent />
        </Suspense>
      </div>
    </div>
  );
}
