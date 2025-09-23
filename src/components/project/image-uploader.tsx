"use client";

import { upload } from "@vercel/blob/client";
import { type PutBlobResult } from "@vercel/blob";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { useRouter } from "next/navigation";

type ImageUploaderProps = {
  projectId: string;
  onUploaded?: (blob: PutBlobResult) => void;
};

export function ImageUploader({ projectId, onUploaded }: ImageUploaderProps) {
  const router = useRouter();
  const inputFileRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [meshCount, setMeshCount] = useState<number>(13);
  const [widthInput, setWidthInput] = useState<string>("8");
  const [numColorsInput, setNumColorsInput] = useState<string>("12");
  const widthSchema = z.number().min(6).max(14);
  const parsedWidth = widthInput === "" ? undefined : Number(widthInput);
  const isValidWidth = parsedWidth !== undefined && widthSchema.safeParse(parsedWidth).success;
  const numColorsSchema = z.number().min(3).max(30);
  const parsedNumColors = numColorsInput === "" ? undefined : Number(numColorsInput);
  const isValidNumColors = parsedNumColors !== undefined && numColorsSchema.safeParse(parsedNumColors).success;

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        setError(null);
        if (!selectedFile) {
          setError("No file selected");
          return;
        }
        const file = selectedFile;
        try {
          setIsUploading(true);
          setError(null);
          const blob = await upload(file.name, file, {
            access: "public",
            handleUploadUrl: "/api/images/upload",
            clientPayload: JSON.stringify({ projectId, meshCount, width: parsedWidth, numColors: parsedNumColors }),
          });
          
          // Wait a moment for the server processing to complete
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          onUploaded?.(blob);
          
          // reset input so the same file can be selected again
          if (inputFileRef.current) inputFileRef.current.value = "";
          if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
          }
          setSelectedFile(null);
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setIsUploading(false);
        }
      }}
      className="w-full rounded-lg border border-gray-200 p-4 bg-white dark:bg-gray-800 dark:border-white/10"
    >
      <div className="flex items-center justify-center w-full">
        <label
          htmlFor="dropzone-file"
          className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-600"
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setError(null);
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            const file = e.dataTransfer.files?.[0];
            if (file) {
              const url = URL.createObjectURL(file);
              setPreviewUrl(url);
              setSelectedFile(file);
            }
          }}
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            {previewUrl ? (
              <img
                alt="Selected preview"
                src={previewUrl}
                className="h-48 w-auto max-w-full rounded object-contain ring-1 ring-gray-200 dark:ring-white/10 bg-white/50"
              />
            ) : (
              <>
                <svg className="w-8 h-8 mb-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                </svg>
                <p className="mb-2 text-sm text-gray-500 dark:text-gray-400"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">PNG, JPG, WEBP</p>
              </>
            )}
          </div>
          <input
            id="dropzone-file"
            name="file"
            ref={inputFileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              setError(null);
              if (previewUrl) URL.revokeObjectURL(previewUrl);
              const file = e.target.files?.[0] ?? null;
              setSelectedFile(file);
              if (file) {
                const url = URL.createObjectURL(file);
                setPreviewUrl(url);
              } else {
                setPreviewUrl(null);
              }
            }}
          />
        </label>
      </div>
      {/* Mesh + Width + Upload row */}
      <div className="mt-6 flex flex-col gap-8 md:flex-row md:items-start">
        <fieldset>
          <legend className="text-sm/6 font-semibold text-gray-900 dark:text-white">Mesh count</legend>
          <p className="mt-1 text-sm/6 text-gray-600 dark:text-gray-400">Select canvas mesh (holes per inch).</p>
          <div className="mt-4 space-y-3">
            {[13, 18].map((count) => (
              <div key={count} className="flex items-center">
                <input
                  id={`mesh-${count}`}
                  name="mesh-count"
                  type="radio"
                  checked={meshCount === count}
                  onChange={() => setMeshCount(count)}
                  className="relative size-4 appearance-none rounded-full border border-gray-300 bg-white before:absolute before:inset-1 before:rounded-full before:bg-white not-checked:before:hidden checked:border-indigo-600 checked:bg-indigo-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:border-gray-300 disabled:bg-gray-100 disabled:before:bg-gray-400 dark:border-white/10 dark:bg-white/5 dark:checked:border-indigo-500 dark:checked:bg-indigo-500 dark:focus-visible:outline-indigo-500 dark:disabled:border-white/5 dark:disabled:bg-white/10 dark:disabled:before:bg-white/20 forced-colors:appearance-auto forced-colors:before:hidden"
                />
                <label htmlFor={`mesh-${count}`} className="ml-3 block text-sm/6 font-medium text-gray-900 dark:text-white">
                  {count} mesh
                </label>
              </div>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="canvas-width" className="block text-sm/6 font-semibold text-gray-900 dark:text-white">Width (inches)</label>
          <div className="mt-2">
            <input
              id="canvas-width"
              type="number"
              min={6}
              max={14}
              step={0.5}
              value={widthInput}
              onChange={(e) => {
                // Allow empty string while typing/clearing
                setWidthInput(e.target.value);
              }}
              className="block w-32 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-900 shadow-xs placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
            <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">6 to 14 inches.</p>
          </div>
        </div>

        <div>
          <label htmlFor="num-colors" className="block text-sm/6 font-semibold text-gray-900 dark:text-white">Number of colors</label>
          <div className="mt-2">
            <input
              id="num-colors"
              type="number"
              min={3}
              max={30}
              step={1}
              value={numColorsInput}
              onChange={(e) => {
                setNumColorsInput(e.target.value);
              }}
              className="block w-32 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-900 shadow-xs placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
            <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">Between 3 and 30 colors.</p>
          </div>
        </div>

        {/* Upload button on same row for md+ */}
        <div className="md:ml-auto">
          <button
            type="submit"
            disabled={isUploading || !isValidWidth || !isValidNumColors || !selectedFile}
            className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 disabled:bg-indigo-400 dark:bg-indigo-500 dark:hover:bg-indigo-400"
          >
            {isUploading ? "Uploading..." : "Upload"}
          </button>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3">
        {selectedFile && (
          <span className="text-sm text-gray-600 dark:text-gray-300 truncate max-w-[16rem]">{selectedFile.name}</span>
        )}
        {!isValidWidth && (
          <span className="text-sm text-red-600 dark:text-red-400">Width must be between 6 and 14 inches</span>
        )}
        {!isValidNumColors && (
          <span className="text-sm text-red-600 dark:text-red-400">Colors must be between 3 and 30</span>
        )}
        {error && <span className="text-sm text-red-600 dark:text-red-400">{error}</span>}
      </div>
    </form>
  );
}


