import { useQuery } from '@tanstack/react-query';
import { PerformanceMetricsService } from '@/infrastructure/services/performanceMetricsService';

export interface FuturesMarginEfficiencyData {
  symbol: string;
  pl: number;
  marginUsed: number;
  marginEfficiency: number;
  totalTrades: number;
}

/**
 * Hook to fetch futures margin efficiency data
 */
export function useFuturesMarginEfficiency(userId: string) {
  return useQuery<FuturesMarginEfficiencyData[], Error>({
    queryKey: ['futures-margin-efficiency', userId],
    queryFn: () => PerformanceMetricsService.calculateFuturesMarginEfficiency(userId),
    enabled: !!userId,
    staleTime: 60 * 1000, // Cache for 1 minute
  });
}

