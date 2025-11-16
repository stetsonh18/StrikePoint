import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getOptionQuotes, getOptionQuote, type OptionQuote } from '@/infrastructure/services/optionsMarketDataService';

/**
 * Hook for fetching real-time option quotes for multiple symbols
 * Fetches quotes in parallel
 */
export function useOptionQuotes(
  optionSymbols: string[],
  enabled: boolean = true,
  options?: Omit<UseQueryOptions<Record<string, OptionQuote>, Error>, 'queryKey' | 'queryFn' | 'enabled'>
) {
  // Create stable query key by sorting symbols
  const sortedSymbols = [...optionSymbols].sort();
  const queryKey = ['option-quotes', sortedSymbols] as const;

  return useQuery<Record<string, OptionQuote>, Error>({
    queryKey,
    queryFn: async () => {
      try {
        return await getOptionQuotes(optionSymbols);
      } catch (error) {
        console.error('[useOptionQuotes] Error fetching quotes:', error);
        // Return empty object on error to prevent UI from breaking
        return {};
      }
    },
    enabled: enabled && optionSymbols.length > 0,
    staleTime: 30 * 1000, // Cache for 30 seconds (real-time data)
    refetchInterval: 60 * 1000, // Refetch every minute
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
  const queryKey = ['option-quote', optionSymbol] as const;

  return useQuery<OptionQuote | null, Error>({
    queryKey,
    queryFn: async () => {
      try {
        return await getOptionQuote(optionSymbol);
      } catch (error) {
        console.error('[useOptionQuote] Error fetching quote:', error);
        return null;
      }
    },
    enabled: enabled && !!optionSymbol,
    staleTime: 30 * 1000, // Cache for 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
    retry: 1,
    ...options,
  });
}

export type { OptionQuote };

