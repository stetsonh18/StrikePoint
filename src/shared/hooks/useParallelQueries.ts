import { useQueries } from '@tanstack/react-query';
import type { UseQueryOptions } from '@tanstack/react-query';

/**
 * Hook to execute multiple queries in parallel using React Query's useQueries
 * This is more efficient than multiple useQuery calls as it batches requests
 * 
 * @example
 * ```tsx
 * const queries = useParallelQueries([
 *   {
 *     queryKey: ['positions', userId],
 *     queryFn: () => fetchPositions(userId),
 *   },
 *   {
 *     queryKey: ['transactions', userId],
 *     queryFn: () => fetchTransactions(userId),
 *   },
 * ]);
 * 
 * const [positionsQuery, transactionsQuery] = queries;
 * ```
 */
export function useParallelQueries<T extends readonly UseQueryOptions<unknown, Error, unknown, readonly unknown[]>[]>(
  queries: T
) {
  return useQueries({
    queries: queries.map((query) => ({
      ...query,
      staleTime: query.staleTime ?? 30 * 1000, // Default 30 seconds
      gcTime: query.gcTime ?? 1000 * 60 * 10, // Default 10 minutes
    })),
  });
}

