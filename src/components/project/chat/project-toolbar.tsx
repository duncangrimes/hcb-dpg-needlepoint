"use client";

import { useEffect, useRef, useState } from "react";
import RangeSlider from "./RangeSlider";
import { UPLOAD_CONSTRAINTS } from "@/config/upload.config";

export default function ProjectToolbar({
  isProcessing,
  meshCount,
  width,
  numColors,
  selectedCanvasId,
  onMeshCountChange,
  onWidthChange,
  onNumColorsChange,
  onPickFile,
  onConfirmConvert,
  onSendPrompt,
}: {
  isProcessing: boolean;
  meshCount: number;
  width: number;
  numColors: number;
  selectedCanvasId: string | null;
  onMeshCountChange: (v: number) => void;
  onWidthChange: (v: number) => void;
  onNumColorsChange: (v: number) => void;
  onPickFile: (file: File | null, previewUrl: string | null) => void;
  onConfirmConvert: () => void;
  onSendPrompt: (prompt: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const promptTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [prompt, setPrompt] = useState("");

  useEffect(() => () => {
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = promptTextareaRef.current;
    if (textarea) {
      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = "auto";
      // Set height to scrollHeight, with min and max constraints
      const maxHeight = 200; // Max height in pixels (about 5-6 lines)
      const minHeight = 40; // Min height in pixels (single line)
      const newHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight);
      textarea.style.height = `${newHeight}px`;
      textarea.style.overflowY = textarea.scrollHeight > maxHeight ? "auto" : "hidden";
    }
  }, [prompt]);

  const handleSendPrompt = () => {
    if (prompt.trim() && selectedCanvasId) {
      onSendPrompt(prompt.trim());
      setPrompt("");
      // Reset textarea height after sending
      if (promptTextareaRef.current) {
        promptTextareaRef.current.style.height = "auto";
      }
    }
  };

  const hasSelectedCanvas = selectedCanvasId !== null;

  return (
    <div className="fixed bottom-0 inset-x-0 border-t border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:bg-gray-900/70 dark:border-white/10">
      <div className="mx-auto max-w-5xl px-4 py-3 flex flex-col md:flex-row gap-4 md:items-end">
        {!hasSelectedCanvas && (
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="rounded-md px-3 py-2 text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-900 dark:bg-white/10 dark:hover:bg-white/15 dark:text-white"
              disabled={isProcessing}
              onClick={() => inputRef.current?.click()}
            >
              Upload
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              disabled={isProcessing}
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                if (!file) return onPickFile(null, null);
                const url = URL.createObjectURL(file);
                onPickFile(file, url);
              }}
            />
          </div>
        )}

        {hasSelectedCanvas && (
          <div className="flex-1 flex items-end gap-2">
            <textarea
              ref={promptTextareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendPrompt();
                }
              }}
              placeholder="Enter your prompt"
              rows={1}
              className="flex-1 rounded-md px-3 py-2 text-sm border border-gray-300 dark:border-white/20 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none overflow-hidden"
              style={{ minHeight: "40px", maxHeight: "200px" }}
              disabled={isProcessing}
            />
          </div>
        )}

        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
          <fieldset>
            <legend className="text-xs font-semibold text-gray-900 dark:text-white">Mesh</legend>
            <div className="mt-2 flex items-center gap-4">
              {UPLOAD_CONSTRAINTS.meshCount.map((v) => (
                <label key={v} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="radio"
                    name="mesh"
                    checked={meshCount === v}
                    onChange={() => onMeshCountChange(v)}
                    disabled={isProcessing}
                  />
                  {v}
                </label>
              ))}
            </div>
          </fieldset>

          <RangeSlider
            label="Width (in)"
            value={width}
            min={UPLOAD_CONSTRAINTS.widthMin}
            max={UPLOAD_CONSTRAINTS.widthMax}
            step={0.5}
            onChange={onWidthChange}
            disabled={isProcessing}
          />

          <RangeSlider
            label="Colors"
            value={numColors}
            min={UPLOAD_CONSTRAINTS.numColorsMin}
            max={UPLOAD_CONSTRAINTS.numColorsMax}
            step={2}
            onChange={onNumColorsChange}
            disabled={isProcessing}
          />
        </div>

        <div className="md:ml-auto">
          {!hasSelectedCanvas ? (
            <button
              type="button"
              disabled={isProcessing}
              onClick={onConfirmConvert}
              className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 disabled:bg-indigo-400 dark:bg-indigo-500 dark:hover:bg-indigo-400"
            >
              {isProcessing ? "Converting..." : "Convert"}
            </button>
          ) : (
            <button
              type="button"
              disabled={isProcessing || !prompt.trim()}
              onClick={handleSendPrompt}
              className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 disabled:bg-indigo-400 dark:bg-indigo-500 dark:hover:bg-indigo-400"
            >
              {isProcessing ? "Sending..." : "Send"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}


