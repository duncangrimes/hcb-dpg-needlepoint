import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
  const session = await auth();
  
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-900 pb-24">
      {/* Header */}
      <header className="bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800">
        <div className="px-4 py-6 max-w-lg mx-auto">
          <h1 className="text-2xl font-semibold text-stone-900 dark:text-white text-center">
            Profile
          </h1>
        </div>
      </header>

      {/* Content */}
      <main className="px-4 py-6 max-w-lg mx-auto">
        {/* User Info Card */}
        <div className="bg-white dark:bg-stone-800 rounded-xl p-6 shadow-sm mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-terracotta-100 dark:bg-terracotta-900/30 flex items-center justify-center">
              <span className="text-2xl">👤</span>
            </div>
            <div>
              <p className="font-medium text-stone-900 dark:text-white">
                {session.user.name || "Needlepoint User"}
              </p>
              <p className="text-sm text-stone-500 dark:text-stone-400">
                {session.user.email}
              </p>
            </div>
          </div>
        </div>

        {/* Settings */}
        <div className="bg-white dark:bg-stone-800 rounded-xl overflow-hidden shadow-sm mb-6">
          <div className="divide-y divide-stone-100 dark:divide-stone-700">
            <button className="w-full px-4 py-4 flex items-center justify-between text-left hover:bg-stone-50 dark:hover:bg-stone-700/50 transition">
              <div className="flex items-center gap-3">
                <span className="text-xl">🎨</span>
                <span className="text-stone-900 dark:text-white">Preferences</span>
              </div>
              <ChevronRightIcon />
            </button>
            <button className="w-full px-4 py-4 flex items-center justify-between text-left hover:bg-stone-50 dark:hover:bg-stone-700/50 transition">
              <div className="flex items-center gap-3">
                <span className="text-xl">❓</span>
                <span className="text-stone-900 dark:text-white">Help & Support</span>
              </div>
              <ChevronRightIcon />
            </button>
            <button className="w-full px-4 py-4 flex items-center justify-between text-left hover:bg-stone-50 dark:hover:bg-stone-700/50 transition">
              <div className="flex items-center gap-3">
                <span className="text-xl">📜</span>
                <span className="text-stone-900 dark:text-white">Terms & Privacy</span>
              </div>
              <ChevronRightIcon />
            </button>
          </div>
        </div>

        {/* Sign Out */}
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button
            type="submit"
            className="w-full py-4 bg-white dark:bg-stone-800 text-error rounded-xl font-medium shadow-sm hover:bg-error-light dark:hover:bg-error/20 transition"
          >
            Sign Out
          </button>
        </form>

        {/* Version */}
        <p className="text-center text-xs text-stone-400 mt-8">
          Needlepoint v1.0.0
        </p>
      </main>
    </div>
  );
}

function ChevronRightIcon() {
  return (
    <svg className="w-5 h-5 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}
