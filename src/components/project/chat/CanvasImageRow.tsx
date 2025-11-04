"use client";

import Image from "next/image";

export default function CanvasImageRow({ 
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
    <div className="w-full flex justify-start">
      <div 
        className={`relative w-full max-w-md cursor-pointer transition-all ${
          isSelected ? "ring-4 ring-blue-500" : "ring-1 ring-gray-200 dark:ring-white/10"
        } rounded-lg`}
        onClick={onClick}
      >
        <Image
          src={url}
          alt="Canvas"
          width={800}
          height={800}
          sizes="(max-width: 768px) 90vw, 512px"
          className="w-full h-auto rounded-lg"
          onLoad={() => onLoaded?.()}
        />
      </div>
    </div>
  );
}


