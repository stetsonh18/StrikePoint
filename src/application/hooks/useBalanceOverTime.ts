import { useQuery } from '@tanstack/react-query';
import { PerformanceMetricsService } from '@/infrastructure/services/performanceMetricsService';
import type { AssetType } from '@/domain/types/asset.types';

export interface BalanceOverTimeData {
  date: string;
  balance: number;
  netCashFlow: number;
}

/**
 * Hook to fetch balance over time data
 */
export function useBalanceOverTime(
  userId: string,
  assetType?: AssetType,
  days?: number
) {
  return useQuery<BalanceOverTimeData[], Error>({
    queryKey: ['balance-over-time', userId, assetType, days],
    queryFn: () => PerformanceMetricsService.calculateBalanceOverTime(userId, assetType, days),
    enabled: !!userId,
    staleTime: 60 * 1000, // Cache for 1 minute
  });
}

