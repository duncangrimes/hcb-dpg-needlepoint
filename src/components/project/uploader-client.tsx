"use client";

import { ImageUploader } from "@/components/project/image-uploader";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ProjectImageUploader({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  
  return (
    <div className="relative">
      <ImageUploader
        projectId={projectId}
        onUploaded={async () => {
          try {
            // Multiple refresh attempts to ensure the server state is updated
            router.refresh();
            await new Promise(resolve => setTimeout(resolve, 500));
            router.refresh();
            await new Promise(resolve => setTimeout(resolve, 1000));
            router.refresh();
          } catch (error) {
            console.error("Error refreshing:", error);
          }
        }}
        onProcessingChange={setIsProcessing}
      />
      {isProcessing && (
        <div className="absolute inset-0 bg-white/80 dark:bg-gray-800/80 flex items-center justify-center rounded-lg">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <div className="animate-spin h-4 w-4 border-2 border-indigo-600 border-t-transparent rounded-full"></div>
            Processing image...
          </div>
        </div>
      )}
    </div>
  );
}


