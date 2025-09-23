"use client";

import { upload } from "@vercel/blob/client";
import { type PutBlobResult } from "@vercel/blob";
import { useEffect, useRef, useState } from "react";
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
          const blob = await upload(file.name, file, {
            access: "public",
            handleUploadUrl: "/api/images/upload",
            clientPayload: JSON.stringify({ projectId }),
          });
          onUploaded?.(blob);
          // reset input so the same file can be selected again
          if (inputFileRef.current) inputFileRef.current.value = "";
          if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
          }
          setSelectedFile(null);
          // refresh server components so new image appears
          router.refresh();
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setIsUploading(false);
        }
      }}
      className="w-full"
    >
      <div className="flex items-center justify-center w-full">
        <label
          htmlFor="dropzone-file"
          className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-600"
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
      <div className="mt-3 flex items-center gap-3">
        <button
          type="submit"
          disabled={isUploading}
          className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 disabled:bg-indigo-400 dark:bg-indigo-500 dark:hover:bg-indigo-400"
        >
          {isUploading ? "Uploading..." : "Upload"}
        </button>
        {selectedFile && (
          <span className="text-sm text-gray-600 dark:text-gray-300 truncate max-w-[16rem]">{selectedFile.name}</span>
        )}
        {error && <span className="text-sm text-red-600 dark:text-red-400">{error}</span>}
      </div>
    </form>
  );
}


