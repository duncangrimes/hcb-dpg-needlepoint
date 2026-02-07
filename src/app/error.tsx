'use client';

import { useEffect } from 'react';
import toast from 'react-hot-toast';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console in development
    console.error('Global error:', error);
    
    // Show toast notification
    toast.error('Something went wrong. Please try again.');
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 dark:bg-stone-900 p-4">
      <div className="w-full max-w-md text-center">
        {/* Error icon */}
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-error-light dark:bg-error/20 flex items-center justify-center">
          <span className="text-4xl">😵</span>
        </div>

        {/* Message */}
        <h1 className="text-2xl font-semibold text-stone-900 dark:text-white mb-2">
          Something went wrong
        </h1>
        <p className="text-stone-500 dark:text-stone-400 mb-8">
          We hit an unexpected error. Don't worry, your work is safe.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="px-6 py-3 bg-terracotta-500 hover:bg-terracotta-600 text-white font-medium rounded-xl transition"
          >
            Try Again
          </button>
          <a
            href="/dashboard"
            className="px-6 py-3 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-medium rounded-xl hover:bg-stone-200 dark:hover:bg-stone-700 transition"
          >
            Go to Dashboard
          </a>
        </div>

        {/* Error details (dev only) */}
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-8 text-left bg-stone-100 dark:bg-stone-800 rounded-xl p-4">
            <summary className="cursor-pointer text-sm font-medium text-stone-600 dark:text-stone-400">
              Error details
            </summary>
            <pre className="mt-2 text-xs text-error overflow-auto max-h-40">
              {error.message}
              {error.stack && `\n\n${error.stack}`}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
