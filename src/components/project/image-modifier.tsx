"use client";

import { useState } from "react";
import Image from "next/image";

type ImageModifierProps = {
  canvasName: string;
  originalImage: string;
  onDeselect: () => void;
};

export function ImageModifier({ canvasName, originalImage, onDeselect }: ImageModifierProps) {
  const [prompt, setPrompt] = useState("");

  const handleSend = () => {
    if (prompt.trim()) {
      // TODO: Implement prompt sending functionality
      console.log("Sending prompt:", prompt);
      setPrompt("");
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Selected Canvas: {canvasName}
        </h2>
        <button
          onClick={onDeselect}
          className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded-md transition-colors"
        >
          Deselect
        </button>
      </div>
      
      <div className="mb-4">
        <Image 
          alt={`${canvasName} original`} 
          src={originalImage} 
          width={400} 
          height={400} 
          className="w-full h-auto max-h-64 object-contain bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700" 
        />
      </div>
      
      <div className="space-y-3">
        <label htmlFor="prompt" className="block text-sm font-medium text-gray-900 dark:text-gray-100">
          Prompt
        </label>
        <textarea
          id="prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter your prompt here..."
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent resize-none"
          rows={3}
        />
        <button
          onClick={handleSend}
          disabled={!prompt.trim()}
          className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-md transition-colors"
        >
          Send Prompt
        </button>
      </div>
    </div>
  );
}
