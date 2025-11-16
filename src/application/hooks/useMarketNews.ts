import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getMarketNews } from '@/infrastructure/services/marketDataService';
import type { NewsArticle } from '@/domain/types';

export interface UseMarketNewsResult {
  articles: NewsArticle[];
  isLoading: boolean;
  error: Error | null;
  hasMore: boolean;
  minId?: number; // Last article ID for pagination
}

/**
 * Hook for fetching market news from Finnhub with pagination support
 */
export function useMarketNews(
  category: string = 'general',
  minId?: number,
  enabled: boolean = true,
  options?: Omit<UseQueryOptions<NewsArticle[], Error>, 'queryKey' | 'queryFn' | 'enabled'>
): UseMarketNewsResult {
  const queryKey = ['market-news', category, minId] as const;

  const { data: articles = [], isLoading, error } = useQuery<NewsArticle[], Error>({
    queryKey,
    queryFn: () => getMarketNews(category, minId),
    enabled: enabled,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes
    ...options,
  });

  // Determine if there are more articles (if we got articles, assume there might be more)
  // Finnhub doesn't provide a hasMore flag, so we use a heuristic
  const hasMore = articles.length > 0;
  const lastMinId = articles.length > 0 
    ? Number(articles[articles.length - 1]?.id) || undefined
    : undefined;

  return {
    articles,
    isLoading,
    error: error || null,
    hasMore,
    minId: lastMinId,
  };
}

