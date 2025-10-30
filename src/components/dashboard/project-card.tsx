"use client";

import Link from "next/link";
import { useTransition } from "react";
import { deleteProject } from "@/actions/deleteProject";

type ProjectCardProps = {
  id: string;
  name: string;
  imageUrl?: string | null;
};

export function ProjectCard({ id, name, imageUrl, onDeleted }: ProjectCardProps & { onDeleted?: () => void }) {
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
      <Link href={`/project/${id}`} aria-label={`Open project ${name}`} className="block">
        <div className="aspect-square w-full overflow-hidden rounded-md bg-gray-200 object-cover group-hover:opacity-75 dark:bg-gray-700 lg:h-80">
          <img
            alt={name}
            src={
              imageUrl ||
              "https://tailwindui.com/img/ecommerce-images/product-page-01-related-product-01.jpg"
            }
            className="h-full w-full object-cover object-center"
          />
        </div>
      </Link>
      <div className="mt-4 flex items-center justify-between px-3 pb-3">
        <Link href={`/project/${id}`} className="flex-1 min-w-0" aria-label={`Open project ${name}`}>
          <h3 className="text-sm text-gray-700 dark:text-gray-300">{name}</h3>
        </Link>
        <button
          type="button"
          aria-label="Delete project"
          onClick={() => { handleDelete(); }}
          disabled={isPending}
          className="relative z-10 inline-flex items-center rounded-md bg-transparent px-2 py-1 text-sm text-red-600 hover:text-red-500 hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-white/5"
        >
          {isPending ? "Deleting..." : "Delete"}
        </button>
      </div>
    </div>
  );
}


