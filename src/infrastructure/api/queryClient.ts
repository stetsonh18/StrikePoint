import { QueryClient } from '@tanstack/react-query';
import { isRetryableError, logError } from '@/shared/utils/errorHandler';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30 seconds - shorter for more responsive updates
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
      refetchOnWindowFocus: true, // Refetch when user returns to tab
      refetchOnReconnect: true,
      refetchInterval: 60 * 1000, // Auto-refetch every minute as fallback
      // Query deduplication is enabled by default in React Query
      // Multiple components requesting the same query will share the same request
      structuralSharing: true, // Ensure queries with the same key are deduplicated
      retry: (failureCount, error) => {
        // Use error handler to determine if error is retryable
        if (isRetryableError(error)) {
          // Retry up to 2 times for retryable errors
          return failureCount < 2;
        }
        // Don't retry on non-retryable errors (4xx client errors, validation errors, etc.)
        return false;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
      onError: (error) => {
        // Log query errors
        logError(error, { type: 'query' });
      },
    },
    mutations: {
      retry: (failureCount, error) => {
        // Only retry mutations on retryable errors
        if (isRetryableError(error)) {
          return failureCount < 1; // Retry once
        }
        return false;
      },
      retryDelay: 1000,
      onError: (error) => {
        // Log mutation errors
        logError(error, { type: 'mutation' });
      },
    },
  },
});
