import { useState, useEffect } from 'react';
import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { searchSymbolsTradier, type SymbolSearchResult } from '@/infrastructure/services/marketDataService';

/**
 * Hook for searching symbols using Tradier API
 */
export function useTradierSymbolSearch(
  query: string,
  enabled: boolean = true,
  options?: Omit<UseQueryOptions<SymbolSearchResult[], Error>, 'queryKey' | 'queryFn' | 'enabled'>
) {
  const queryKey = ['tradier-symbol-search', query] as const;

  return useQuery<SymbolSearchResult[], Error>({
    queryKey,
    queryFn: () => searchSymbolsTradier(query),
    enabled: enabled && query.length >= 1,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    ...options,
  });
}

/**
 * Hook for debounced Tradier symbol search
 * Returns the debounced query value and the search results
 */
export function useDebouncedTradierSymbolSearch(
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
    queryKey: ['tradier-symbol-search', debouncedQuery] as const,
    queryFn: () => searchSymbolsTradier(debouncedQuery),
    enabled: enabled && debouncedQuery.length >= 1,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  return {
    debouncedQuery,
    ...searchQuery,
  };
}

