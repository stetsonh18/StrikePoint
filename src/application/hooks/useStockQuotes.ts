import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getStockQuotes, getStockQuote, type StockQuote } from '@/infrastructure/services/marketDataService';

/**
 * Hook for fetching real-time stock quotes
 * Fetches quotes for multiple symbols in parallel
 */
export function useStockQuotes(
  symbols: string[],
  enabled: boolean = true,
  options?: Omit<UseQueryOptions<Record<string, StockQuote>, Error>, 'queryKey' | 'queryFn' | 'enabled'>
) {
  // Create stable query key by sorting symbols
  const sortedSymbols = [...symbols].sort();
  const queryKey = ['stock-quotes', sortedSymbols] as const;

  return useQuery<Record<string, StockQuote>, Error>({
    queryKey,
    queryFn: async () => {
      try {
        return await getStockQuotes(symbols);
      } catch (error) {
        console.error('[useStockQuotes] Error fetching quotes:', error);
        // Return empty object on error to prevent UI from breaking
        return {};
      }
    },
    enabled: enabled && symbols.length > 0,
    staleTime: 30 * 1000, // Cache for 30 seconds (real-time data)
    refetchInterval: 60 * 1000, // Refetch every minute
    retry: 1, // Only retry once on failure
    ...options,
  });
}

/**
 * Hook for fetching a single stock quote
 */
export function useStockQuote(
  symbol: string,
  enabled: boolean = true,
  options?: Omit<UseQueryOptions<StockQuote, Error>, 'queryKey' | 'queryFn' | 'enabled'>
) {
  const queryKey = ['stock-quote', symbol] as const;

  return useQuery<StockQuote, Error>({
    queryKey,
    queryFn: () => getStockQuote(symbol),
    enabled: enabled && !!symbol,
    staleTime: 30 * 1000, // Cache for 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
    ...options,
  });
}

export type { StockQuote };

