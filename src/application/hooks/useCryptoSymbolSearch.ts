import { useState, useEffect } from 'react';
import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { searchCrypto, type CryptoSearchResult } from '@/infrastructure/services/cryptoMarketDataService';

/**
 * Hook for searching cryptocurrency symbols using CoinGecko
 */
export function useCryptoSymbolSearch(
  query: string,
  enabled: boolean = true,
  options?: Omit<UseQueryOptions<CryptoSearchResult[], Error>, 'queryKey' | 'queryFn' | 'enabled'>
) {
  const queryKey = ['crypto-symbol-search', query] as const;

  return useQuery<CryptoSearchResult[], Error>({
    queryKey,
    queryFn: () => searchCrypto(query),
    enabled: enabled && query.length >= 1,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    ...options,
  });
}

/**
 * Hook for debounced crypto symbol search
 * Returns the debounced query value and the search results
 */
export function useDebouncedCryptoSymbolSearch(
  query: string,
  delay: number = 300,
  enabled: boolean = true
) {
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, delay);

    return () => clearTimeout(timer);
  }, [query, delay]);

  const searchQuery = useQuery<CryptoSearchResult[], Error>({
    queryKey: ['crypto-symbol-search', debouncedQuery] as const,
    queryFn: () => searchCrypto(debouncedQuery),
    enabled: enabled && debouncedQuery.length >= 1,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  return {
    debouncedQuery,
    ...searchQuery,
  };
}
