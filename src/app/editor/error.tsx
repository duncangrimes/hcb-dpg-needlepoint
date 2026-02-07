'use client';

import { useEffect } from 'react';
import { showToast } from '@/lib/toast';

export default function EditorError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Editor error:', error);
    showToast.error('Editor error', 'Something went wrong while editing');
  }, [error]);

  return (
    <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-stone-50 dark:bg-stone-900 p-4">
      <div className="text-center max-w-sm">
        {/* Error icon */}
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-error-light dark:bg-error/20 flex items-center justify-center">
          <span className="text-3xl">✂️</span>
        </div>

        <h2 className="text-xl font-semibold text-stone-900 dark:text-white mb-2">
          Editor Error
        </h2>
        <p className="text-stone-500 dark:text-stone-400 mb-6">
          Something went wrong in the editor. Your progress should be saved.
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={reset}
            className="w-full py-3 bg-terracotta-500 hover:bg-terracotta-600 text-white font-medium rounded-xl transition"
          >
            Try Again
          </button>
          <a
            href="/dashboard"
            className="w-full py-3 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-medium rounded-xl hover:bg-stone-200 dark:hover:bg-stone-700 transition text-center"
          >
            Back to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
