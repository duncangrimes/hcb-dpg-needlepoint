"use client";

import Image from "next/image";

export default function RawImageRow({ 
  url, 
  isSelected = false,
  onClick,
  onLoaded 
}: { 
  url: string; 
  isSelected?: boolean;
  onClick?: () => void;
  onLoaded?: () => void;
}) {
  return (
    <div className="w-full flex justify-end">
      <div 
        className={`relative w-full max-w-md cursor-pointer transition-all ${
          isSelected ? "ring-4 ring-blue-500" : "ring-1 ring-gray-200 dark:ring-white/10"
        } rounded-lg`}
      >
        <span
          data-selectable-image
          onClick={(e) => {
            e.stopPropagation();
            onClick?.();
          }}
          className="block"
        >
          <Image
            src={url}
            alt="Raw"
            width={800}
            height={800}
            sizes="(max-width: 768px) 90vw, 512px"
            className="w-full h-auto rounded-lg"
            onLoad={() => onLoaded?.()}
          />
        </span>
      </div>
    </div>
  );
}


