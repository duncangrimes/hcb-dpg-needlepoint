"use client";

import { useState, useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";

export type PostAuthAction = "download" | "save" | "share" | "generate";

interface UseAuthGateReturn {
  /** Whether the user is authenticated */
  isAuthenticated: boolean;
  /** Whether we're still checking auth status */
  isLoading: boolean;
  /** Whether the auth modal should be shown */
  showAuthModal: boolean;
  /** The pending action that triggered the auth modal */
  pendingAction: PostAuthAction | null;
  /** Open the auth modal with a specific action */
  requireAuth: (action: PostAuthAction) => boolean;
  /** Close the auth modal */
  closeAuthModal: () => void;
  /** Check and execute pending action after auth */
  executePendingAction: (callbacks: Partial<Record<PostAuthAction, () => void>>) => void;
}

/**
 * Hook for gating features behind authentication.
 * Shows modal instead of redirecting, preserves work.
 * 
 * @example
 * const { isAuthenticated, requireAuth, showAuthModal, closeAuthModal, pendingAction } = useAuthGate();
 * 
 * const handleDownload = () => {
 *   if (!requireAuth("download")) return; // Shows modal if not authed
 *   // User is authed, proceed with download
 *   downloadCanvas();
 * };
 */
export function useAuthGate(): UseAuthGateReturn {
  const { data: session, status } = useSession();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<PostAuthAction | null>(null);

  const isAuthenticated = !!session?.user;
  const isLoading = status === "loading";

  /**
   * Check if user is authenticated. If not, show auth modal.
   * Returns true if authenticated (action can proceed), false if modal shown.
   */
  const requireAuth = useCallback(
    (action: PostAuthAction): boolean => {
      if (isAuthenticated) {
        return true;
      }

      // Store action in state and sessionStorage (survives auth redirect)
      setPendingAction(action);
      sessionStorage.setItem("postAuthAction", action);
      setShowAuthModal(true);
      return false;
    },
    [isAuthenticated]
  );

  const closeAuthModal = useCallback(() => {
    setShowAuthModal(false);
    // Don't clear pending action - user might still want to auth
  }, []);

  /**
   * Execute the pending action if one exists.
   * Call this after authentication completes.
   */
  const executePendingAction = useCallback(
    (callbacks: Partial<Record<PostAuthAction, () => void>>) => {
      // Check sessionStorage first (survives page reload after auth)
      const storedAction = sessionStorage.getItem("postAuthAction") as PostAuthAction | null;
      const action = storedAction || pendingAction;

      if (action && callbacks[action]) {
        callbacks[action]!();
        // Clear the pending action
        sessionStorage.removeItem("postAuthAction");
        setPendingAction(null);
      }
    },
    [pendingAction]
  );

  // Auto-execute pending action when user becomes authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      const storedAction = sessionStorage.getItem("postAuthAction");
      if (storedAction) {
        setPendingAction(storedAction as PostAuthAction);
      }
    }
  }, [isAuthenticated, isLoading]);

  return {
    isAuthenticated,
    isLoading,
    showAuthModal,
    pendingAction,
    requireAuth,
    closeAuthModal,
    executePendingAction,
  };
}
