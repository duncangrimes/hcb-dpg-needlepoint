'use client'

import { loginWithEmail } from "@/actions/auth/loginWithEmail";
import { LoginSchema } from "@/lib/zod-schema";
import { useState } from "react";

export function LoginForm() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [email, setEmail] = useState("");

  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    
    const submittedEmail = formData.get("email") as string;
    setEmail(submittedEmail);
    
    try {
      await loginWithEmail(formData);
      setEmailSent(true);
    } catch (err) {
      setErrorMessage("Failed to send login link. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 dark:bg-stone-900 p-4">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-terracotta-500 flex items-center justify-center">
              <span className="text-3xl">🧵</span>
            </div>
            <h1 className="text-2xl font-semibold text-stone-900 dark:text-white">
              Check your email
            </h1>
          </div>

          {/* Success message */}
          <div className="bg-white dark:bg-stone-800 rounded-2xl p-6 shadow-sm border border-stone-200 dark:border-stone-700">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-sage-100 dark:bg-sage-900/30 flex items-center justify-center">
                <span className="text-2xl">✉️</span>
              </div>
              <p className="text-stone-600 dark:text-stone-300 mb-2">
                We sent a magic link to
              </p>
              <p className="font-medium text-stone-900 dark:text-white mb-4">
                {email}
              </p>
              <p className="text-sm text-stone-500 dark:text-stone-400">
                Click the link in the email to sign in. The link expires in 15 minutes.
              </p>
            </div>
          </div>

          {/* Resend */}
          <p className="text-center text-sm text-stone-500 dark:text-stone-400 mt-6">
            Didn't receive it?{" "}
            <button
              onClick={() => setEmailSent(false)}
              className="text-terracotta-600 dark:text-terracotta-400 hover:underline font-medium"
            >
              Try again
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 dark:bg-stone-900 p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-terracotta-500 flex items-center justify-center">
            <span className="text-3xl">🧵</span>
          </div>
          <h1 className="text-2xl font-semibold text-stone-900 dark:text-white">
            Welcome to Needlepoint
          </h1>
          <p className="text-stone-500 dark:text-stone-400 mt-2">
            Turn your photos into custom canvases
          </p>
        </div>

        {/* Form */}
        <div className="bg-white dark:bg-stone-800 rounded-2xl p-6 shadow-sm border border-stone-200 dark:border-stone-700">
          <form action={handleSubmit} className="space-y-4">
            <div>
              <label 
                htmlFor="email" 
                className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2"
              >
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-700 text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-terracotta-500 focus:border-transparent transition"
                onChange={(e) => {
                  const result = LoginSchema.safeParse({ email: e.target.value });
                  if (!result.success && e.target.value.length > 0) {
                    setErrorMessage(result.error.issues[0].message);
                  } else {
                    setErrorMessage(null);
                  }
                }}
              />
            </div>

            {errorMessage && (
              <p className="text-sm text-error dark:text-error-light">
                {errorMessage}
              </p>
            )}

            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-terracotta-500 hover:bg-terracotta-600 disabled:bg-terracotta-300 text-white font-medium rounded-xl transition focus:outline-none focus:ring-2 focus:ring-terracotta-500 focus:ring-offset-2 dark:focus:ring-offset-stone-800"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⏳</span>
                  Sending link...
                </span>
              ) : (
                "Continue with Email"
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-stone-400 dark:text-stone-500 mt-6">
          By continuing, you agree to our{" "}
          <a href="#" className="underline hover:text-stone-600 dark:hover:text-stone-300">
            Terms
          </a>
          {" "}and{" "}
          <a href="#" className="underline hover:text-stone-600 dark:hover:text-stone-300">
            Privacy Policy
          </a>
        </p>
      </div>
    </div>
  );
}
