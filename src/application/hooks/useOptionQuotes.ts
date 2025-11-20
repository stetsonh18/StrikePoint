import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getOptionQuotes, getOptionQuote } from '@/infrastructure/services/optionsMarketDataService';
import type { OptionQuote } from '@/domain/types';
import { logger } from '@/shared/utils/logger';
import { queryKeys } from '@/infrastructure/api/queryKeys';

/**
 * Hook for fetching real-time option quotes for multiple symbols
 * Fetches quotes in parallel
 */
export function useOptionQuotes(
  optionSymbols: string[],
  enabled: boolean = true,
  options?: Omit<UseQueryOptions<Record<string, OptionQuote>, Error>, 'queryKey' | 'queryFn' | 'enabled'>
) {
  const queryKey = queryKeys.marketData.optionQuotes.list(optionSymbols);

  return useQuery<Record<string, OptionQuote>, Error>({
    queryKey,
    queryFn: async () => {
      try {
        return await getOptionQuotes(optionSymbols);
      } catch (error) {
        logger.error('[useOptionQuotes] Error fetching quotes', error);
        // Re-throw to let React Query handle the error properly
        throw error;
      }
    },
    enabled: enabled && optionSymbols.length > 0,
    staleTime: 30 * 1000, // Cache for 30 seconds (real-time data)
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    retry: 1, // Only retry once on failure
    ...options,
  });
}

/**
 * Hook for fetching a single option quote
 */
export function useOptionQuote(
  optionSymbol: string,
  enabled: boolean = true,
  options?: Omit<UseQueryOptions<OptionQuote | null, Error>, 'queryKey' | 'queryFn' | 'enabled'>
) {
  const queryKey = queryKeys.marketData.optionQuotes.detail(optionSymbol);

  return useQuery<OptionQuote | null, Error>({
    queryKey,
    queryFn: async () => {
      try {
        return await getOptionQuote(optionSymbol);
      } catch (error) {
        logger.error('[useOptionQuote] Error fetching quote', error);
        // Re-throw to let React Query handle the error properly
        throw error;
      }
    },
    enabled: enabled && !!optionSymbol,
    staleTime: 30 * 1000, // Cache for 30 seconds
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    retry: 1,
    ...options,
  });
}

export type { OptionQuote };

