import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getCryptoQuotes, getCryptoQuote, type CryptoQuote } from '@/infrastructure/services/cryptoMarketDataService';

/**
 * Hook for fetching real-time cryptocurrency quotes
 * Fetches quotes for multiple coin IDs in parallel
 * Note: CoinGecko uses coin IDs (e.g., 'bitcoin') not symbols (e.g., 'BTC')
 */
export function useCryptoQuotes(
  coinIds: string[],
  enabled: boolean = true,
  options?: Omit<UseQueryOptions<Record<string, CryptoQuote>, Error>, 'queryKey' | 'queryFn' | 'enabled'>
) {
  // Create stable query key by sorting coin IDs
  const sortedCoinIds = [...coinIds].sort();
  const queryKey = ['crypto-quotes', sortedCoinIds] as const;

  return useQuery<Record<string, CryptoQuote>, Error>({
    queryKey,
    queryFn: () => getCryptoQuotes(coinIds),
    enabled: enabled && coinIds.length > 0,
    staleTime: 60 * 1000, // Cache for 60 seconds (crypto prices update frequently)
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    ...options,
  });
}

/**
 * Hook for fetching a single cryptocurrency quote
 */
export function useCryptoQuote(
  coinId: string,
  enabled: boolean = true,
  options?: Omit<UseQueryOptions<CryptoQuote | null, Error>, 'queryKey' | 'queryFn' | 'enabled'>
) {
  const queryKey = ['crypto-quote', coinId] as const;

  return useQuery<CryptoQuote | null, Error>({
    queryKey,
    queryFn: () => getCryptoQuote(coinId),
    enabled: enabled && !!coinId,
    staleTime: 60 * 1000, // Cache for 60 seconds
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    ...options,
  });
}

export type { CryptoQuote };
