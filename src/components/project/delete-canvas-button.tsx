"use client";

import { deleteCanvas } from "@/actions/deleteCanvas";

type DeleteCanvasButtonProps = {
  canvasId: string;
};

export function DeleteCanvasButton({ canvasId }: DeleteCanvasButtonProps) {
  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this canvas? This action cannot be undone.")) {
      try {
        await deleteCanvas(canvasId);
      } catch (error) {
        console.error("Failed to delete canvas:", error);
        alert("Failed to delete canvas. Please try again.");
      }
    }
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      className="px-3 py-1 text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 border border-red-300 dark:border-red-600 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
    >
      Delete
    </button>
  );
}
