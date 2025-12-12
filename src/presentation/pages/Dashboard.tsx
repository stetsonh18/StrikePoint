import { useMemo, memo, useCallback, useState, useEffect } from 'react';
import { TrendingUp, DollarSign, Activity, PieChart, Award, Newspaper, ExternalLink, LineChart, Bitcoin, Zap, FileText, Camera, BarChart3, Maximize2, Minimize2, Info } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { useAuthStore } from '@/application/stores/auth.store';
import { usePositionStatistics, usePositions } from '@/application/hooks/usePositions';
import { useTransactions } from '@/application/hooks/useTransactions';
import { usePortfolioValue } from '@/application/hooks/usePortfolioValue';
import { useMarketNews } from '@/application/hooks/useMarketNews';
import { useStockQuotes } from '@/application/hooks/useStockQuotes';
import { useCryptoQuotes } from '@/application/hooks/useCryptoQuotes';
import { useOptionQuotes } from '@/application/hooks/useOptionQuotes';
import { buildTradierOptionSymbol } from '@/shared/utils/positionTransformers';
import { getCoinIdFromSymbol } from '@/infrastructure/services/cryptoMarketDataService';
import { useWinRateMetrics } from '@/application/hooks/useWinRateMetrics';
import { useDailyPerformance } from '@/application/hooks/useDailyPerformance';
import { useWeeklyPerformance } from '@/application/hooks/useWeeklyPerformance';
import { useMonthlyPerformanceDashboard } from '@/application/hooks/useMonthlyPerformanceDashboard';
import { useYearlyPerformance } from '@/application/hooks/useYearlyPerformance';
import { PortfolioSnapshotService } from '@/infrastructure/services/portfolioSnapshotService';
import { ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, Tooltip } from 'recharts';
import type { Position } from '@/domain/types';
import { PositionCardSkeleton, StatCardSkeleton, ArticleSkeleton } from '@/presentation/components/SkeletonLoader';
import { InlineError } from '@/presentation/components/ErrorDisplay';
import { getUserFriendlyErrorMessage, isRetryableError } from '@/shared/utils/errorHandler';
import { LoadingSpinner } from '@/presentation/components/LoadingSpinner';
import { RealtimeIndicator } from '@/presentation/components/RealtimeIndicator';
import { PositionCard } from '@/presentation/components/PositionCard';
import { TransactionItem } from '@/presentation/components/TransactionItem';
import { NewsArticleCard } from '@/presentation/components/NewsArticleCard';
import { PortfolioPerformanceChart } from '@/presentation/components/PortfolioPerformanceChart';
import { useToast } from '@/shared/hooks/useToast';
import { useTheme } from '@/shared/theme/useTheme';

