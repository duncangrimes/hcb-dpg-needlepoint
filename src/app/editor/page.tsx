"use client";

import { useEditorStore } from "@/stores/editor-store";
import { UploadStep } from "@/components/editor/UploadStep";
import { CutoutStep } from "@/components/editor/CutoutStep";
import { ArrangeStep } from "@/components/editor/ArrangeStep";
import { PreviewStep } from "@/components/editor/PreviewStep";

export default function EditorPage() {
  const step = useEditorStore((s) => s.step);

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-gray-50 dark:bg-gray-900 no-overscroll">
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
