import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { PortfolioSnapshotRepository } from '@/infrastructure/repositories/portfolioSnapshot.repository';
import { queryKeys } from '@/infrastructure/api/queryKeys';

export type TimePeriod = '1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL';

interface PortfolioHistoryData {
  date: string;
  portfolioValue: number;
  netCashFlow: number;
  realizedPL: number;
  unrealizedPL: number;
  dailyPLChange: number | null;
  dailyPLPercent: number | null;
}

/**
 * Hook to fetch portfolio history for charting
 * Supports time period filters: 1D, 1W, 1M, 3M, 1Y, ALL
 */
export function usePortfolioHistory(
  userId: string,
  timePeriod: TimePeriod = '1M',
  options?: Omit<UseQueryOptions<PortfolioHistoryData[], Error>, 'queryKey' | 'queryFn' | 'enabled'>
) {
  const queryKey = queryKeys.portfolio.history(userId, timePeriod);

  return useQuery<PortfolioHistoryData[], Error>({
    queryKey,
    queryFn: async () => {
      // For ALL, get all snapshots without date filtering
      if (timePeriod === 'ALL') {
        const allSnapshots = await PortfolioSnapshotRepository.getAll(userId);
        return allSnapshots.map((s) => ({
          date: s.snapshot_date,
          portfolioValue: s.portfolio_value,
          netCashFlow: s.net_cash_flow,
          realizedPL: s.total_realized_pl,
          unrealizedPL: s.total_unrealized_pl,
          dailyPLChange: s.daily_pl_change,
          dailyPLPercent: s.daily_pl_percent,
        }));
      }

      // For date range filters, get the latest snapshot date to use as endDate
      // This ensures we include all snapshots up to the latest one, not just today
      const allSnapshots = await PortfolioSnapshotRepository.getAll(userId);
      if (allSnapshots.length === 0) {
        return [];
      }

      // Find the latest snapshot date
      const latestSnapshotDate = allSnapshots.reduce((latest, snapshot) => {
        return snapshot.snapshot_date > latest ? snapshot.snapshot_date : latest;
      }, allSnapshots[0].snapshot_date);

      const endDate = latestSnapshotDate;
      
      // Calculate start date based on time period
      const start = new Date(latestSnapshotDate);
      let startDate: string;
      
      switch (timePeriod) {
        case '1D':
          start.setDate(start.getDate() - 1);
          break;
        case '1W':
          start.setDate(start.getDate() - 7);
          break;
        case '1M':
          start.setMonth(start.getMonth() - 1);
          break;
        case '3M':
          start.setMonth(start.getMonth() - 3);
          break;
        case '1Y':
          start.setFullYear(start.getFullYear() - 1);
          break;
      }

      startDate = start.toISOString().split('T')[0];

      // Filter snapshots by date range
      const filteredSnapshots = allSnapshots.filter((s) => {
        return s.snapshot_date >= startDate && s.snapshot_date <= endDate;
      });

      return filteredSnapshots.map((s) => ({
        date: s.snapshot_date,
        portfolioValue: s.portfolio_value,
        netCashFlow: s.net_cash_flow,
        realizedPL: s.total_realized_pl,
        unrealizedPL: s.total_unrealized_pl,
        dailyPLChange: s.daily_pl_change,
        dailyPLPercent: s.daily_pl_percent,
      }));
    },
    enabled: !!userId,
    staleTime: 60 * 1000, // Cache for 1 minute
    ...options,
  });
}

