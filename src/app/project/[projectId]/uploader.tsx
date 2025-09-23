"use client";

import { ImageUploader } from "@/components/project/image-uploader";
import { useRouter } from "next/navigation";

export function ProjectImageUploader({ projectId }: { projectId: string }) {
  const router = useRouter();
  return (
    <ImageUploader
      projectId={projectId}
      onUploaded={() => {
        // Trigger an immediate refresh, then a delayed one to catch server write completion
        router.refresh();
        setTimeout(() => {
          router.refresh();
        }, 800);
      }}
    />
  );
}


