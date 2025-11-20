import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getOptionsChain } from '@/infrastructure/services/optionsMarketDataService';
import type { OptionsChain } from '@/domain/types';
import { logger } from '@/shared/utils/logger';
import { queryKeys } from '@/infrastructure/api/queryKeys';

/**
 * Hook for fetching options chain data
 * @param underlyingSymbol - The underlying stock symbol
 * @param expiration - Optional expiration date filter
 * @param strike - Optional strike price filter
 * @param side - Optional filter by 'call' or 'put'
 * @param enabled - Whether the query should run
 */
export function useOptionsChain(
  underlyingSymbol: string,
  expiration?: string,
  strike?: number,
  side?: 'call' | 'put',
  enabled: boolean = true,
  options?: Omit<UseQueryOptions<OptionsChain | null, Error>, 'queryKey' | 'queryFn' | 'enabled'>
) {
  const queryKey = queryKeys.marketData.optionsChain(underlyingSymbol, expiration, strike, side);

  return useQuery<OptionsChain | null, Error>({
    queryKey,
    queryFn: async () => {
      try {
        return await getOptionsChain(underlyingSymbol, expiration, strike, side);
      } catch (error) {
        logger.error('[useOptionsChain] Error fetching options chain', error);
        // Re-throw to let React Query handle the error properly
        throw error;
      }
    },
    enabled: enabled && !!underlyingSymbol,
    staleTime: 60 * 1000, // Cache for 1 minute (options data changes frequently)
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    retry: 1,
    ...options,
  });
}

export type { OptionsChain };

