'use client';

/**
 * Global error boundary for root layout errors
 * This catches errors that error.tsx cannot (layout-level errors)
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-stone-50 dark:bg-stone-900">
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="w-full max-w-md text-center">
            {/* Error icon */}
            <div 
              className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
              style={{ backgroundColor: '#FEE2E2' }}
            >
              <span className="text-4xl">💥</span>
            </div>

            {/* Message */}
            <h1 
              className="text-2xl font-semibold mb-2"
              style={{ color: '#45423C' }}
            >
              Critical Error
            </h1>
            <p 
              className="mb-8"
              style={{ color: '#7A756C' }}
            >
              The app encountered a critical error. Please refresh the page.
            </p>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={reset}
                className="px-6 py-3 text-white font-medium rounded-xl transition"
                style={{ backgroundColor: '#E86142' }}
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="px-6 py-3 font-medium rounded-xl transition"
                style={{ backgroundColor: '#E8E6E0', color: '#45423C' }}
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
