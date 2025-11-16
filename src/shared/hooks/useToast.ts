import { toast } from 'sonner';

interface ToastOptions {
  description?: string;
  duration?: number;
}

/**
 * Custom hook for toast notifications
 * Provides consistent toast notification API
 */
export const useToast = () => {
  return {
    success: (message: string, options?: ToastOptions) => {
      toast.success(message, {
        description: options?.description,
        duration: options?.duration ?? 4000,
      });
    },
    error: (message: string, options?: ToastOptions) => {
      toast.error(message, {
        description: options?.description,
        duration: options?.duration ?? 5000,
      });
    },
    info: (message: string, options?: ToastOptions) => {
      toast.info(message, {
        description: options?.description,
        duration: options?.duration ?? 4000,
      });
    },
    warning: (message: string, options?: ToastOptions) => {
      toast.warning(message, {
        description: options?.description,
        duration: options?.duration ?? 4000,
      });
    },
  };
};

/**
 * Direct toast functions for use outside of components
 */
export const toastSuccess = (message: string, options?: ToastOptions) => {
  toast.success(message, {
    description: options?.description,
    duration: options?.duration ?? 4000,
  });
};

export const toastError = (message: string, options?: ToastOptions) => {
  toast.error(message, {
    description: options?.description,
    duration: options?.duration ?? 5000,
  });
};

export const toastInfo = (message: string, options?: ToastOptions) => {
  toast.info(message, {
    description: options?.description,
    duration: options?.duration ?? 4000,
  });
};

export const toastWarning = (message: string, options?: ToastOptions) => {
  toast.warning(message, {
    description: options?.description,
    duration: options?.duration ?? 4000,
  });
};

