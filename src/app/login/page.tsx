import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login/form";

function LoginFormFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 dark:bg-stone-900 p-4">
      <div className="w-full max-w-sm animate-pulse">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-stone-200 dark:bg-stone-700" />
        <div className="h-8 bg-stone-200 dark:bg-stone-700 rounded mb-2 mx-auto w-48" />
        <div className="h-4 bg-stone-200 dark:bg-stone-700 rounded mx-auto w-64" />
      </div>
    </div>
  );
}

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }
  return (
    <Suspense fallback={<LoginFormFallback />}>
      <LoginForm />
    </Suspense>
  );
}