export const Dashboard = () => {
  const user = useAuthStore((state) => state.user);
  const userId = user?.id || '';
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { theme } = useTheme();

  const { data: positionStats, isLoading: statsLoading, error: statsError } = usePositionStatistics(userId);
  const { data: transactions, isLoading: transactionsLoading } = useTransactions(userId);
  const { data: allPositions, isLoading: positionsLoading, error: positionsError } = usePositions(userId);
  const {
    portfolioValue,
    netCashFlow,
    unrealizedPL: portfolioUnrealizedPL,
    assetMetrics,
    isLoading: portfolioLoading,
  } = usePortfolioValue(userId);
  const portfolioError: Error | undefined = undefined;
  const { articles: marketNews = [], isLoading: newsLoading } = useMarketNews('general', undefined, true);
  const { data: winRateMetrics } = useWinRateMetrics(userId);
  const { data: dailyPerformance } = useDailyPerformance(userId);
  const { data: weeklyPerformance } = useWeeklyPerformance(userId);
  const { data: monthlyPerformance } = useMonthlyPerformanceDashboard(userId);
  const { data: yearlyPerformance } = useYearlyPerformance(userId);
  const [isChartExpanded, setIsChartExpanded] = useState(false);

  const realizedPL = positionStats?.totalRealizedPL || 0;
  const unrealizedPL = portfolioUnrealizedPL; // Use calculated unrealized P&L from all open positions

  // Calculate total fees from all transactions
  const totalFees = useMemo(() => {
    if (!transactions) return 0;
    return transactions.reduce((sum, tx) => sum + Number(tx.fees || 0), 0);
  }, [transactions]);
  const { normalizedOpenPositions, normalizedTotalPositions } = useMemo(() => {
    if (!allPositions) {
      return { normalizedOpenPositions: 0, normalizedTotalPositions: 0 };
    }

    const calculateNormalizedContracts = (positions: Position[], useOpeningQuantity = false) => {
      let total = 0;
      const strategiesMap = new Map<string, { positions: Position[]; contractSum: number }>();

      positions.forEach((position) => {
        const quantity = useOpeningQuantity
          ? Math.abs(position.opening_quantity ?? position.current_quantity ?? 0)
          : Math.abs(position.current_quantity ?? 0);

        if (position.strategy_id) {
          const existing = strategiesMap.get(position.strategy_id) ?? { positions: [], contractSum: 0 };
          existing.positions.push(position);
          existing.contractSum += quantity;
          strategiesMap.set(position.strategy_id, existing);
        } else {
          const contribution = quantity > 0 ? quantity : useOpeningQuantity ? Math.abs(position.opening_quantity || 0) || 1 : 0;
          total += contribution;
        }
      });

      strategiesMap.forEach(({ positions, contractSum }) => {
        if (positions.length === 0) {
          total += contractSum;
          return;
        }
        const normalizedContracts = positions.length > 0 ? contractSum / positions.length : contractSum;
        total += normalizedContracts;
      });

      return total;
    };

    const openPositions = allPositions.filter((position) => position.status === 'open');
    const normalizedOpen = calculateNormalizedContracts(openPositions);
    const normalizedTotal = calculateNormalizedContracts(allPositions, true);

    return {
      normalizedOpenPositions: normalizedOpen,
      normalizedTotalPositions: normalizedTotal,
    };
  }, [allPositions]);

  const totalOpenPositions = normalizedOpenPositions || positionStats?.open || 0;

  // Calculate realized P&L percentage
  // Snapshot generation mutation
  const generateSnapshotMutation = useMutation({
    mutationFn: () => PortfolioSnapshotService.generateSnapshot(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio-snapshots', userId] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-history', userId] });
      toast.success('Portfolio snapshot generated successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to generate snapshot', {
        description: error.message,
      });
    },
  });



  // Use net cash flow for cash balance display
  const cashBalance = netCashFlow || 0;

  // Get open positions by asset type
  const openPositions = useMemo(() => {
    if (!allPositions) return [];
    return allPositions.filter((p: Position) => p.status === 'open');
  }, [allPositions]);

  // Separate stock and crypto symbols for quotes
  const stockSymbols = useMemo(() => {
    const symbols = new Set<string>();
    openPositions.forEach((p: Position) => {
      if (p.symbol && p.asset_type === 'stock') {
        symbols.add(p.symbol);
      }
    });
    return Array.from(symbols);
  }, [openPositions]);

  const cryptoSymbols = useMemo(() => {
    const symbols = new Set<string>();
    openPositions.forEach((p: Position) => {
      if (p.symbol && p.asset_type === 'crypto') {
        symbols.add(p.symbol);
      }
    });
    return Array.from(symbols);
  }, [openPositions]);

  // Build Tradier option symbols for all open option positions
  const optionSymbols = useMemo(() => {
    const symbols: string[] = [];
    openPositions.forEach((p: Position) => {
      if (p.asset_type === 'option' && p.symbol && p.expiration_date && p.strike_price && p.option_type) {
        try {
          const tradierSymbol = buildTradierOptionSymbol(
            p.symbol,
            p.expiration_date,
            p.option_type as 'call' | 'put',
            p.strike_price
          );
          symbols.push(tradierSymbol);
        } catch (e) {
          console.error('Error building Tradier option symbol:', e, p);
        }
      }
    });
    return symbols;
  }, [openPositions]);

  // Fetch quotes for positions
  const { data: stockQuotes = {} } = useStockQuotes(stockSymbols, stockSymbols.length > 0);

  // For crypto, we need to convert symbols to coin IDs
  const [cryptoCoinIds, setCryptoCoinIds] = useState<string[]>([]);
  useEffect(() => {
    let isMounted = true;

    const fetchCoinIds = async () => {
      const uniqueSymbols = Array.from(new Set(cryptoSymbols));
      if (uniqueSymbols.length === 0) {
        if (isMounted) {
          setCryptoCoinIds([]);
        }
        return;
      }

      const ids = await Promise.all(uniqueSymbols.map((symbol) => getCoinIdFromSymbol(symbol)));
      if (isMounted) {
        setCryptoCoinIds(ids.filter((id): id is string => Boolean(id)));
      }
    };

    fetchCoinIds();

    return () => {
      isMounted = false;
    };
  }, [cryptoSymbols]);

  const { data: cryptoQuotes = {} } = useCryptoQuotes(cryptoCoinIds, cryptoCoinIds.length > 0);
  const { data: optionQuotes = {} } = useOptionQuotes(optionSymbols, optionSymbols.length > 0);

  // Normalize position counts by asset type for multi-leg strategies
  const normalizedAssetCounts = useMemo(() => {
    if (!allPositions) {
      return {
        stocks: 0,
        options: 0,
        crypto: 0,
        futures: 0,
      };
    }

    const normalizeByAssetType = (assetType: string) => {
      const positions = allPositions.filter((p) => p.asset_type === assetType && p.status === 'open');
      if (positions.length === 0) return 0;

      let totalCount = 0;
      const strategiesMap = new Map<string, Position[]>();

      positions.forEach((position) => {
        if (position.strategy_id) {
          if (!strategiesMap.has(position.strategy_id)) {
            strategiesMap.set(position.strategy_id, []);
          }
          strategiesMap.get(position.strategy_id)!.push(position);
        } else {
          // Single-leg position counts as 1
          totalCount += 1;
        }
      });

      // Normalize multi-leg strategies
      strategiesMap.forEach(() => {
        // For multi-leg strategies, count as 1 position (normalized)
        totalCount += 1;
      });

      return totalCount;
    };

    return {
      stocks: normalizeByAssetType('stock'),
      options: normalizeByAssetType('option'),
      crypto: normalizeByAssetType('crypto'),
      futures: normalizeByAssetType('futures'),
    };
  }, [allPositions]);

  // Asset breakdown uses metrics derived from usePortfolioValue per updated business rules
  // But uses normalized counts for position display
  const assetBreakdown = useMemo(() => {
    return {
      stocks: { count: normalizedAssetCounts.stocks, value: assetMetrics.stocks.marketValue, pl: assetMetrics.stocks.unrealizedPL },
      options: { count: normalizedAssetCounts.options, value: assetMetrics.options.marketValue, pl: assetMetrics.options.unrealizedPL },
      crypto: { count: normalizedAssetCounts.crypto, value: assetMetrics.crypto.marketValue, pl: assetMetrics.crypto.unrealizedPL },
      futures: { count: normalizedAssetCounts.futures, value: assetMetrics.futures.marketValue, pl: assetMetrics.futures.unrealizedPL },
      cash: { count: 1, value: cashBalance, pl: 0 },
    };
  }, [assetMetrics, cashBalance, normalizedAssetCounts]);

  // Calculate top performing positions with details
  const topPositions = useMemo(() => {
    if (!openPositions || openPositions.length === 0) return [];

    return openPositions
      .map((p: Position) => {
        let currentPrice = p.average_opening_price || 0;
        let marketValue = 0;

        // Get price from appropriate quote source
        if (p.asset_type === 'stock' && p.symbol) {
          const quote = stockQuotes[p.symbol];
          if (quote) {
            currentPrice = quote.price;
            marketValue = (p.current_quantity || 0) * currentPrice;
          }
        } else if (p.asset_type === 'crypto' && p.symbol) {
          const quote = cryptoQuotes[p.symbol];
          if (quote) {
            currentPrice = quote.current_price;
            marketValue = (p.current_quantity || 0) * currentPrice;
          }
        } else if (p.asset_type === 'option' && p.symbol && p.expiration_date && p.strike_price && p.option_type) {
          try {
            const tradierSymbol = buildTradierOptionSymbol(
              p.symbol,
              p.expiration_date,
              p.option_type as 'call' | 'put',
              p.strike_price
            );
            const quote = optionQuotes[tradierSymbol];
            if (quote && p.current_quantity) {
              currentPrice = quote.last || (quote.bid && quote.ask ? (quote.bid + quote.ask) / 2 : currentPrice);
              const multiplier = p.multiplier || 100;
              marketValue = p.current_quantity * multiplier * currentPrice;
            }
          } catch {
            // Fallback to stored values
          }
        }

        // Fallback calculation if no quote
        if (marketValue === 0) {
          marketValue = (p.current_quantity || 0) * currentPrice;
        }

        const costBasis = Math.abs(p.total_cost_basis || 0);
        const totalPL = (p.realized_pl || 0) + (p.unrealized_pl || 0);
        const plPercent = costBasis > 0 ? (totalPL / costBasis) * 100 : 0;

        return {
          id: p.id,
          symbol: p.symbol,
          assetType: p.asset_type,
          quantity: p.current_quantity || 0,
          avgPrice: p.average_opening_price || 0,
          currentPrice,
          marketValue,
          unrealizedPL: p.unrealized_pl || 0,
          totalPL,
          plPercent,
        };
      })
      .sort((a, b) => b.totalPL - a.totalPL)
      .slice(0, 10);
  }, [openPositions, stockQuotes, cryptoQuotes, optionQuotes]);

  // Calculate asset allocation for pie chart - use assetBreakdown values
  const assetAllocation = useMemo(() => {
    const allocation: Array<{ name: string; value: number }> = [];

    // Use absolute values for allocation to handle short positions (Gross Exposure)
    const stocksValue = Math.abs(assetBreakdown.stocks.value);
    const optionsValue = Math.abs(assetBreakdown.options.value);
    const cryptoValue = Math.abs(assetBreakdown.crypto.value);
    const futuresValue = Math.abs(assetBreakdown.futures.value);
    const cashValue = Math.abs(assetBreakdown.cash.value);

    const total = stocksValue + optionsValue + cryptoValue + futuresValue + cashValue;

    if (total === 0) return [];

    if (stocksValue > 0) {
      allocation.push({
        name: 'Stock',
        value: Number(stocksValue.toFixed(2)),
      });
    }
    if (optionsValue > 0) {
      allocation.push({
        name: 'Option',
        value: Number(optionsValue.toFixed(2)),
      });
    }
    if (cryptoValue > 0) {
      allocation.push({
        name: 'Crypto',
        value: Number(cryptoValue.toFixed(2)),
      });
    }
    if (futuresValue > 0) {
      allocation.push({
        name: 'Futures',
        value: Number(futuresValue.toFixed(2)),
      });
    }
    if (cashValue > 0) {
      allocation.push({
        name: 'Cash',
        value: Number(cashValue.toFixed(2)),
      });
    }

    return allocation.sort((a, b) => b.value - a.value);
  }, [assetBreakdown]);

  // Memoize colors array
  const COLORS = useMemo(() => ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'], []);

  // Get recent transactions (last 5) - memoized
  const recentTransactions = useMemo(() => {
    return transactions?.slice(0, 5) || [];
  }, [transactions]);

  // Format currency - memoized with useCallback
  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }, []);

  // Get asset type icon - memoized with useCallback
  const getAssetIcon = useCallback((assetType: string) => {
    switch (assetType) {
      case 'stock':
        return LineChart;
      case 'option':
        return Zap;
      case 'crypto':
        return Bitcoin;
      case 'futures':
        return Zap;
      default:
        return Activity;
    }
  }, []);

  return (
    <div className="p-4 md:p-8 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400 bg-clip-text text-transparent break-words">
            Dashboard
          </h1>
          <p className="text-slate-600 dark:text-slate-500 mt-2 text-sm md:text-lg break-words">
            Portfolio overview and key metrics
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => navigate('/analytics')}
              className="px-3 py-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded-lg text-purple-400 hover:text-purple-300 text-sm font-medium transition-all flex items-center gap-2 touch-target"
            >
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Analytics</span>
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => generateSnapshotMutation.mutate()}
                disabled={generateSnapshotMutation.isPending}
                className="px-3 py-2 bg-slate-200 dark:bg-slate-700/50 hover:bg-slate-300 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600/50 rounded-lg text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 text-xs sm:text-sm font-medium transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed touch-target whitespace-nowrap"
              >
                <Camera className="w-4 h-4" />
                <span className="hidden sm:inline">{generateSnapshotMutation.isPending ? 'Generating...' : 'Generate Snapshot'}</span>
                <span className="sm:hidden">{generateSnapshotMutation.isPending ? '...' : 'Snapshot'}</span>
              </button>

              <div className="relative group">
                <Info className="w-4 h-4 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 cursor-help transition-colors" />
                <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
                  <div className="text-sm text-slate-700 dark:text-slate-200 space-y-2">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">What is a Portfolio Snapshot?</p>
                    <p className="text-slate-600 dark:text-slate-300">
                      A snapshot captures your portfolio's current state, including:
                    </p>
                    <ul className="list-disc list-inside text-slate-500 dark:text-slate-400 space-y-1 ml-2">
                      <li>Portfolio value and cash balance</li>
                      <li>Realized and unrealized P&L</li>
                      <li>Position counts by asset type</li>
                      <li>Market values for all positions</li>
                    </ul>
                    <p className="text-slate-600 dark:text-slate-300 pt-1 border-t border-slate-200 dark:border-slate-700">
                      Snapshots are used to track your portfolio performance over time in the Analytics page. Generate one daily to build your performance history.
                    </p>
                  </div>
                  <div className="absolute -top-2 right-4 w-4 h-4 bg-white dark:bg-slate-800 border-l border-t border-slate-200 dark:border-slate-700 transform rotate-45"></div>
                </div>
              </div>
            </div>
          </div>
          <RealtimeIndicator
            queryKey={['portfolio', userId]}
            lastUpdated={new Date()}
            showRefreshButton={true}
          />
        </div>
      </div>

      {/* Error Display */}
      {(portfolioError || statsError || positionsError) && (
        <InlineError
          message={getUserFriendlyErrorMessage(portfolioError || statsError || positionsError)}
          onRetry={isRetryableError(portfolioError || statsError || positionsError) ? () => window.location.reload() : undefined}
        />
      )}

      {/* Zone 1: Primary Metrics - Most Important */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {portfolioLoading || statsLoading ? (
          <StatCardSkeleton count={4} />
        ) : (
          <>
            <StatCard
              title="Portfolio Value"
              value={formatCurrency(portfolioValue)}
              icon={DollarSign}
              iconColor="text-blue-400"
              bgColor="bg-blue-500/10"
              subtitle={dailyPerformance ? `${dailyPerformance.dailyPL >= 0 ? '+' : ''}${formatCurrency(dailyPerformance.dailyPL)} today` : undefined}
            />
            <StatCard
              title="Total P&L"
              value={`${(realizedPL + unrealizedPL) >= 0 ? '+' : ''}${formatCurrency(realizedPL + unrealizedPL)}`}
              icon={TrendingUp}
              iconColor={(realizedPL + unrealizedPL) >= 0 ? 'text-emerald-400' : 'text-red-400'}
              bgColor={(realizedPL + unrealizedPL) >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'}
              subtitle={winRateMetrics && winRateMetrics.totalTrades > 0 ? `${winRateMetrics.winRate.toFixed(1)}% win rate` : undefined}
            />
            <StatCard
              title="Open Positions"
              value={totalOpenPositions.toString()}
              icon={Activity}
              iconColor="text-blue-400"
              bgColor="bg-blue-500/10"
              subtitle={`${normalizedTotalPositions || allPositions?.length || 0} total`}
            />
            <StatCard
              title="Cash Balance"
              value={formatCurrency(cashBalance)}
              icon={DollarSign}
              iconColor="text-emerald-400"
              bgColor="bg-emerald-500/10"
            />
          </>
        )}
      </div>

      {/* Zone 2: Performance Summary Card */}
      <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/50 dark:to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-800/50 p-4 md:p-6 shadow-sm dark:shadow-none">
        <h3 className="text-base md:text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3 md:mb-4">Performance Summary</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <div className="flex items-center justify-between p-4 bg-slate-100 dark:bg-slate-800/30 rounded-xl">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Today</p>
              <p className={`text-xl font-bold ${dailyPerformance && dailyPerformance.dailyPL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {dailyPerformance ? `${dailyPerformance.dailyPL >= 0 ? '+' : ''}${formatCurrency(dailyPerformance.dailyPL)}` : '—'}
              </p>
              {dailyPerformance && dailyPerformance.dailyPLPercent !== 0 && (
                <p className="text-xs text-slate-500 mt-1">
                  {dailyPerformance.dailyPLPercent >= 0 ? '+' : ''}{dailyPerformance.dailyPLPercent.toFixed(2)}%
                </p>
              )}
              {dailyPerformance && (
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                  {`${formatCurrency(dailyPerformance.realizedPL)} realized / ${formatCurrency(dailyPerformance.unrealizedPL)} unrealized`}
                </p>
              )}
            </div>
            <TrendingUp className={`w-8 h-8 ${dailyPerformance && dailyPerformance.dailyPL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`} />
          </div>
          <div className="flex items-center justify-between p-4 bg-slate-100 dark:bg-slate-800/30 rounded-xl">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">This Week</p>
              <p className={`text-xl font-bold ${weeklyPerformance && weeklyPerformance.weeklyPL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {weeklyPerformance ? `${weeklyPerformance.weeklyPL >= 0 ? '+' : ''}${formatCurrency(weeklyPerformance.weeklyPL)}` : '—'}
              </p>
              {weeklyPerformance && weeklyPerformance.weeklyPLPercent !== 0 && (
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                  {weeklyPerformance.weeklyPLPercent >= 0 ? '+' : ''}{weeklyPerformance.weeklyPLPercent.toFixed(2)}%
                </p>
              )}
              {weeklyPerformance && (
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                  {`${formatCurrency(weeklyPerformance.realizedPL)} realized / ${formatCurrency(weeklyPerformance.unrealizedPL)} unrealized`}
                </p>
              )}
            </div>
            <TrendingUp className={`w-8 h-8 ${weeklyPerformance && weeklyPerformance.weeklyPL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`} />
          </div>
          <div className="flex items-center justify-between p-4 bg-slate-100 dark:bg-slate-800/30 rounded-xl">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">This Month</p>
              <p className={`text-xl font-bold ${monthlyPerformance && monthlyPerformance.monthlyPL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {monthlyPerformance ? `${monthlyPerformance.monthlyPL >= 0 ? '+' : ''}${formatCurrency(monthlyPerformance.monthlyPL)}` : '—'}
              </p>
              {monthlyPerformance && monthlyPerformance.monthlyPLPercent !== 0 && (
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                  {monthlyPerformance.monthlyPLPercent >= 0 ? '+' : ''}{monthlyPerformance.monthlyPLPercent.toFixed(2)}%
                </p>
              )}
              {monthlyPerformance && (
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                  {`${formatCurrency(monthlyPerformance.realizedPL)} realized / ${formatCurrency(monthlyPerformance.unrealizedPL)} unrealized`}
                </p>
              )}
            </div>
            <TrendingUp className={`w-8 h-8 ${monthlyPerformance && monthlyPerformance.monthlyPL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`} />
          </div>
          <div className="flex items-center justify-between p-4 bg-slate-100 dark:bg-slate-800/30 rounded-xl">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">This Year</p>
              <p className={`text-xl font-bold ${yearlyPerformance && yearlyPerformance.yearlyPL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {yearlyPerformance ? `${yearlyPerformance.yearlyPL >= 0 ? '+' : ''}${formatCurrency(yearlyPerformance.yearlyPL)}` : '—'}
              </p>
              {yearlyPerformance && yearlyPerformance.yearlyPLPercent !== 0 && (
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                  {yearlyPerformance.yearlyPLPercent >= 0 ? '+' : ''}{yearlyPerformance.yearlyPLPercent.toFixed(2)}%
                </p>
              )}
              {yearlyPerformance && (
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                  {`${formatCurrency(yearlyPerformance.realizedPL)} realized / ${formatCurrency(yearlyPerformance.unrealizedPL)} unrealized`}
                </p>
              )}
            </div>
            <TrendingUp className={`w-8 h-8 ${yearlyPerformance && yearlyPerformance.yearlyPL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`} />
          </div>
        </div>
      </div>

      {/* Zone 3: Secondary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {portfolioLoading || statsLoading || transactionsLoading ? (
          <StatCardSkeleton count={4} />
        ) : (
          <>
            <StatCard
              title="Realized P&L"
              value={`${realizedPL >= 0 ? '+' : ''}${formatCurrency(realizedPL)}`}
              icon={TrendingUp}
              iconColor={realizedPL >= 0 ? 'text-emerald-400' : 'text-red-400'}
              bgColor={realizedPL >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'}
            />
            <StatCard
              title="Unrealized P&L"
              value={`${unrealizedPL >= 0 ? '+' : ''}${formatCurrency(unrealizedPL)}`}
              icon={TrendingUp}
              iconColor={unrealizedPL >= 0 ? 'text-emerald-400' : 'text-red-400'}
              bgColor={unrealizedPL >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'}
            />
            <StatCard
              title="Total Fees"
              value={formatCurrency(totalFees)}
              icon={DollarSign}
              iconColor="text-red-400"
              bgColor="bg-red-500/10"
              subtitle={transactions ? `${transactions.length} transactions` : undefined}
            />
            <StatCard
              title="Profit Factor"
              value={winRateMetrics && winRateMetrics.totalTrades > 0 ? winRateMetrics.profitFactor.toFixed(2) : '—'}
              icon={BarChart3}
              iconColor={winRateMetrics && winRateMetrics.profitFactor >= 1 ? 'text-emerald-400' : 'text-slate-400'}
              bgColor={winRateMetrics && winRateMetrics.profitFactor >= 1 ? 'bg-emerald-500/10' : 'bg-slate-500/10'}
              subtitle={winRateMetrics && winRateMetrics.totalTrades > 0 ? `${formatCurrency(winRateMetrics.totalGains)} / ${formatCurrency(winRateMetrics.totalLosses)}` : 'No trades yet'}
            />
          </>
        )}
      </div>

      {/* Zone 4: Asset Allocation - Enhanced with Values */}
      <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/50 dark:to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-800/50 p-4 md:p-6 shadow-sm dark:shadow-none">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Asset Allocation</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
          <AssetTypeCard
            title="Stocks"
            count={assetBreakdown.stocks.count}
            value={assetBreakdown.stocks.value}
            pl={assetBreakdown.stocks.pl}
            icon={LineChart}
            formatCurrency={formatCurrency}
          />
          <AssetTypeCard
            title="Options"
            count={assetBreakdown.options.count}
            value={assetBreakdown.options.value}
            pl={assetBreakdown.options.pl}
            icon={Zap}
            formatCurrency={formatCurrency}
          />
          <AssetTypeCard
            title="Crypto"
            count={assetBreakdown.crypto.count}
            value={assetBreakdown.crypto.value}
            pl={assetBreakdown.crypto.pl}
            icon={Bitcoin}
            formatCurrency={formatCurrency}
          />
          <AssetTypeCard
            title="Futures"
            count={assetBreakdown.futures.count}
            value={assetBreakdown.futures.value}
            pl={assetBreakdown.futures.pl}
            icon={Zap}
            formatCurrency={formatCurrency}
          />
          <AssetTypeCard
            title="Cash"
            count={assetBreakdown.cash.count}
            value={assetBreakdown.cash.value}
            pl={assetBreakdown.cash.pl}
            icon={DollarSign}
            formatCurrency={formatCurrency}
          />
        </div>
      </div>

      {/* Main Content Area - 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Left Column - Top Performing Positions */}
        <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/50 dark:to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-800/50 p-4 md:p-6 shadow-sm dark:shadow-none">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              Top Performing Positions
            </h3>
          </div>
          {positionsLoading ? (
            <div className="space-y-3">
              <PositionCardSkeleton count={4} />
            </div>
          ) : topPositions.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-slate-500 dark:text-slate-400 text-sm">No open positions</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
              {topPositions.slice(0, 4).map((pos) => (
                <PositionCard
                  key={pos.id}
                  id={pos.id}
                  symbol={pos.symbol}
                  assetType={pos.assetType}
                  quantity={pos.quantity}
                  avgPrice={pos.avgPrice}
                  currentPrice={pos.currentPrice}
                  marketValue={pos.marketValue}
                  unrealizedPL={pos.unrealizedPL}
                  totalPL={pos.totalPL}
                  plPercent={pos.plPercent}
                  formatCurrency={formatCurrency}
                  getAssetIcon={getAssetIcon}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right Column - Market Overview - Collapsible */}
        <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/50 dark:to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-800/50 p-4 md:p-6 shadow-sm dark:shadow-none">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Newspaper className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                Market Overview
              </h3>
            </div>
            <Link
              to="/news"
              className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 flex items-center gap-1"
            >
              View More
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
          {newsLoading ? (
            <ArticleSkeleton count={4} />
          ) : marketNews.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Newspaper className="w-12 h-12 mx-auto mb-3 text-slate-500 dark:text-slate-600" />
                <p className="text-slate-600 dark:text-slate-400 text-sm">No market news available</p>
                <p className="text-slate-500 dark:text-slate-500 text-xs mt-1">Check your Finnhub API key in Settings</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
              {marketNews.slice(0, 5).map((article) => (
                <NewsArticleCard key={article.id} article={article} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Zone 5: Portfolio Performance Chart - Enhanced */}
      {isChartExpanded && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={() => setIsChartExpanded(false)}
        />
      )}
      <div className={`bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/50 dark:to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-800/50 p-4 md:p-6 shadow-sm dark:shadow-none ${isChartExpanded ? 'fixed inset-2 md:inset-4 z-50 overflow-auto bg-white dark:bg-slate-900 shadow-2xl' : 'relative'}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <LineChart className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              Portfolio Performance
            </h3>
          </div>
          <button
            onClick={() => setIsChartExpanded(!isChartExpanded)}
            className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700/50 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300 transition-all"
            title={isChartExpanded ? 'Minimize' : 'Expand'}
          >
            {isChartExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
        <div className={isChartExpanded ? 'h-[calc(100vh-12rem)]' : 'h-96'}>
          <PortfolioPerformanceChart userId={userId} formatCurrency={formatCurrency} isExpanded={isChartExpanded} />
        </div>
      </div>

      {/* Bottom Section - Recent Transactions and Asset Allocation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/50 dark:to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-800/50 p-4 md:p-6 shadow-sm dark:shadow-none">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              Recent Transactions
            </h3>
            {recentTransactions.length > 0 && (
              <Link
                to="/journal"
                className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 flex items-center gap-1"
              >
                View All
                <ExternalLink className="w-3 h-3" />
              </Link>
            )}
          </div>
          {transactionsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-3 bg-slate-100 dark:bg-slate-800/30 rounded-lg border border-slate-200 dark:border-slate-700/30 animate-pulse">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="h-4 bg-slate-200 dark:bg-slate-800/50 rounded w-24 mb-2" />
                      <div className="h-3 bg-slate-200 dark:bg-slate-800/50 rounded w-16" />
                    </div>
                    <div className="text-right">
                      <div className="h-4 bg-slate-200 dark:bg-slate-800/50 rounded w-20 mb-2" />
                      <div className="h-3 bg-slate-200 dark:bg-slate-800/50 rounded w-16 ml-auto" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : recentTransactions.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Activity className="w-12 h-12 mx-auto mb-3 text-slate-500 dark:text-slate-600" />
                <p className="text-slate-600 dark:text-slate-400 text-sm">No transactions yet</p>
                <p className="text-slate-500 dark:text-slate-500 text-xs mt-1">Import your trades to see them here</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {recentTransactions.map((tx) => (
                <TransactionItem
                  key={tx.id}
                  id={tx.id}
                  underlying_symbol={tx.underlying_symbol ?? undefined}
                  instrument={tx.instrument ?? tx.underlying_symbol ?? ''}
                  transaction_code={tx.transaction_code ?? ''}
                  amount={tx.amount}
                  activity_date={tx.activity_date}
                  formatCurrency={formatCurrency}
                />
              ))}
            </div>
          )}
        </div>

        {/* Asset Allocation */}
        <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/50 dark:to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-800/50 p-4 md:p-6 shadow-sm dark:shadow-none">
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              Asset Allocation
            </h3>
          </div>
          {positionsLoading ? (
            <div className="h-64 flex items-center justify-center">
              <LoadingSpinner size="lg" text="Loading asset allocation..." />
            </div>
          ) : assetAllocation.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-slate-600 dark:text-slate-400 text-sm">No open positions</p>
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={assetAllocation}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {assetAllocation.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
                      border: theme === 'dark' ? '1px solid #334155' : '1px solid #e2e8f0',
                      borderRadius: '8px',
                      color: theme === 'dark' ? '#f1f5f9' : '#0f172a',
                    }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  iconColor?: string;
  bgColor?: string;
  subtitle?: string;
}

const StatCard = memo(({ title, value, icon: Icon, iconColor = 'text-emerald-400', bgColor = 'bg-emerald-500/10', subtitle }: StatCardProps) => (
  <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/50 dark:to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-800/50 p-4 md:p-6 hover:border-slate-300 dark:hover:border-slate-700/50 transition-all shadow-sm dark:shadow-none">
    <div className="flex items-center justify-between mb-2 md:mb-3">
      <span className="text-xs md:text-sm font-medium text-slate-600 dark:text-slate-400 break-words min-w-0 flex-1 pr-2">{title}</span>
      <div className={`p-1.5 md:p-2 rounded-lg ${bgColor} flex-shrink-0`}>
        <Icon className={`w-4 h-4 md:w-5 md:h-5 ${iconColor}`} />
      </div>
    </div>
    <p className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1 break-words">{value}</p>
    {subtitle && (
      <p className="text-xs text-slate-500 dark:text-slate-500 break-words">{subtitle}</p>
    )}
  </div>
));
StatCard.displayName = 'StatCard';

interface AssetTypeCardProps {
  title: string;
  count: number;
  value: number;
  pl: number;
  icon: React.ElementType;
}

const AssetTypeCard = memo(({ title, count, value, pl, icon: Icon, formatCurrency }: AssetTypeCardProps & { formatCurrency: (amount: number) => string }) => (
  <div className="bg-slate-100 dark:bg-slate-800/30 rounded-xl border border-slate-200 dark:border-slate-800/50 p-4 hover:border-slate-300 dark:hover:border-slate-700/50 transition-all">
    <div className="flex items-center justify-between mb-2">
      <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{title}</p>
      <div className="p-1.5 rounded-lg bg-blue-500/10">
        <Icon className="w-4 h-4 text-blue-400" />
      </div>
    </div>
    <p className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">{formatCurrency(value)}</p>
    <div className={`text-xs font-medium mb-2 ${pl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
      {pl !== 0 ? `${pl >= 0 ? '+' : ''}${formatCurrency(pl)}` : '—'}
    </div>
    <p className="text-xs text-slate-500 dark:text-slate-500">{count} {count === 1 ? 'position' : 'positions'}</p>
  </div>
));
AssetTypeCard.displayName = 'AssetTypeCard';
