import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';

/**
 * Hook to prefetch data for likely next routes based on current route
 */
export function useRoutePrefetch() {
  const queryClient = useQueryClient();
  const location = useLocation();

  useEffect(() => {
    // Prefetch data for related routes based on current location
    const prefetchStrategies: Record<string, () => void> = {
      '/': () => {
        // Prefetch dashboard-related data
        // This would be called when on dashboard
      },
      '/stocks': () => {
        // Prefetch options, crypto, futures (related asset types)
      },
      '/options': () => {
        // Prefetch stocks, crypto (related asset types)
      },
      '/crypto': () => {
        // Prefetch stocks, options (related asset types)
      },
      '/journal': () => {
        // Prefetch positions and transactions for journal linking
      },
    };

    const strategy = prefetchStrategies[location.pathname];
    if (strategy) {
      // Use requestIdleCallback if available, otherwise setTimeout
      if ('requestIdleCallback' in window) {
        requestIdleCallback(strategy, { timeout: 2000 });
      } else {
        setTimeout(strategy, 100);
      }
    }
  }, [location.pathname, queryClient]);
}

/**
 * Prefetch query data for a specific route
 */
export function prefetchRouteData(
  queryClient: ReturnType<typeof useQueryClient>,
  route: string,
  queries: Array<{ queryKey: unknown[]; queryFn: () => Promise<any> }>
) {
  queries.forEach(({ queryKey, queryFn }) => {
    queryClient.prefetchQuery({
      queryKey,
      queryFn,
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  });
}

