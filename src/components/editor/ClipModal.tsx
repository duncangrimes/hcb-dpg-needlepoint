"use client";

import { Fragment, useState, useCallback } from "react";
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from "@headlessui/react";
import { ArrowPathIcon, ArrowUturnLeftIcon, PencilIcon, TrashIcon, ScissorsIcon, ArrowRightIcon, XMarkIcon } from "@heroicons/react/24/outline";
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
  const cancelDrawing = useEditorStore((s) => s.cancelDrawing);
  
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
            <DialogPanel className="h-full w-full bg-stone-900 flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 bg-stone-800">
                <button
                  onClick={onClose}
                  className="text-white font-medium flex items-center gap-1"
                >
                  <XMarkIcon className="w-5 h-5" /> Cancel
                </button>
                <DialogTitle className="text-white font-medium">
                  Draw Selection
                </DialogTitle>
                <div className="w-16 text-right text-sm text-stone-400">
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
              <div className="px-4 py-3 bg-stone-800 safe-area-inset-bottom">
                {showActions && cutoutCount > 0 ? (
                  /* Action buttons after completing a cutout */
                  <div className="flex gap-3">
                    <button
                      onClick={handleContinueClipping}
                      className="flex-1 py-3 bg-stone-700 text-white rounded-xl font-medium flex items-center justify-center gap-2"
                    >
                      <ScissorsIcon className="w-5 h-5" /> Add Another Cutout
                    </button>
                    <button
                      onClick={handleGoToCanvas}
                      className="flex-1 py-3 bg-terracotta-500 text-white rounded-xl font-medium flex items-center justify-center gap-2"
                    >
                      Go to Canvas <ArrowRightIcon className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  /* Tool buttons while drawing */
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setTool("lasso")}
                        className={`px-4 py-2 rounded-lg font-medium flex items-center gap-1.5 ${
                          tool === "lasso"
                            ? "bg-terracotta-500 text-white"
                            : "bg-stone-700 text-stone-300"
                        }`}
                      >
                        <PencilIcon className="w-4 h-4" /> Lasso
                      </button>
                      
                      {/* Clear button - appears while actively drawing */}
                      {isDrawing && (
                        <button
                          onClick={cancelDrawing}
                          className="px-4 py-2 bg-stone-700 text-stone-300 rounded-lg font-medium hover:bg-stone-600 active:bg-stone-500 flex items-center gap-1.5"
                        >
                          <ArrowPathIcon className="w-4 h-4" /> Clear
                        </button>
                      )}
                      
                      {/* Undo button - for completed cutouts */}
                      {!isDrawing && (
                        <button
                          onClick={() => undo()}
                          disabled={!canUndo}
                          className="px-4 py-2 bg-stone-700 text-stone-300 rounded-lg font-medium disabled:opacity-40 flex items-center gap-1.5"
                        >
                          <ArrowUturnLeftIcon className="w-4 h-4" /> Undo
                        </button>
                      )}
                      
                      {activeCutoutId && (
                        <button
                          onClick={() => removeCutout(activeCutoutId)}
                          className="px-4 py-2 bg-error/80 text-white rounded-lg font-medium"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                    
                    {cutoutCount > 0 && (
                      <button
                        onClick={handleGoToCanvas}
                        className="px-4 py-2 bg-terracotta-500 text-white rounded-lg font-medium flex items-center gap-1.5"
                      >
                        Done <ArrowRightIcon className="w-4 h-4" />
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
