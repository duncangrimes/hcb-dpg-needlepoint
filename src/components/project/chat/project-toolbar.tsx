"use client";

import { useEffect, useRef } from "react";

export default function ProjectToolbar({
  isProcessing,
  meshCount,
  width,
  numColors,
  onMeshCountChange,
  onWidthChange,
  onNumColorsChange,
  onPickFile,
  onConfirmConvert,
}: {
  isProcessing: boolean;
  meshCount: number;
  width: number;
  numColors: number;
  onMeshCountChange: (v: number) => void;
  onWidthChange: (v: number) => void;
  onNumColorsChange: (v: number) => void;
  onPickFile: (file: File | null, previewUrl: string | null) => void;
  onConfirmConvert: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => {
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  return (
    <div className="fixed bottom-0 inset-x-0 border-t border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:bg-gray-900/70 dark:border-white/10">
      <div className="mx-auto max-w-5xl px-4 py-3 flex flex-col md:flex-row gap-4 md:items-center">
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
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null;
              if (!file) return onPickFile(null, null);
              const url = URL.createObjectURL(file);
              onPickFile(file, url);
            }}
          />
        </div>

        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
          <fieldset>
            <legend className="text-xs font-semibold text-gray-900 dark:text-white">Mesh</legend>
            <div className="mt-2 flex items-center gap-4">
              {[13, 18].map((v) => (
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

          <div>
            <label className="block text-xs font-semibold text-gray-900 dark:text-white">Width (in) — {width}</label>
            <input
              type="range"
              min={6}
              max={14}
              step={0.5}
              value={width}
              onChange={(e) => onWidthChange(Number(e.target.value))}
              disabled={isProcessing}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-900 dark:text-white">Colors — {numColors}</label>
            <input
              type="range"
              min={4}
              max={30}
              step={2}
              value={numColors}
              onChange={(e) => onNumColorsChange(Number(e.target.value))}
              disabled={isProcessing}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            />
          </div>
        </div>

        <div className="md:ml-auto">
          <button
            type="button"
            disabled={isProcessing}
            onClick={onConfirmConvert}
            className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 disabled:bg-indigo-400 dark:bg-indigo-500 dark:hover:bg-indigo-400"
          >
            {isProcessing ? "Converting..." : "Convert"}
          </button>
        </div>
      </div>
    </div>
  );
}


