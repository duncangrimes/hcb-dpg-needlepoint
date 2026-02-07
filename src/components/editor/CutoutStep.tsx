"use client";

import { useState } from "react";
import { useEditorStore, useActiveSource } from "@/stores/editor-store";
import { ClipModal } from "./ClipModal";

export function CutoutStep() {
  const [showClipModal, setShowClipModal] = useState(true);
  
  const activeSource = useActiveSource();
  const setStep = useEditorStore((s) => s.setStep);

  if (!activeSource) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-stone-500">No image selected</p>
      </div>
    );
  }

  const handleClose = () => {
    setShowClipModal(false);
    setStep("upload");
  };

  const handleGoToCanvas = () => {
    setShowClipModal(false);
    setStep("arrange");
  };

  return (
    <ClipModal
      isOpen={showClipModal}
      onClose={handleClose}
      onGoToCanvas={handleGoToCanvas}
    />
  );
}
