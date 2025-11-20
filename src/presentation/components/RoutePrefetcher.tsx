import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/application/stores/auth.store';
import { queryKeys } from '@/infrastructure/api/queryKeys';
import { PositionRepository, TransactionRepository } from '@/infrastructure/repositories';

/**
 * Component that prefetches data for likely next routes
 * Should be placed inside the Router but outside Routes
 */
export function RoutePrefetcher() {
  const location = useLocation();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;

    // Prefetch data for related routes based on current location
    const prefetchData = () => {
      // Use requestIdleCallback if available, otherwise setTimeout
      const schedule = (fn: () => void) => {
        if ('requestIdleCallback' in window) {
          requestIdleCallback(fn, { timeout: 2000 });
        } else {
          setTimeout(fn, 100);
        }
      };

      switch (location.pathname) {
        case '/':
          // Prefetch analytics and positions data
          schedule(() => {
            queryClient.ensureQueryData({
              queryKey: queryKeys.positions.statistics(userId),
              queryFn: () => PositionRepository.getStatistics(userId),
              staleTime: 5 * 60 * 1000,
            });
          });
          break;
        case '/stocks':
        case '/options':
        case '/crypto':
        case '/futures':
          // Prefetch other asset types when on one asset type page
          schedule(() => {
            const assetTypes: Array<'stock' | 'option' | 'crypto' | 'futures'> = ['stock', 'option', 'crypto', 'futures'];
            assetTypes.forEach((assetType) => {
              queryClient.ensureQueryData({
                queryKey: queryKeys.positions.list(userId, { asset_type: assetType }),
                queryFn: () => PositionRepository.getAll(userId, { asset_type: assetType }),
                staleTime: 5 * 60 * 1000,
              });
            });
          });
          break;
        case '/journal':
          // Prefetch positions and transactions for journal linking
          schedule(() => {
            queryClient.ensureQueryData({
              queryKey: queryKeys.positions.list(userId),
              queryFn: () => PositionRepository.getAll(userId),
              staleTime: 5 * 60 * 1000,
            });
            queryClient.ensureQueryData({
              queryKey: queryKeys.transactions.list(userId),
              queryFn: () => TransactionRepository.getAll(userId),
              staleTime: 5 * 60 * 1000,
            });
          });
          break;
      }
    };

    prefetchData();
  }, [location.pathname, queryClient, userId]);

  return null;
}

