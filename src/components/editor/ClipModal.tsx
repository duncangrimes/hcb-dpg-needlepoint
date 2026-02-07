"use client";

import { Fragment, useState, useCallback } from "react";
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from "@headlessui/react";
import { useEditorStore, useActiveSource, useEditorHistory } from "@/stores/editor-store";
import { LassoCanvas } from "./LassoCanvas";

interface ClipModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoToCanvas: () => void;
}

export function ClipModal({ isOpen, onClose, onGoToCanvas }: ClipModalProps) {
  const activeSource = useActiveSource();
  const cutouts = useEditorStore((s) => s.cutouts);
  const tool = useEditorStore((s) => s.tool);
  const setTool = useEditorStore((s) => s.setTool);
  const activeCutoutId = useEditorStore((s) => s.activeCutoutId);
  const removeCutout = useEditorStore((s) => s.removeCutout);
  const isDrawing = useEditorStore((s) => s.isDrawing);
  
  const { undo, canUndo } = useEditorHistory();
  
  // Track if user just completed a cutout (show action buttons)
  const [showActions, setShowActions] = useState(false);
  
  // When a new cutout is added, show the action buttons
  const prevCutoutCount = useEditorStore((s) => s.cutouts.length);
  
  // Handle continue clipping
  const handleContinueClipping = useCallback(() => {
    setShowActions(false);
    setTool("lasso");
  }, [setTool]);
  
  // Handle go to canvas
  const handleGoToCanvas = useCallback(() => {
    setShowActions(false);
    onGoToCanvas();
  }, [onGoToCanvas]);

  if (!activeSource) return null;

  const cutoutCount = cutouts.filter(c => c.sourceImageId === activeSource.id).length;

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
        {/* Backdrop */}
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/80" />
        </TransitionChild>

        {/* Full-screen modal */}
        <div className="fixed inset-0 overflow-hidden">
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <DialogPanel className="h-full w-full bg-gray-900 flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 bg-gray-800">
                <button
                  onClick={onClose}
                  className="text-white font-medium"
                >
                  ✕ Cancel
                </button>
                <DialogTitle className="text-white font-medium">
                  Draw Selection
                </DialogTitle>
                <div className="w-16 text-right text-sm text-gray-400">
                  {cutoutCount} cutout{cutoutCount !== 1 ? "s" : ""}
                </div>
              </div>

              {/* Lasso canvas */}
              <div className="flex-1 relative overflow-hidden">
                <LassoCanvas 
                  className="w-full h-full" 
                  onCutoutComplete={() => setShowActions(true)}
                />
                
                {/* Instructions overlay (when not drawing) */}
                {!isDrawing && cutoutCount === 0 && (
                  <div className="absolute inset-x-0 bottom-20 flex justify-center pointer-events-none">
                    <div className="bg-black/60 text-white px-4 py-2 rounded-full text-sm">
                      Draw around what you want to include
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom toolbar */}
              <div className="px-4 py-3 bg-gray-800 safe-area-inset-bottom">
                {showActions && cutoutCount > 0 ? (
                  /* Action buttons after completing a cutout */
                  <div className="flex gap-3">
                    <button
                      onClick={handleContinueClipping}
                      className="flex-1 py-3 bg-gray-700 text-white rounded-xl font-medium"
                    >
                      ✂️ Add Another Cutout
                    </button>
                    <button
                      onClick={handleGoToCanvas}
                      className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-medium"
                    >
                      Go to Canvas →
                    </button>
                  </div>
                ) : (
                  /* Tool buttons while drawing */
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setTool("lasso")}
                        className={`px-4 py-2 rounded-lg font-medium ${
                          tool === "lasso"
                            ? "bg-indigo-600 text-white"
                            : "bg-gray-700 text-gray-300"
                        }`}
                      >
                        ✏️ Lasso
                      </button>
                      <button
                        onClick={() => undo()}
                        disabled={!canUndo}
                        className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg font-medium disabled:opacity-40"
                      >
                        ↩️ Undo
                      </button>
                      
                      {activeCutoutId && (
                        <button
                          onClick={() => removeCutout(activeCutoutId)}
                          className="px-4 py-2 bg-red-600/80 text-white rounded-lg font-medium"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                    
                    {cutoutCount > 0 && (
                      <button
                        onClick={handleGoToCanvas}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium"
                      >
                        Done →
                      </button>
                    )}
                  </div>
                )}
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
}
