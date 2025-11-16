import { useState, useEffect } from 'react';
import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { searchSymbols, type SymbolSearchResult } from '@/infrastructure/services/marketDataService';

/**
 * Hook for searching stock symbols using Finnhub
 */
export function useStockSymbolSearch(
  query: string,
  enabled: boolean = true,
  options?: Omit<UseQueryOptions<SymbolSearchResult[], Error>, 'queryKey' | 'queryFn' | 'enabled'>
) {
  const queryKey = ['stock-symbol-search', query] as const;

  return useQuery<SymbolSearchResult[], Error>({
    queryKey,
    queryFn: () => searchSymbols(query),
    enabled: enabled && query.length >= 1,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    ...options,
  });
}

/**
 * Hook for debounced symbol search
 * Returns the debounced query value and the search results
 */
export function useDebouncedSymbolSearch(
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

  const searchQuery = useQuery<SymbolSearchResult[], Error>({
    queryKey: ['stock-symbol-search', debouncedQuery] as const,
    queryFn: () => searchSymbols(debouncedQuery),
    enabled: enabled && debouncedQuery.length >= 1,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  return {
    debouncedQuery,
    ...searchQuery,
  };
}

