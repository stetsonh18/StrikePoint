import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { CashBalanceRepository } from '@/infrastructure/repositories';
import type { CashBalance } from '@/domain/types';

/**
 * Hook for fetching current cash balance
 */
export function useCashBalance(
  userId: string,
  options?: Omit<UseQueryOptions<CashBalance | null, Error>, 'queryKey' | 'queryFn' | 'enabled'>
) {
  const queryKey = ['cash-balance', userId] as const;

  return useQuery<CashBalance | null, Error>({
    queryKey,
    queryFn: () => CashBalanceRepository.getCurrentBalance(userId),
    enabled: !!userId,
    staleTime: 30 * 1000, // Cache for 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
    ...options,
  });
}

