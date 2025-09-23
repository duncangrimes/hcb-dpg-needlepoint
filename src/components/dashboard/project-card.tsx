"use client";

import Link from "next/link";
import { useTransition } from "react";
import { deleteProject } from "@/actions/deleteProject";

type ProjectCardProps = {
  id: string;
  title: string;
  imageUrl?: string | null;
};

export function ProjectCard({ id, title, imageUrl, onDeleted }: ProjectCardProps & { onDeleted?: () => void }) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteProject(id);
      if (result.success) {
        onDeleted?.();
      }
    });
  };

  return (
    <div className="group relative min-h-4 rounded-lg outline -outline-offset-1 outline-gray-200 dark:outline-white/10">
      <Link href={`/project/${id}`} className="absolute inset-0" aria-label={`Open project ${title}`} />
      <div className="aspect-square w-full overflow-hidden rounded-md bg-gray-200 object-cover group-hover:opacity-75 dark:bg-gray-700 lg:h-80">
        <img
          alt={title}
          src={
            imageUrl ||
            "https://tailwindui.com/img/ecommerce-images/product-page-01-related-product-01.jpg"
          }
          className="h-full w-full object-cover object-center"
        />
      </div>
      <div className="mt-4 flex items-center justify-between px-3 pb-3">
        <h3 className="text-sm text-gray-700 dark:text-gray-300">{title}</h3>
        <button
          type="button"
          aria-label="Delete project"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(); }}
          disabled={isPending}
          className="relative z-10 inline-flex items-center rounded-md bg-transparent px-2 py-1 text-sm text-red-600 hover:text-red-500 hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-white/5"
        >
          {isPending ? "Deleting..." : "Delete"}
        </button>
      </div>
    </div>
  );
}


