import { useQuery } from '@tanstack/react-query';
import { PerformanceMetricsService } from '@/infrastructure/services/performanceMetricsService';

export interface FuturesContractMonthPerformanceData {
  contractMonth: string;
  pl: number;
  winRate: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
}

/**
 * Hook to fetch futures contract month performance data
 */
export function useFuturesContractMonthPerformance(userId: string, dateRange?: { startDate: string; endDate: string }) {
  return useQuery<FuturesContractMonthPerformanceData[], Error>({
    queryKey: ['futures-contract-month-performance', userId, dateRange],
    queryFn: () => PerformanceMetricsService.calculateFuturesContractMonthPerformance(userId, dateRange),
    enabled: !!userId,
    staleTime: 60 * 1000, // Cache for 1 minute
  });
}

