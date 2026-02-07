"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useEditorStore } from "@/stores/editor-store";
import { UploadStep } from "@/components/editor/UploadStep";
import { CutoutStep } from "@/components/editor/CutoutStep";
import { ArrangeStep } from "@/components/editor/ArrangeStep";
import { PreviewStep } from "@/components/editor/PreviewStep";

export default function EditorPage() {
  const searchParams = useSearchParams();
  const canvasId = searchParams.get("canvasId");
  
  const step = useEditorStore((s) => s.step);
  const setCanvasId = useEditorStore((s) => s.setCanvasId);
  const reset = useEditorStore((s) => s.reset);

  // Set canvasId from URL params
  useEffect(() => {
    if (canvasId) {
      setCanvasId(canvasId);
    } else {
      // New canvas - reset store
      reset();
    }
  }, [canvasId, setCanvasId, reset]);

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-stone-50 dark:bg-stone-900 no-overscroll">
      {/* Step content */}
      <div className="flex-1 overflow-hidden">
        {step === "upload" && <UploadStep />}
        {step === "cutout" && <CutoutStep />}
        {step === "arrange" && <ArrangeStep />}
        {step === "preview" && <PreviewStep />}
      </div>
    </div>
  );
}
