import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 dark:bg-stone-900 p-4">
      <div className="w-full max-w-md text-center">
        {/* 404 icon */}
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center">
          <span className="text-4xl">🧶</span>
        </div>

        {/* Message */}
        <h1 className="text-2xl font-semibold text-stone-900 dark:text-white mb-2">
          Page Not Found
        </h1>
        <p className="text-stone-500 dark:text-stone-400 mb-8">
          Looks like this thread leads nowhere. Let's get you back on track.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/dashboard"
            className="px-6 py-3 bg-terracotta-500 hover:bg-terracotta-600 text-white font-medium rounded-xl transition text-center"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/"
            className="px-6 py-3 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-medium rounded-xl hover:bg-stone-200 dark:hover:bg-stone-700 transition text-center"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
