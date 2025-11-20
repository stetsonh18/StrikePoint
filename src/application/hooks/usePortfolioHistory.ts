import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { PortfolioSnapshotRepository } from '@/infrastructure/repositories/portfolioSnapshot.repository';
import { CashTransactionRepository } from '@/infrastructure/repositories/cashTransaction.repository';
import { queryKeys } from '@/infrastructure/api/queryKeys';

export type TimePeriod = '1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL';

interface PortfolioHistoryData {
  date: string;
  portfolioValue: number;
  netCashFlow: number;
  totalMarketValue: number;
  realizedPL: number;
  unrealizedPL: number;
  dailyPLChange: number | null;
  dailyPLPercent: number | null;
  totalDeposits: number;
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
      const [allSnapshots, cashTransactions] = await Promise.all([
        PortfolioSnapshotRepository.getAll(userId),
        CashTransactionRepository.getByUserId(userId),
      ]);

      if (allSnapshots.length === 0) {
        return [];
      }

      const contributionEvents = buildContributionEvents(cashTransactions);

      const mapSnapshots = (snapshots: typeof allSnapshots) => {
        const sortedSnapshots = [...snapshots].sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date));
        let runningContribution = 0;
        let eventIndex = 0;

        return sortedSnapshots.map((s) => {
          while (
            eventIndex < contributionEvents.length &&
            contributionEvents[eventIndex].date <= s.snapshot_date
          ) {
            runningContribution += contributionEvents[eventIndex].amount;
            eventIndex++;
          }

          const netCashFlow = s.net_cash_flow ?? 0;
          const totalMarketValue =
            s.total_market_value ??
            (typeof s.portfolio_value === 'number' && typeof netCashFlow === 'number'
              ? s.portfolio_value - netCashFlow
              : 0);
          const computedPortfolioValue =
            typeof totalMarketValue === 'number'
              ? netCashFlow + totalMarketValue
              : s.portfolio_value ?? netCashFlow;

          return {
            date: s.snapshot_date,
            portfolioValue: computedPortfolioValue,
            netCashFlow,
            totalMarketValue,
            realizedPL: s.total_realized_pl,
            unrealizedPL: s.total_unrealized_pl,
            dailyPLChange: s.daily_pl_change,
            dailyPLPercent: s.daily_pl_percent,
            totalDeposits: runningContribution,
          };
        });
      };

      // For ALL, get all snapshots without date filtering
      if (timePeriod === 'ALL') {
        return mapSnapshots(allSnapshots);
      }

      // Find the latest snapshot date
      const latestSnapshotDate = allSnapshots.reduce((latest, snapshot) => {
        return snapshot.snapshot_date > latest ? snapshot.snapshot_date : latest;
      }, allSnapshots[0].snapshot_date);

      const endDate = latestSnapshotDate;
      
      // Calculate start date based on time period
      const start = new Date(latestSnapshotDate);
      
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

      const startDate = start.toISOString().split('T')[0];

      // Filter snapshots by date range
      const filteredSnapshots = allSnapshots.filter((s) => {
        return s.snapshot_date >= startDate && s.snapshot_date <= endDate;
      });

      return mapSnapshots(filteredSnapshots);
    },
    enabled: !!userId,
    staleTime: 60 * 1000, // Cache for 1 minute
    ...options,
  });
}

function buildContributionEvents(transactions: Awaited<ReturnType<typeof CashTransactionRepository.getByUserId>>) {
  const depositCodes = ['DEPOSIT', 'DEP', 'ACH', 'ACH_IN', 'DCF', 'RTP', 'WIRE', 'WIRE_IN', 'TRANSFER_IN'];
  const withdrawalCodes = ['WITHDRAWAL', 'WD', 'WDRL', 'ACH_OUT', 'WIRE_OUT', 'WT', 'TRANSFER_OUT'];

  const normalizeDate = (value?: string | null) => {
    if (!value) return null;
    return value.split('T')[0];
  };

  return transactions
    .map((tx) => {
      const code = (tx.transaction_code || '').toUpperCase();
      const date =
        normalizeDate(tx.activity_date) ||
        normalizeDate(tx.process_date) ||
        normalizeDate(tx.settle_date) ||
        normalizeDate(tx.created_at) ||
        normalizeDate(tx.updated_at);
      if (!date) {
        return null;
      }

      const rawAmount = Math.abs(tx.amount || 0);
      if (rawAmount === 0) {
        return null;
      }

      if (depositCodes.includes(code)) {
        return { date, amount: rawAmount };
      }

      if (withdrawalCodes.includes(code)) {
        return { date, amount: -rawAmount };
      }

      return null;
    })
    .filter((event): event is { date: string; amount: number } => Boolean(event))
    .sort((a, b) => a.date.localeCompare(b.date));
}

