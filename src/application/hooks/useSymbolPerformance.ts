import { useQuery } from '@tanstack/react-query';
import { PerformanceMetricsService, type SymbolPerformance } from '@/infrastructure/services/performanceMetricsService';
import type { AssetType } from '@/domain/types/asset.types';

/**
 * Hook to fetch performance metrics by symbol for a specific asset type
 * If assetType is undefined, aggregates across all asset types
 */
export function useSymbolPerformance(
  userId: string,
  assetType?: AssetType,
  days?: number, // Optional: filter by last N days
  dateRange?: { startDate: string; endDate: string }
) {
  return useQuery<SymbolPerformance[], Error>({
    queryKey: ['symbol-performance', userId, assetType, days, dateRange],
    queryFn: () => PerformanceMetricsService.calculatePerformanceBySymbol(userId, assetType, days, dateRange),
    enabled: !!userId,
    staleTime: 60 * 1000, // Cache for 1 minute
  });
}

