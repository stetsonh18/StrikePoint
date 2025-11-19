import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getStockQuotes, getStockQuote, type StockQuote } from '@/infrastructure/services/marketDataService';
import { logger } from '@/shared/utils/logger';
import { queryKeys } from '@/infrastructure/api/queryKeys';

/**
 * Hook for fetching real-time stock quotes
 * Fetches quotes for multiple symbols in parallel
 */
export function useStockQuotes(
  symbols: string[],
  enabled: boolean = true,
  options?: Omit<UseQueryOptions<Record<string, StockQuote>, Error>, 'queryKey' | 'queryFn' | 'enabled'>
) {
  const queryKey = queryKeys.marketData.stockQuotes.list(symbols);

  return useQuery<Record<string, StockQuote>, Error>({
    queryKey,
    queryFn: async () => {
      try {
        return await getStockQuotes(symbols);
      } catch (error) {
        logger.error('[useStockQuotes] Error fetching quotes', error);
        // Re-throw to let React Query handle the error properly
        throw error;
      }
    },
    enabled: enabled && symbols.length > 0,
    staleTime: 30 * 1000, // Cache for 30 seconds (real-time data)
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
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
  const queryKey = queryKeys.marketData.stockQuotes.detail(symbol);

  return useQuery<StockQuote, Error>({
    queryKey,
    queryFn: () => getStockQuote(symbol),
    enabled: enabled && !!symbol,
    staleTime: 30 * 1000, // Cache for 30 seconds
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    ...options,
  });
}

export type { StockQuote };

