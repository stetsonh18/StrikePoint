import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getOptionsChain, type OptionsChain } from '@/infrastructure/services/optionsMarketDataService';

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
  const queryKey = ['options-chain', underlyingSymbol, expiration, strike, side] as const;

  return useQuery<OptionsChain | null, Error>({
    queryKey,
    queryFn: async () => {
      try {
        return await getOptionsChain(underlyingSymbol, expiration, strike, side);
      } catch (error) {
        console.error('[useOptionsChain] Error fetching options chain:', error);
        return null;
      }
    },
    enabled: enabled && !!underlyingSymbol,
    staleTime: 60 * 1000, // Cache for 1 minute (options data changes frequently)
    refetchInterval: 2 * 60 * 1000, // Refetch every 2 minutes
    retry: 1,
    ...options,
  });
}

export type { OptionsChain };

