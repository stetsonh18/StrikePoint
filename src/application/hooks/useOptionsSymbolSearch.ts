import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { searchOptionsSymbolsWithDetails, type OptionsSymbolSearchResult } from '@/infrastructure/services/optionsSymbolSearchService';

/**
 * Hook for searching options symbols using MarketData validation
 * @param query - Search query string
 * @param enabled - Whether the query should run
 */
export function useOptionsSymbolSearch(
  query: string,
  enabled: boolean = true,
  options?: Omit<UseQueryOptions<OptionsSymbolSearchResult[], Error>, 'queryKey' | 'queryFn' | 'enabled'>
) {
  return useQuery<OptionsSymbolSearchResult[], Error>({
    queryKey: ['options-symbol-search', query] as const,
    queryFn: async () => {
      try {
        return await searchOptionsSymbolsWithDetails(query);
      } catch (error) {
        console.error('[useOptionsSymbolSearch] Error searching symbols:', error);
        return [];
      }
    },
    enabled: enabled && query.length >= 1,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes (symbols don't change often)
    retry: 1,
    ...options,
  });
}

/**
 * Hook for validating a single options symbol
 */
export function useValidateOptionsSymbol(
  symbol: string,
  enabled: boolean = true
) {
  return useQuery<boolean, Error>({
    queryKey: ['validate-options-symbol', symbol] as const,
    queryFn: async () => {
      try {
        const { validateOptionsSymbol } = await import('@/infrastructure/services/optionsSymbolSearchService');
        return await validateOptionsSymbol(symbol);
      } catch (error) {
        console.error('[useValidateOptionsSymbol] Error validating symbol:', error);
        return false;
      }
    },
    enabled: enabled && !!symbol && symbol.length >= 1,
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
    retry: 1,
  });
}

export type { OptionsSymbolSearchResult };

