"use client";

import { upload } from "@vercel/blob/client";
import { type PutBlobResult } from "@vercel/blob";
import { useRef, useState } from "react";

type ImageUploaderProps = {
  projectId: string;
  onUploaded?: (blob: PutBlobResult) => void;
};

export function ImageUploader({ projectId, onUploaded }: ImageUploaderProps) {
  const inputFileRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        setError(null);
        if (!inputFileRef.current?.files?.length) {
          setError("No file selected");
          return;
        }
        const file = inputFileRef.current.files[0];
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
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setIsUploading(false);
        }
      }}
      className="flex items-center gap-3"
    >
      <input name="file" ref={inputFileRef} type="file" accept="image/*" required />
      <button
        type="submit"
        disabled={isUploading}
        className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 disabled:bg-indigo-400 dark:bg-indigo-500 dark:hover:bg-indigo-400"
      >
        {isUploading ? "Uploading..." : "Upload"}
      </button>
      {error && <span className="text-sm text-red-600 dark:text-red-400">{error}</span>}
    </form>
  );
}


