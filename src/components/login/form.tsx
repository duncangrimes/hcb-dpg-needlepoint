'use client'

import { loginWithEmail } from "@/actions/auth/loginWithEmail";
import { LoginSchema } from "@/lib/zod-schema";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { ArrowPathIcon } from "@heroicons/react/24/outline";

export function LoginForm() {
  const searchParams = useSearchParams();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sentEmail, setSentEmail] = useState<string | null>(null);
  
  // Check if redirected from Auth.js verify flow (Auth.js adds these params)
  const isVerifyRedirect = searchParams.get('provider') === 'resend' && searchParams.get('type') === 'email';
  const showEmailSent = sentEmail || isVerifyRedirect;
  
  // Show toast on verify redirect
  useEffect(() => {
    if (isVerifyRedirect) {
      toast.success(
        <div>
          <p className="font-medium">Magic link sent!</p>
          <p className="text-sm opacity-80">Check your email inbox</p>
        </div>,
        { duration: 6000, id: 'verify-toast' }
      );
    }
  }, [isVerifyRedirect]);

  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    
    try {
      // Auth.js will redirect to /login?verify=1 after sending email
      await loginWithEmail(formData);
    } catch (err) {
      setIsSubmitting(false);
      toast.error("Failed to send login link. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 dark:bg-stone-900 p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-terracotta-500 flex items-center justify-center shadow-lg shadow-terracotta-500/25">
            <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.5 4.5L5 14l5 5 9.5-9.5" />
              <path d="M14.5 4.5l3 3" />
              <path d="M5 14l-3 3" />
              <path d="M10 19l3 3" />
            </svg>
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

            {/* Email sent hint */}
            {showEmailSent && !isSubmitting && (
              <div className="bg-sage-50 dark:bg-sage-900/20 border border-sage-200 dark:border-sage-800 rounded-lg p-3 text-sage-700 dark:text-sage-300 text-sm">
                <p className="font-medium">Check your inbox!</p>
                <p className="text-sage-600 dark:text-sage-400">
                  {sentEmail 
                    ? `We sent a link to ${sentEmail}` 
                    : "We sent you a magic link to sign in"}
                </p>
              </div>
            )}

            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-terracotta-500 hover:bg-terracotta-600 disabled:bg-terracotta-300 text-white font-medium rounded-xl transition focus:outline-none focus:ring-2 focus:ring-terracotta-500 focus:ring-offset-2 dark:focus:ring-offset-stone-800"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <ArrowPathIcon className="w-5 h-5 animate-spin" />
                  Sending link...
                </span>
              ) : showEmailSent ? (
                "Resend Link"
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
