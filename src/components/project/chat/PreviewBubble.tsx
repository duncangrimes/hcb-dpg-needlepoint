"use client";

import Image from "next/image";

export default function PreviewBubble({ url, onRemove }: { url: string; onRemove: () => void }) {
  return (
    <div className="w-full flex justify-end">
      <div className="relative inline-block">
        <Image
          src={url}
          alt="Selected preview"
          width={112}
          height={112}
          className="w-28 h-28 object-cover rounded-md ring-1 ring-gray-200 dark:ring-white/10"
        />
        <button
          type="button"
          aria-label="Remove"
          onClick={onRemove}
          className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-gray-300 text-gray-800 flex items-center justify-center shadow hover:bg-gray-200"
        >
          ×
        </button>
      </div>
    </div>
  );
}


