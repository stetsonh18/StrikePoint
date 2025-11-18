import { useQuery } from '@tanstack/react-query';
import { PerformanceMetricsService } from '@/infrastructure/services/performanceMetricsService';

export interface OptionsByTypeData {
  call: {
    pl: number;
    winRate: number;
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
  };
  put: {
    pl: number;
    winRate: number;
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
  };
}

/**
 * Hook to fetch options performance by type (Call vs Put)
 */
export function useOptionsByType(userId: string) {
  return useQuery<OptionsByTypeData, Error>({
    queryKey: ['options-by-type', userId],
    queryFn: () => PerformanceMetricsService.calculateOptionsByType(userId),
    enabled: !!userId,
    staleTime: 60 * 1000, // Cache for 1 minute
  });
}

