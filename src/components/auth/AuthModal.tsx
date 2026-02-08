"use client";

import { Fragment, useState } from "react";
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from "@headlessui/react";
import { loginWithEmail } from "@/actions/auth/loginWithEmail";
import { LoginSchema } from "@/lib/zod-schema";
import toast from "react-hot-toast";
import { ArrowPathIcon } from "@heroicons/react/24/outline";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  /** Action to perform after successful auth (stored in sessionStorage) */
  postAuthAction?: string;
}

export function AuthModal({
  isOpen,
  onClose,
  title = "Sign in to continue",
  description = "Create a free account to save your work and download your canvas.",
  postAuthAction,
}: AuthModalProps) {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const result = LoginSchema.safeParse({ email });
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }

    setIsSubmitting(true);

    try {
      // Store the post-auth action before triggering auth
      if (postAuthAction) {
        sessionStorage.setItem("postAuthAction", postAuthAction);
      }

      const formData = new FormData();
      formData.append("email", email);
      await loginWithEmail(formData);
      
      // If we get here without redirect, show success
      setEmailSent(true);
      toast.success("Check your email for the magic link!");
    } catch (err) {
      // loginWithEmail redirects on success, so errors are real errors
      setError("Failed to send magic link. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setEmail("");
    setEmailSent(false);
    setError(null);
    onClose();
  };

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog onClose={handleClose} className="relative z-50">
        {/* Backdrop */}
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
        </TransitionChild>

        {/* Modal */}
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <DialogPanel className="w-full max-w-sm bg-white dark:bg-stone-800 rounded-2xl p-6 shadow-xl">
              {/* Logo */}
              <div className="text-center mb-4">
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-terracotta-500 flex items-center justify-center shadow-lg shadow-terracotta-500/25">
                  <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14.5 4.5L5 14l5 5 9.5-9.5" />
                    <path d="M14.5 4.5l3 3" />
                    <path d="M5 14l-3 3" />
                    <path d="M10 19l3 3" />
                  </svg>
                </div>
                <DialogTitle className="text-lg font-semibold text-stone-900 dark:text-white">
                  {title}
                </DialogTitle>
                <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
                  {description}
                </p>
              </div>

              {emailSent ? (
                /* Email sent state */
                <div className="text-center py-4">
                  <div className="bg-sage-50 dark:bg-sage-900/20 border border-sage-200 dark:border-sage-800 rounded-lg p-4 mb-4">
                    <p className="font-medium text-sage-700 dark:text-sage-300">
                      Check your inbox!
                    </p>
                    <p className="text-sm text-sage-600 dark:text-sage-400 mt-1">
                      We sent a magic link to {email}
                    </p>
                  </div>
                  <p className="text-xs text-stone-400">
                    Your work will be saved after you sign in.
                  </p>
                </div>
              ) : (
                /* Email form */
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label
                      htmlFor="auth-email"
                      className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5"
                    >
                      Email address
                    </label>
                    <input
                      id="auth-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      autoComplete="email"
                      autoFocus
                      className="w-full px-3 py-2.5 rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-700 text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-terracotta-500 focus:border-transparent transition"
                    />
                  </div>

                  {error && (
                    <p className="text-sm text-error dark:text-error-light">
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting || !email}
                    className="w-full py-2.5 bg-terracotta-500 hover:bg-terracotta-600 disabled:bg-terracotta-300 text-white font-medium rounded-xl transition focus:outline-none focus:ring-2 focus:ring-terracotta-500 focus:ring-offset-2 dark:focus:ring-offset-stone-800"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <ArrowPathIcon className="w-5 h-5 animate-spin" />
                        Sending...
                      </span>
                    ) : (
                      "Continue with Email"
                    )}
                  </button>
                </form>
              )}

              {/* Close button */}
              <button
                onClick={handleClose}
                className="mt-4 w-full py-2 text-stone-500 dark:text-stone-400 text-sm hover:text-stone-700 dark:hover:text-stone-200 transition"
              >
                {emailSent ? "Close" : "Maybe later"}
              </button>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
}
