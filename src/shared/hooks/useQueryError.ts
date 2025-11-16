import { useQuery, useMutation, type UseQueryResult, type UseMutationResult } from '@tanstack/react-query';
import { getUserFriendlyErrorMessage, isRetryableError, parseError } from '@/shared/utils/errorHandler';
import { useToast } from './useToast';

/**
 * Hook to handle query errors and display user-friendly messages
 */
export function useQueryError<TData, TError = Error>(
  query: UseQueryResult<TData, TError>,
  options?: {
    showToast?: boolean;
    toastMessage?: string;
    onError?: (error: TError) => void;
  }
) {
  const toast = useToast();
  const { showToast = true, toastMessage, onError } = options || {};

  // Handle error display
  if (query.isError && query.error) {
    const error = query.error as unknown;
    const userMessage = toastMessage || getUserFriendlyErrorMessage(error);
    const retryable = isRetryableError(error);

    // Show toast notification
    if (showToast) {
      toast.error(userMessage, {
        description: retryable ? 'You can try again by clicking retry.' : undefined,
      });
    }

    // Call custom error handler
    onError?.(query.error);
  }

  return {
    error: query.error,
    isError: query.isError,
    errorMessage: query.isError && query.error ? getUserFriendlyErrorMessage(query.error as unknown) : undefined,
    isRetryable: query.isError && query.error ? isRetryableError(query.error as unknown) : false,
    retry: query.refetch,
  };
}

/**
 * Hook to handle mutation errors and display user-friendly messages
 */
export function useMutationError<TData, TError = Error, TVariables = unknown>(
  mutation: UseMutationResult<TData, TError, TVariables>,
  options?: {
    showToast?: boolean;
    toastMessage?: string;
    onError?: (error: TError) => void;
  }
) {
  const toast = useToast();
  const { showToast = true, toastMessage, onError } = options || {};

  // Handle error display
  if (mutation.isError && mutation.error) {
    const error = mutation.error as unknown;
    const userMessage = toastMessage || getUserFriendlyErrorMessage(error);
    const retryable = isRetryableError(error);

    // Show toast notification
    if (showToast) {
      toast.error(userMessage, {
        description: retryable ? 'You can try again.' : undefined,
      });
    }

    // Call custom error handler
    onError?.(mutation.error);
  }

  return {
    error: mutation.error,
    isError: mutation.isError,
    errorMessage: mutation.isError && mutation.error ? getUserFriendlyErrorMessage(mutation.error as unknown) : undefined,
    isRetryable: mutation.isError && mutation.error ? isRetryableError(mutation.error as unknown) : false,
    retry: mutation.mutate,
  };
}

