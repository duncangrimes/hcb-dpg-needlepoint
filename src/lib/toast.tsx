import toast from 'react-hot-toast';

/**
 * Styled toast utilities matching the app's design system
 */
export const showToast = {
  success: (message: string, description?: string) => {
    toast.success(
      description ? (
        <div>
          <p className="font-medium">{message}</p>
          <p className="text-sm opacity-80">{description}</p>
        </div>
      ) : message
    );
  },

  error: (message: string, description?: string) => {
    toast.error(
      description ? (
        <div>
          <p className="font-medium">{message}</p>
          <p className="text-sm opacity-80">{description}</p>
        </div>
      ) : message,
      { duration: 5000 }
    );
  },

  loading: (message: string) => {
    return toast.loading(message);
  },

  dismiss: (toastId?: string) => {
    if (toastId) {
      toast.dismiss(toastId);
    } else {
      toast.dismiss();
    }
  },

  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((err: Error) => string);
    }
  ) => {
    return toast.promise(promise, messages);
  },
};

/**
 * Handle errors consistently across the app
 * Returns true if error was handled, false if it should be re-thrown
 */
export function handleError(error: unknown, context?: string): boolean {
  console.error(`Error${context ? ` in ${context}` : ''}:`, error);

  if (error instanceof Error) {
    // Network errors
    if (error.message.includes('fetch') || error.message.includes('network')) {
      showToast.error('Connection error', 'Please check your internet connection');
      return true;
    }

    // Auth errors
    if (error.message.includes('unauthorized') || error.message.includes('unauthenticated')) {
      showToast.error('Session expired', 'Please sign in again');
      // Could redirect to login here
      return true;
    }

    // Validation errors
    if (error.message.includes('validation') || error.message.includes('invalid')) {
      showToast.error('Invalid input', error.message);
      return true;
    }

    // Generic error
    showToast.error('Something went wrong', error.message);
    return true;
  }

  // Unknown error type
  showToast.error('An unexpected error occurred');
  return false;
}
