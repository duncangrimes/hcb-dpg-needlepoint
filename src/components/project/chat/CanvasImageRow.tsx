"use client";

import Image from "next/image";

export default function CanvasImageRow({ url, onLoaded }: { url: string; onLoaded?: () => void }) {
  return (
    <div className="w-full flex justify-start">
      <div className="relative w-full max-w-md">
        <Image
          src={url}
          alt="Canvas"
          width={800}
          height={800}
          sizes="(max-width: 768px) 90vw, 512px"
          className="w-full h-auto rounded-lg ring-1 ring-gray-200 dark:ring-white/10"
          onLoadingComplete={() => onLoaded?.()}
        />
      </div>
    </div>
  );
}


