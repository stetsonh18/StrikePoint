import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { FuturesContractSpecRepository } from '@/infrastructure/repositories/futuresContractSpec.repository';
import type {
  FuturesContractSpec,
  FuturesContractSpecInsert,
  FuturesContractSpecUpdate,
} from '@/domain/types';

/**
 * Hook for fetching all futures contract specifications
 * @param userId - User ID to filter by. If not provided, fetches all specs (for backward compatibility)
 */
export function useFuturesContractSpecs(
  userId?: string,
  options?: Omit<UseQueryOptions<FuturesContractSpec[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<FuturesContractSpec[], Error>({
    queryKey: ['futures-contract-specs', userId] as const,
    queryFn: () => FuturesContractSpecRepository.getAll(userId),
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes (contract specs don't change often)
    ...options,
  });
}

/**
 * Hook for fetching active futures contract specifications
 * @param userId - User ID to filter by. If not provided, fetches all active specs (for backward compatibility)
 */
export function useActiveFuturesContractSpecs(
  userId?: string,
  options?: Omit<UseQueryOptions<FuturesContractSpec[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<FuturesContractSpec[], Error>({
    queryKey: ['futures-contract-specs', 'active', userId] as const,
    queryFn: () => FuturesContractSpecRepository.getActive(userId),
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
    ...options,
  });
}

/**
 * Hook for fetching a single futures contract specification by symbol
 * @param symbol - Contract symbol (e.g., 'ES', 'NQ')
 * @param userId - User ID to filter by. If not provided, fetches first match (for backward compatibility)
 */
export function useFuturesContractSpec(
  symbol: string,
  userId?: string,
  options?: Omit<UseQueryOptions<FuturesContractSpec | null, Error>, 'queryKey' | 'queryFn' | 'enabled'>
) {
  return useQuery<FuturesContractSpec | null, Error>({
    queryKey: ['futures-contract-spec', symbol, userId] as const,
    queryFn: () => FuturesContractSpecRepository.getBySymbol(symbol, userId),
    enabled: !!symbol,
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
    ...options,
  });
}

/**
 * Hook for creating a new futures contract specification
 */
export function useCreateFuturesContractSpec() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (spec: FuturesContractSpecInsert) =>
      FuturesContractSpecRepository.create(spec),
    onSuccess: (data) => {
      // Invalidate all contract specs queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ['futures-contract-specs'] });
      // Also invalidate user-specific queries if user_id is present
      if (data.user_id) {
        queryClient.invalidateQueries({ queryKey: ['futures-contract-specs', data.user_id] });
      }
    },
  });
}

/**
 * Hook for updating a futures contract specification
 */
export function useUpdateFuturesContractSpec() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: FuturesContractSpecUpdate }) =>
      FuturesContractSpecRepository.update(id, updates),
    onSuccess: () => {
      // Invalidate all contract specs queries
      queryClient.invalidateQueries({ queryKey: ['futures-contract-specs'] });
    },
  });
}

/**
 * Hook for deactivating a futures contract specification
 */
export function useDeactivateFuturesContractSpec() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => FuturesContractSpecRepository.deactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['futures-contract-specs'] });
    },
  });
}

/**
 * Hook for activating a futures contract specification
 */
export function useActivateFuturesContractSpec() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => FuturesContractSpecRepository.activate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['futures-contract-specs'] });
    },
  });
}

/**
 * Hook for deleting a futures contract specification (hard delete)
 */
export function useDeleteFuturesContractSpec() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => FuturesContractSpecRepository.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['futures-contract-specs'] });
    },
  });
}

/**
 * Hook for searching futures contract specifications
 * @param query - Search query string
 * @param userId - User ID to filter by. If not provided, searches all specs (for backward compatibility)
 */
export function useSearchFuturesContractSpecs(
  query: string,
  userId?: string,
  options?: Omit<UseQueryOptions<FuturesContractSpec[], Error>, 'queryKey' | 'queryFn' | 'enabled'>
) {
  return useQuery<FuturesContractSpec[], Error>({
    queryKey: ['futures-contract-specs', 'search', query, userId] as const,
    queryFn: () => FuturesContractSpecRepository.search(query, userId),
    enabled: !!query && query.length >= 1,
    staleTime: 5 * 60 * 1000, // Cache search results for 5 minutes
    ...options,
  });
}
