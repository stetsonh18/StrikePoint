import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { usePortfolioValue } from './usePortfolioValue';
import { PositionRepository } from '@/infrastructure/repositories/position.repository';
import { TransactionRepository } from '@/infrastructure/repositories/transaction.repository';
import { queryKeys } from '@/infrastructure/api/queryKeys';
import { getDateRangeForDays } from './utils/dateRange';

export interface WeeklyPerformance {
  weeklyPL: number;
  weeklyPLPercent: number;
  realizedPL: number;
  unrealizedPL: number;
}

const DAYS_IN_WEEK = 7;

/**
 * Hook to calculate performance for the last 7 days (realized + unrealized, includes fees)
 */
export function useWeeklyPerformance(
  userId: string,
  options?: Omit<UseQueryOptions<WeeklyPerformance, Error>, 'queryKey' | 'queryFn' | 'enabled'>
) {
  const { portfolioValue, unrealizedPL } = usePortfolioValue(userId);
  const queryKey = queryKeys.analytics.weeklyPerformance(userId, portfolioValue, unrealizedPL);

  return useQuery<WeeklyPerformance, Error>({
    queryKey,
    queryFn: async () => {
      const { start, end } = getDateRangeForDays(DAYS_IN_WEEK);

      // Get realized P&L from positions closed in last 7 days
      const realizedPositions = await PositionRepository.getRealizedPLByDateRange(userId, start, end);
      const realizedPL = realizedPositions.reduce((sum, position) => sum + Number(position.realized_pl || 0), 0);

      // Get fees from all transactions in last 7 days
      const transactions = await TransactionRepository.getAll(userId, { start_date: start, end_date: end });
      const totalFees = transactions.reduce((sum, tx) => sum + Number(tx.fees || 0), 0);

      // Weekly P&L = realized + unrealized - fees
      const weeklyPL = realizedPL + unrealizedPL - totalFees;
      const weeklyPLPercent = portfolioValue !== 0 ? (weeklyPL / Math.abs(portfolioValue)) * 100 : 0;

      return {
        weeklyPL,
        weeklyPLPercent,
        realizedPL,
        unrealizedPL,
      };
    },
    enabled: !!userId,
    staleTime: 60 * 1000, // Cache for 1 minute
    ...options,
  });
}

