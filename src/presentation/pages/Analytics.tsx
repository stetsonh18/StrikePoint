import { useState, useEffect, useRef, useMemo } from 'react';
import { Calendar, TrendingUp, ChevronDown } from 'lucide-react';
import { EmptyAnalytics } from '@/presentation/components/EnhancedEmptyState';
import { useAuthStore } from '@/application/stores/auth.store';
import { useAnalytics } from '@/application/hooks/useAnalytics';
import { useSymbolPerformance } from '@/application/hooks/useSymbolPerformance';
import { useMonthlyPerformance } from '@/application/hooks/useMonthlyPerformance';
import { usePLOverTime } from '@/application/hooks/usePLOverTime';
import { useLast7DaysPL } from '@/application/hooks/useLast7DaysPL';
import { useDayOfWeekPerformance } from '@/application/hooks/useDayOfWeekPerformance';
import { useDrawdownOverTime } from '@/application/hooks/useDrawdownOverTime';
import { PLOverTimeChart } from '@/presentation/components/charts/PLOverTimeChart';
import { Last7DaysPLChart } from '@/presentation/components/charts/Last7DaysPLChart';
import { WinLossDistributionChart } from '@/presentation/components/charts/WinLossDistributionChart';
import { TopSymbolsPLChart } from '@/presentation/components/charts/TopSymbolsPLChart';
import { DayOfWeekChart } from '@/presentation/components/charts/DayOfWeekChart';
import { DrawdownChart } from '@/presentation/components/charts/DrawdownChart';
import { useOptionsByType } from '@/application/hooks/useOptionsByType';
import { useExpirationStatus } from '@/application/hooks/useExpirationStatus';
import { useDaysToExpiration } from '@/application/hooks/useDaysToExpiration';
import { useStrategyPerformance } from '@/application/hooks/useStrategyPerformance';
import { useEntryTimePerformance, useEntryTimeByStrategy } from '@/application/hooks/useEntryTimePerformance';
import { CallPutChart } from '@/presentation/components/charts/CallPutChart';
import { ExpirationStatusChart } from '@/presentation/components/charts/ExpirationStatusChart';
import { DaysToExpirationChart } from '@/presentation/components/charts/DaysToExpirationChart';
import { StrategyChart } from '@/presentation/components/charts/StrategyChart';
import { EntryTimeChart } from '@/presentation/components/charts/EntryTimeChart';
import { useBalanceOverTime } from '@/application/hooks/useBalanceOverTime';
import { useROIOverTime } from '@/application/hooks/useROIOverTime';
import { BalanceOverTimeChart } from '@/presentation/components/charts/BalanceOverTimeChart';
import { useTheme } from '@/shared/theme/useTheme';
import { ROIOverTimeChart } from '@/presentation/components/charts/ROIOverTimeChart';
import { useDailyPerformanceCalendar } from '@/application/hooks/useDailyPerformanceCalendar';
import { DailyPerformanceCalendar } from '@/presentation/components/charts/DailyPerformanceCalendar';
import { useHoldingPeriodDistribution } from '@/application/hooks/useHoldingPeriodDistribution';
import { useFuturesContractMonthPerformance } from '@/application/hooks/useFuturesContractMonthPerformance';
import { useFuturesMarginEfficiency } from '@/application/hooks/useFuturesMarginEfficiency';
import { useCryptoCoinPerformance } from '@/application/hooks/useCryptoCoinPerformance';
import { HoldingPeriodChart } from '@/presentation/components/charts/HoldingPeriodChart';
import { FuturesContractMonthChart } from '@/presentation/components/charts/FuturesContractMonthChart';
import { FuturesMarginEfficiencyChart } from '@/presentation/components/charts/FuturesMarginEfficiencyChart';
import { CryptoCoinChart } from '@/presentation/components/charts/CryptoCoinChart';
import { formatCurrency } from '@/shared/utils/formatUtils';
import type { AssetType } from '@/domain/types/asset.types';
import { usePositions } from '@/application/hooks/usePositions';
import { useStockQuotes } from '@/application/hooks/useStockQuotes';
import { useCryptoQuotes } from '@/application/hooks/useCryptoQuotes';
import { useOptionQuotes } from '@/application/hooks/useOptionQuotes';
import { buildTradierOptionSymbol } from '@/shared/utils/positionTransformers';
import { MetricCard } from '@/presentation/components/MetricCard';
import { CustomDateRangeModal } from '@/presentation/components/CustomDateRangeModal';
import { DateRangeStorage } from '@/shared/utils/dateRangeStorage';

type AnalyticsTab = 'all' | 'stocks' | 'options' | 'crypto' | 'futures';
type TimePeriod = 7 | 30 | 90 | 365 | null | 'custom'; // null = all time

interface CustomDateRange {
  startDate: string; // ISO format: "YYYY-MM-DD"
  endDate: string;   // ISO format: "YYYY-MM-DD"
}

const TAB_TO_ASSET_TYPE: Record<AnalyticsTab, AssetType | undefined> = {
  all: undefined,
  stocks: 'stock',
  options: 'option',
  crypto: 'crypto',
  futures: 'futures',
};

const TIME_PERIOD_OPTIONS: Array<{ value: TimePeriod; label: string }> = [
  { value: 7, label: 'Last 7 Days' },
  { value: 30, label: 'Last 30 Days' },
  { value: 90, label: 'Last 90 Days' },
  { value: 365, label: 'Last Year' },
  { value: null, label: 'All Time' },
  { value: 'custom', label: 'Custom Range...' },
];

const getTimePeriodLabel = (period: TimePeriod, customRange: CustomDateRange | null): string => {
  if (period === 'custom' && customRange) {
    const start = new Date(customRange.startDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' });
    const end = new Date(customRange.endDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' });
    return `Custom (${start} - ${end})`;
  }
  const match = TIME_PERIOD_OPTIONS.find((option) => option.value === period);
  return match?.label ?? 'All Time';
};

export const Analytics = () => {
  const user = useAuthStore((state) => state.user);
  const userId = user?.id || '';
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('all');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>(30);
  const [customDateRange, setCustomDateRange] = useState<CustomDateRange | null>(null);
  const [showDateRangeModal, setShowDateRangeModal] = useState(false);
  const [showTimePeriodMenu, setShowTimePeriodMenu] = useState(false);
  const timePeriodMenuRef = useRef<HTMLDivElement>(null);
  
  // Load custom date range from localStorage on mount
  useEffect(() => {
    const savedRange = DateRangeStorage.load();
    if (savedRange) {
      setTimePeriod('custom');
      setCustomDateRange(savedRange);
    }
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (timePeriodMenuRef.current && !timePeriodMenuRef.current.contains(event.target as Node)) {
        setShowTimePeriodMenu(false);
      }
    };

    if (showTimePeriodMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTimePeriodMenu]);

  // Handle time period change
  const handleTimePeriodChange = (value: TimePeriod) => {
    if (value === 'custom') {
      setShowDateRangeModal(true);
    } else {
      setTimePeriod(value);
      setCustomDateRange(null);
      DateRangeStorage.clear();
    }
    setShowTimePeriodMenu(false);
  };

  // Handle custom range apply
  const handleCustomRangeApply = (range: CustomDateRange) => {
    setCustomDateRange(range);
    setTimePeriod('custom');
    DateRangeStorage.save(range);
    setShowDateRangeModal(false);
  };

  // Convert timePeriod to dateRange for hooks
  const dateRange = useMemo((): { startDate: string; endDate: string } | undefined => {
    if (timePeriod === 'custom') {
      return customDateRange || undefined;
    }
    if (timePeriod === null) {
      return undefined; // All time
    }

    // timePeriod is now a number (7, 30, 90, 365)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timePeriod);

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };
  }, [timePeriod, customDateRange]);

  const assetType = TAB_TO_ASSET_TYPE[activeTab];
  const { data: metrics, isLoading, error: metricsError } = useAnalytics(userId, assetType, dateRange);
  const { data: allPositions } = usePositions(userId);
  
  // Log for debugging
  useEffect(() => {
    if (metricsError) {
      console.error('[Analytics] Error loading metrics:', metricsError);
    }
    if (metrics) {
      console.log('[Analytics] Metrics loaded:', {
        totalTrades: metrics.totalTrades,
        realizedPL: metrics.realizedPL,
        unrealizedPL: metrics.unrealizedPL,
        assetType,
      });
    }
  }, [metrics, metricsError, assetType]);
  
  // Get open positions filtered by asset type
  const openPositions = useMemo(() => {
    if (!allPositions) return [];
    return allPositions.filter(
      (p) => p.status === 'open' && (!assetType || p.asset_type === assetType)
    );
  }, [allPositions, assetType]);
  
  // Get symbols for quotes
  const stockSymbols = useMemo(() => {
    const symbols = new Set<string>();
    openPositions.forEach((p) => {
      if (p.symbol && p.asset_type === 'stock') {
        symbols.add(p.symbol);
      }
    });
    return Array.from(symbols);
  }, [openPositions]);
  
  const cryptoSymbols = useMemo(() => {
    const symbols = new Set<string>();
    openPositions.forEach((p) => {
      if (p.symbol && p.asset_type === 'crypto') {
        symbols.add(p.symbol.toUpperCase());
      }
    });
    return Array.from(symbols);
  }, [openPositions]);
  
  const optionSymbols = useMemo(() => {
    const symbols: string[] = [];
    openPositions.forEach((p) => {
      if (p.asset_type === 'option' && p.symbol && p.expiration_date && p.strike_price && p.option_type) {
        try {
          const tradierSymbol = buildTradierOptionSymbol(
            p.symbol,
            p.expiration_date,
            p.option_type as 'call' | 'put',
            p.strike_price
          );
          symbols.push(tradierSymbol);
        } catch {
          // Skip invalid option symbols
        }
      }
    });
    return symbols;
  }, [openPositions]);
  
  // Fetch quotes
  const { data: stockQuotes = {} } = useStockQuotes(stockSymbols, stockSymbols.length > 0);
  const { data: cryptoQuotes = {} } = useCryptoQuotes(cryptoSymbols, cryptoSymbols.length > 0);
  const { data: optionQuotes = {} } = useOptionQuotes(optionSymbols, optionSymbols.length > 0);
  
  // Calculate unrealized P&L dynamically using real-time quotes
  const calculatedUnrealizedPL = useMemo(() => {
    if (!openPositions || openPositions.length === 0) return metrics?.unrealizedPL || 0;
    
    let totalUnrealizedPL = 0;
    
    openPositions.forEach((position) => {
      // For stocks, calculate dynamically if we have current quotes
      if (position.asset_type === 'stock' && position.symbol) {
        const quote = stockQuotes[position.symbol];
        if (quote && position.current_quantity && position.average_opening_price) {
          const currentPrice = quote.price;
          const marketValue = currentPrice * position.current_quantity;
          const costBasis = Math.abs(position.total_cost_basis || 0);
          const calculatedUnrealizedPL = marketValue - costBasis;
          totalUnrealizedPL += calculatedUnrealizedPL;
          return;
        }
      }
      
      // For crypto, calculate dynamically if we have current quotes
      if (position.asset_type === 'crypto' && position.symbol) {
        const quote = cryptoQuotes[position.symbol.toUpperCase()];
        if (quote && position.current_quantity && position.average_opening_price) {
          const currentPrice = quote.current_price;
          const marketValue = currentPrice * position.current_quantity;
          const costBasis = Math.abs(position.total_cost_basis || 0);
          const calculatedUnrealizedPL = marketValue - costBasis;
          totalUnrealizedPL += calculatedUnrealizedPL;
          return;
        }
      }
      
      // For options, calculate dynamically if we have option quotes
      if (position.asset_type === 'option' && position.symbol && position.expiration_date && position.strike_price && position.option_type) {
        try {
          const tradierSymbol = buildTradierOptionSymbol(
            position.symbol,
            position.expiration_date,
            position.option_type as 'call' | 'put',
            position.strike_price
          );
          
          const quote = optionQuotes[tradierSymbol];
          
          if (quote && position.current_quantity) {
            const currentPrice = quote.last ||
              (quote.bid && quote.ask ? (quote.bid + quote.ask) / 2 : position.average_opening_price || 0);
            
            const multiplier = position.multiplier || 100;
            const marketValue = position.current_quantity * multiplier * currentPrice;
            const costBasis = Math.abs(position.total_cost_basis || 0);
            const isLong = position.side === 'long';
            
            // Calculate P&L correctly for long vs short
            const calculatedUnrealizedPL = isLong
              ? marketValue - costBasis
              : costBasis - marketValue;
            
            totalUnrealizedPL += calculatedUnrealizedPL;
            return;
          }
        } catch {
          // Skip invalid option symbols
        }
      }
      
      // For futures, or if no quote available, use stored unrealized_pl
      const storedUnrealizedPL = position.unrealized_pl || 0;
      totalUnrealizedPL += storedUnrealizedPL;
    });
    
    return totalUnrealizedPL;
  }, [openPositions, stockQuotes, cryptoQuotes, optionQuotes, metrics]);
  
  // Override metrics with calculated unrealized P&L
  const metricsWithUnrealizedPL = useMemo(() => {
    if (!metrics) return metrics;
    return {
      ...metrics,
      unrealizedPL: calculatedUnrealizedPL,
    };
  }, [metrics, calculatedUnrealizedPL]);
  const { data: symbolPerformance = [], isLoading: isLoadingSymbols } = useSymbolPerformance(
    userId,
    assetType,
    (timePeriod !== null && timePeriod !== 'custom') ? timePeriod : undefined,
    dateRange
  );
  const { data: monthlyPerformance = [], isLoading: isLoadingMonthly } = useMonthlyPerformance(
    userId,
    assetType,
    12,
    dateRange
  );
  const { data: plOverTimeData = [], isLoading: isLoadingPLOverTime } = usePLOverTime(
    userId,
    assetType,
    (timePeriod !== null && timePeriod !== 'custom') ? timePeriod : undefined
  );
  const { data: last7DaysData = [], isLoading: isLoadingLast7Days } = useLast7DaysPL(userId, assetType, dateRange);
  const { data: dayOfWeekData = [], isLoading: isLoadingDayOfWeek } = useDayOfWeekPerformance(userId, assetType, dateRange);
  const { data: drawdownData = [], isLoading: isLoadingDrawdown } = useDrawdownOverTime(
    userId,
    assetType,
    (timePeriod !== null && timePeriod !== 'custom') ? timePeriod : undefined
  );
  const { data: optionsByTypeData, isLoading: isLoadingOptionsByType } = useOptionsByType(userId, dateRange);
  const { data: expirationStatusData, isLoading: isLoadingExpirationStatus } = useExpirationStatus(userId, dateRange);
  const { data: daysToExpirationData = [], isLoading: isLoadingDaysToExpiration } = useDaysToExpiration(userId, dateRange);
  const { data: strategyPerformanceData = [], isLoading: isLoadingStrategyPerformance } = useStrategyPerformance(userId, dateRange);
  const { data: optionsEntryTimeData = [], isLoading: isLoadingOptionsEntryTime } = useEntryTimePerformance(userId, 'option', dateRange);
  const { data: futuresEntryTimeData = [], isLoading: isLoadingFuturesEntryTime } = useEntryTimePerformance(userId, 'futures', dateRange);
  const { data: entryTimeByStrategyData, isLoading: isLoadingEntryTimeByStrategy } = useEntryTimeByStrategy(userId, dateRange);
  const { data: balanceOverTimeData = [], isLoading: isLoadingBalanceOverTime } = useBalanceOverTime(
    userId,
    assetType,
    (timePeriod !== null && timePeriod !== 'custom') ? timePeriod : undefined
  );
  const { data: roiOverTimeData = [], isLoading: isLoadingROIOverTime } = useROIOverTime(
    userId,
    assetType,
    (timePeriod !== null && timePeriod !== 'custom') ? timePeriod : undefined
  );
  const { data: dailyCalendarData = [], isLoading: isLoadingDailyCalendar } = useDailyPerformanceCalendar(
    userId,
    activeTab === 'all' ? undefined : assetType,
    dateRange
  );
  const { data: stocksHoldingPeriodData = [], isLoading: isLoadingStocksHoldingPeriod } = useHoldingPeriodDistribution(userId, 'stock', dateRange);
  const { data: cryptoHoldingPeriodData = [], isLoading: isLoadingCryptoHoldingPeriod } = useHoldingPeriodDistribution(userId, 'crypto', dateRange);
  const { data: futuresContractMonthData = [], isLoading: isLoadingFuturesContractMonth } = useFuturesContractMonthPerformance(userId, dateRange);
  const { data: futuresMarginEfficiencyData = [], isLoading: isLoadingFuturesMarginEfficiency } = useFuturesMarginEfficiency(userId, dateRange);
  const { data: cryptoCoinData = [], isLoading: isLoadingCryptoCoin } = useCryptoCoinPerformance(userId, dateRange);

  const formatValue = (value: number | undefined, isCurrency = false, isPercent = false): string => {
    if (value === undefined || value === null || isNaN(value)) return '—';
    if (isPercent) return `${value.toFixed(2)}%`;
    if (isCurrency) return formatCurrency(value);
    return value.toFixed(2);
  };

  // Use metrics with calculated unrealized P&L
  const displayMetrics = metricsWithUnrealizedPL || metrics;
  // Show analytics if there are closed trades OR open positions
  // This ensures users see analytics even if they only have open positions
  const hasData = displayMetrics && (
    (displayMetrics.totalTrades > 0) || 
    (openPositions && openPositions.length > 0)
  );

  return (
    <div className="p-4 md:p-8 space-y-4 md:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400 bg-clip-text text-transparent">
            Analytics
          </h1>
          <p className="text-slate-600 dark:text-slate-500 mt-2 text-sm md:text-lg">
            Detailed insights into your trading performance
          </p>
        </div>
        <div className="relative" ref={timePeriodMenuRef}>
          <button
            onClick={() => setShowTimePeriodMenu(!showTimePeriodMenu)}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700/50 text-slate-700 dark:text-slate-300 rounded-xl font-medium transition-all touch-target w-full sm:w-auto"
          >
            <Calendar className="w-4 h-4" />
            {getTimePeriodLabel(timePeriod, customDateRange)}
            <ChevronDown className={`w-4 h-4 transition-transform ${showTimePeriodMenu ? 'rotate-180' : ''}`} />
          </button>
          {showTimePeriodMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 overflow-hidden">
              {TIME_PERIOD_OPTIONS.map(({ value, label }) => {
                const key = value === null ? 'all-time' : value === 'custom' ? 'custom' : String(value);
                return (
                  <button
                    key={key}
                    onClick={() => handleTimePeriodChange(value)}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                      timePeriod === value
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/50 dark:to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-800/50 overflow-hidden shadow-sm dark:shadow-none">
        <div className="flex overflow-x-auto border-b border-slate-200 dark:border-slate-800/50 scrollbar-hide">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 md:px-6 py-3 font-medium transition-all whitespace-nowrap touch-target ${
              activeTab === 'all'
                ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500/50'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300'
            }`}
          >
            All Assets
          </button>
          <button
            onClick={() => setActiveTab('stocks')}
            className={`px-4 md:px-6 py-3 font-medium transition-all whitespace-nowrap touch-target ${
              activeTab === 'stocks'
                ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500/50'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300'
            }`}
          >
            Stocks
          </button>
          <button
            onClick={() => setActiveTab('options')}
            className={`px-4 md:px-6 py-3 font-medium transition-all whitespace-nowrap touch-target ${
              activeTab === 'options'
                ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500/50'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300'
            }`}
          >
            Options
          </button>
          <button
            onClick={() => setActiveTab('crypto')}
            className={`px-4 md:px-6 py-3 font-medium transition-all whitespace-nowrap touch-target ${
              activeTab === 'crypto'
                ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500/50'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300'
            }`}
          >
            Crypto
          </button>
          <button
            onClick={() => setActiveTab('futures')}
            className={`px-4 md:px-6 py-3 font-medium transition-all whitespace-nowrap touch-target ${
              activeTab === 'futures'
                ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500/50'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300'
            }`}
          >
            Futures
          </button>
        </div>

        {/* Content */}
        <div className="p-4 md:p-6">
          {isLoading ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="h-32 bg-slate-100 dark:bg-slate-800/30 rounded-xl animate-pulse" />
                <div className="h-32 bg-slate-100 dark:bg-slate-800/30 rounded-xl animate-pulse" />
                <div className="h-32 bg-slate-100 dark:bg-slate-800/30 rounded-xl animate-pulse" />
              </div>
            </div>
          ) : hasData ? (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <MetricCard
                  title="Average Win"
                  value={formatValue(displayMetrics?.averageGain, true)}
                  description="Average profit per winning trade"
                  positive={displayMetrics?.averageGain !== undefined && displayMetrics.averageGain > 0}
                  theme={theme}
                />
                <MetricCard
                  title="Average Loss"
                  value={formatValue(displayMetrics?.averageLoss, true)}
                  description="Average loss per losing trade"
                  positive={false}
                  theme={theme}
                />
                <MetricCard
                  title="Profit Factor"
                  value={formatValue(displayMetrics?.profitFactor)}
                  description="Ratio of gross profit to gross loss"
                  positive={displayMetrics?.profitFactor !== undefined && displayMetrics.profitFactor >= 1}
                  theme={theme}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <MetricCard
                  title="Win Rate"
                  value={formatValue(displayMetrics?.winRate, false, true)}
                  description={`${displayMetrics?.winningTrades || 0}/${displayMetrics?.losingTrades || 0} (W/L)`}
                  positive={(displayMetrics?.winRate || 0) >= 50}
                  theme={theme}
                />
                <MetricCard
                  title="Total Trades"
                  value={(displayMetrics?.totalTrades || 0).toString()}
                  description={`${displayMetrics?.winningTrades || 0} winning, ${displayMetrics?.losingTrades || 0} losing`}
                  theme={theme}
                />
                <MetricCard
                  title="Total P/L"
                  value={formatValue((displayMetrics?.totalGains || 0) - (displayMetrics?.totalLosses || 0), true)}
                  description={`${formatCurrency(displayMetrics?.totalGains || 0)} gains, ${formatCurrency(displayMetrics?.totalLosses || 0)} losses`}
                  positive={((displayMetrics?.totalGains || 0) - (displayMetrics?.totalLosses || 0)) >= 0}
                  theme={theme}
                />
              </div>

              {activeTab === 'futures' ? (
                // Futures-specific layout
                <>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    <MetricCard
                      title="Realized P&L"
                      value={formatValue(displayMetrics.realizedPL, true)}
                      description="Total realized profit/loss from closed positions"
                      positive={displayMetrics.realizedPL !== undefined && displayMetrics.realizedPL >= 0}
                      theme={theme}
                    />
                    <MetricCard
                      title="Avg P&L per Trade"
                      value={formatValue(displayMetrics.averagePLPerTrade, true)}
                      description="Average profit/loss per completed trade"
                      positive={displayMetrics.averagePLPerTrade !== undefined && displayMetrics.averagePLPerTrade >= 0}
                      theme={theme}
                    />
                    <MetricCard
                      title="ROI"
                      value={formatValue(displayMetrics.roi, false, true)}
                      description="Return on investment percentage"
                      positive={displayMetrics.roi !== undefined && displayMetrics.roi >= 0}
                      theme={theme}
                    />
                  </div>
                </>
              ) : activeTab === 'all' ? (
                // All Assets tab layout
                <>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    <MetricCard
                      title="Realized P&L"
                      value={formatValue(displayMetrics.realizedPL, true)}
                      description="Total realized profit/loss from closed positions"
                      positive={displayMetrics.realizedPL !== undefined && displayMetrics.realizedPL >= 0}
                      theme={theme}
                    />
                    <MetricCard
                      title="Unrealized P&L"
                      value={formatValue(displayMetrics.unrealizedPL, true)}
                      description="Total unrealized profit/loss from open positions"
                      positive={displayMetrics.unrealizedPL !== undefined && displayMetrics.unrealizedPL >= 0}
                      theme={theme}
                    />
                    <MetricCard
                      title="Current Balance"
                      value={formatValue(displayMetrics.currentBalance, true)}
                      description="Current portfolio balance"
                      theme={theme}
                    />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    <MetricCard
                      title="Avg P&L per Trade"
                      value={formatValue(displayMetrics.averagePLPerTrade, true)}
                      description="Average profit/loss per completed trade"
                      positive={displayMetrics.averagePLPerTrade !== undefined && displayMetrics.averagePLPerTrade >= 0}
                      theme={theme}
                    />
                    <MetricCard
                      title="ROI"
                      value={formatValue(displayMetrics.roi, false, true)}
                      description="Return on investment percentage"
                      positive={displayMetrics.roi !== undefined && displayMetrics.roi >= 0}
                      theme={theme}
                    />
                    <MetricCard
                      title="Net Gain"
                      value={formatValue(displayMetrics.realizedPL + displayMetrics.unrealizedPL, true)}
                      description="Total P&L (realized + unrealized)"
                      positive={(displayMetrics.realizedPL + displayMetrics.unrealizedPL) >= 0}
                      theme={theme}
                    />
                  </div>
                </>
              ) : (
                // Other tabs layout (Options, Stocks, Crypto)
                <>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    <MetricCard
                      title="Realized P&L"
                      value={formatValue(displayMetrics.realizedPL, true)}
                      description="Total realized profit/loss from closed positions"
                      positive={displayMetrics.realizedPL !== undefined && displayMetrics.realizedPL >= 0}
                      theme={theme}
                    />
                    <MetricCard
                      title="Unrealized P&L"
                      value={formatValue(displayMetrics.unrealizedPL, true)}
                      description="Total unrealized profit/loss from open positions"
                      positive={displayMetrics.unrealizedPL !== undefined && displayMetrics.unrealizedPL >= 0}
                      theme={theme}
                    />
                    <MetricCard
                      title="Net Gain"
                      value={formatValue(displayMetrics.realizedPL + displayMetrics.unrealizedPL, true)}
                      description="Total P&L (realized + unrealized)"
                      positive={(displayMetrics.realizedPL + displayMetrics.unrealizedPL) >= 0}
                      theme={theme}
                    />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    <MetricCard
                      title="Avg P&L per Trade"
                      value={formatValue(displayMetrics.averagePLPerTrade, true)}
                      description="Average profit/loss per completed trade"
                      positive={displayMetrics.averagePLPerTrade !== undefined && displayMetrics.averagePLPerTrade >= 0}
                      theme={theme}
                    />
                    <MetricCard
                      title="ROI"
                      value={formatValue(displayMetrics.roi, false, true)}
                      description="Return on investment percentage"
                      positive={displayMetrics.roi !== undefined && displayMetrics.roi >= 0}
                      theme={theme}
                    />
                    <MetricCard
                      title="Avg Holding Period"
                      value={formatValue(displayMetrics.averageHoldingPeriodDays)}
                      description={`${displayMetrics.averageHoldingPeriodDays.toFixed(1)} days average`}
                      theme={theme}
                    />
                  </div>
                </>
              )}

              <div className={`grid gap-6 mb-8 ${activeTab === 'futures' || activeTab === 'all' ? 'grid-cols-1 lg:grid-cols-4' : 'grid-cols-1 lg:grid-cols-3'}`}>
                <MetricCard
                  title="Largest Win"
                  value={formatValue(displayMetrics.largestWin, true)}
                  description="Biggest winning trade"
                  positive={displayMetrics.largestWin !== undefined && displayMetrics.largestWin > 0}
                  theme={theme}
                />
                <MetricCard
                  title="Largest Loss"
                  value={formatValue(displayMetrics.largestLoss, true)}
                  description="Biggest losing trade"
                  positive={false}
                  theme={theme}
                />
                <MetricCard
                  title="Expectancy"
                  value={formatValue(displayMetrics.expectancy, true)}
                  description="Expected value per trade"
                  positive={displayMetrics.expectancy !== undefined && displayMetrics.expectancy >= 0}
                  theme={theme}
                />
                {(activeTab === 'futures' || activeTab === 'all') && (
                  <MetricCard
                    title="Avg Holding Period"
                    value={formatValue(displayMetrics.averageHoldingPeriodDays)}
                    description={`${displayMetrics.averageHoldingPeriodDays.toFixed(1)} days average`}
                    theme={theme}
                  />
                )}
              </div>

              {/* P&L Over Time and Drawdown Charts */}
              <div className={`grid gap-6 mb-8 ${activeTab === 'all' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
                <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/50 dark:to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-800/50 p-6 min-h-[350px] shadow-sm dark:shadow-none">
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-6">
                    P&L Over Time
                  </h3>
                  <div className="w-full" style={{ minHeight: '300px' }}>
                    <PLOverTimeChart data={plOverTimeData} isLoading={isLoadingPLOverTime} />
                  </div>
                </div>
                {activeTab === 'all' && (
                  <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/50 dark:to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-800/50 p-6 min-h-[350px] shadow-sm dark:shadow-none">
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-6">
                      Drawdown Over Time
                    </h3>
                    <div className="w-full" style={{ minHeight: '300px' }}>
                      <DrawdownChart data={drawdownData} isLoading={isLoadingDrawdown} />
                    </div>
                  </div>
                )}
              </div>

              {/* Balance Over Time and ROI % Over Time Charts */}
              {activeTab === 'all' ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                  <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/50 dark:to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-800/50 p-6 min-h-[350px] shadow-sm dark:shadow-none">
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-6">
                      Balance Over Time
                    </h3>
                    <div className="w-full" style={{ minHeight: '300px' }}>
                      <BalanceOverTimeChart data={balanceOverTimeData} isLoading={isLoadingBalanceOverTime} />
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/50 dark:to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-800/50 p-6 min-h-[350px] shadow-sm dark:shadow-none">
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-6">
                      ROI % Over Time
                    </h3>
                    <div className="w-full" style={{ minHeight: '300px' }}>
                      <ROIOverTimeChart data={roiOverTimeData} isLoading={isLoadingROIOverTime} />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 mb-8">
                  <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/50 dark:to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-800/50 p-6 min-h-[350px] shadow-sm dark:shadow-none">
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-6">
                      ROI % Over Time
                    </h3>
                    <div className="w-full" style={{ minHeight: '300px' }}>
                      <ROIOverTimeChart data={roiOverTimeData} isLoading={isLoadingROIOverTime} />
                    </div>
                  </div>
                </div>
              )}

              {/* Daily Performance Calendar (All Assets Tab Only) */}
              {activeTab === 'all' && (
                <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/50 dark:to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-800/50 p-6 mb-8 shadow-sm dark:shadow-none">
                  <DailyPerformanceCalendar
                    data={dailyCalendarData}
                    isLoading={isLoadingDailyCalendar}
                    userId={userId}
                    assetType={assetType}
                  />
                </div>
              )}

              {/* Last 7 Days P&L and Win/Loss Distribution */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/50 dark:to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-800/50 p-6 min-h-[300px] shadow-sm dark:shadow-none">
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-6">
                    Last 7 Days P&L
                  </h3>
                  <div className="w-full" style={{ minHeight: '250px' }}>
                    <Last7DaysPLChart data={last7DaysData} isLoading={isLoadingLast7Days} />
                  </div>
                </div>
                <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/50 dark:to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-800/50 p-6 min-h-[300px] shadow-sm dark:shadow-none">
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-6">
                    Win/Loss Distribution
                  </h3>
                  <div className="w-full" style={{ minHeight: '250px' }}>
                    <WinLossDistributionChart
                      winningTrades={displayMetrics.winningTrades}
                      losingTrades={displayMetrics.losingTrades}
                      isLoading={isLoading}
                    />
                  </div>
                </div>
              </div>

              {/* Top Symbols P&L Chart */}
              <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/50 dark:to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-800/50 p-6 mb-8 min-h-[350px] shadow-sm dark:shadow-none">
                <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-6">
                  Top Symbols P&L
                </h3>
                <div className="w-full" style={{ minHeight: '300px' }}>
                  <TopSymbolsPLChart data={symbolPerformance} isLoading={isLoadingSymbols} limit={10} />
                </div>
              </div>

              {/* P&L by Day of Week */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/50 dark:to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-800/50 p-6 min-h-[300px] shadow-sm dark:shadow-none">
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-6">
                    P&L by Day of Week
                  </h3>
                  <div className="w-full" style={{ minHeight: '250px' }}>
                    <DayOfWeekChart data={dayOfWeekData} isLoading={isLoadingDayOfWeek} showWinRate={false} />
                  </div>
                </div>
                <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/50 dark:to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-800/50 p-6 min-h-[300px] shadow-sm dark:shadow-none">
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-6">
                    Win Rate by Day of Week
                  </h3>
                  <div className="w-full" style={{ minHeight: '250px' }}>
                    <DayOfWeekChart data={dayOfWeekData} isLoading={isLoadingDayOfWeek} showWinRate={true} />
                  </div>
                </div>
              </div>

              {/* Options-Specific Charts (Options Tab Only) */}
              {activeTab === 'options' && optionsByTypeData && (
                <>
                  {/* Call vs Put Distribution and P&L */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/50 dark:to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-800/50 p-6 min-h-[300px] shadow-sm dark:shadow-none">
                      <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-6">
                        Call vs Put Distribution
                      </h3>
                      <div className="chart-container">
                        <CallPutChart
                          data={optionsByTypeData}
                          isLoading={isLoadingOptionsByType}
                          chartType="donut"
                          metric="distribution"
                        />
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/50 dark:to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-800/50 p-6 min-h-[300px] shadow-sm dark:shadow-none">
                      <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-6">
                        P&L by Call/Put
                      </h3>
                      <div className="chart-container">
                        <CallPutChart
                          data={optionsByTypeData}
                          isLoading={isLoadingOptionsByType}
                          chartType="bar"
                          metric="pl"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Win Rate by Call/Put */}
                  <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/50 dark:to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-800/50 p-6 mb-8 min-h-[300px] shadow-sm dark:shadow-none">
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-6">
                      Win Rate by Call/Put
                    </h3>
                    <div className="chart-container">
                      <CallPutChart
                        data={optionsByTypeData}
                        isLoading={isLoadingOptionsByType}
                        chartType="bar"
                        metric="winRate"
                      />
                    </div>
                  </div>

                  {/* Expiration Status Analysis */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/50 dark:to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-800/50 p-6 min-h-[300px] shadow-sm dark:shadow-none">
                      <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-6">
                        Expiration Status Distribution
                      </h3>
                      <div className="chart-container">
                        <ExpirationStatusChart
                          data={expirationStatusData!}
                          isLoading={isLoadingExpirationStatus}
                          chartType="donut"
                          metric="distribution"
                        />
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/50 dark:to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-800/50 p-6 min-h-[300px] shadow-sm dark:shadow-none">
                      <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-6">
                        P&L by Expiration Status
                      </h3>
                      <div className="chart-container">
                        <ExpirationStatusChart
                          data={expirationStatusData!}
                          isLoading={isLoadingExpirationStatus}
                          chartType="bar"
                          metric="pl"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Win Rate by Expiration Status */}
                  <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/50 dark:to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-800/50 p-6 mb-8 min-h-[300px] shadow-sm dark:shadow-none">
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-6">
                      Win Rate by Expiration Status
                    </h3>
                    <div className="chart-container">
                      <ExpirationStatusChart
                        data={expirationStatusData!}
                        isLoading={isLoadingExpirationStatus}
                        chartType="bar"
                        metric="winRate"
                      />
                    </div>
                  </div>

                  {/* Days to Expiration Analysis */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/50 dark:to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-800/50 p-6 min-h-[300px] shadow-sm dark:shadow-none">
                      <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-6">
                        P&L by Days to Expiration
                      </h3>
                      <div className="chart-container">
                        <DaysToExpirationChart
                          data={daysToExpirationData}
                          isLoading={isLoadingDaysToExpiration}
                          showWinRate={false}
                        />
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/50 dark:to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-800/50 p-6 min-h-[300px] shadow-sm dark:shadow-none">
                      <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-6">
                        Win Rate by Days to Expiration
                      </h3>
                      <div className="chart-container">
                        <DaysToExpirationChart
                          data={daysToExpirationData}
                          isLoading={isLoadingDaysToExpiration}
                          showWinRate={true}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Strategy Analysis */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/50 dark:to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-800/50 p-6 min-h-[300px] shadow-sm dark:shadow-none">
                      <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-6">
                        Strategy Distribution
                      </h3>
                      <div className="chart-container">
                        <StrategyChart
                          data={strategyPerformanceData}
                          isLoading={isLoadingStrategyPerformance}
                          chartType="donut"
                          metric="distribution"
                        />
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/50 dark:to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-800/50 p-6 min-h-[300px] shadow-sm dark:shadow-none">
                      <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-6">
                        P&L by Strategy
                      </h3>
                      <div className="chart-container">
                        <StrategyChart
                          data={strategyPerformanceData}
                          isLoading={isLoadingStrategyPerformance}
                          chartType="bar"
                          metric="pl"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Win Rate and Profit on Risk by Strategy */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/50 dark:to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-800/50 p-6 min-h-[300px] shadow-sm dark:shadow-none">
                      <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-6">
                        Win Rate by Strategy
                      </h3>
                      <div className="chart-container">
                        <StrategyChart
                          data={strategyPerformanceData}
                          isLoading={isLoadingStrategyPerformance}
                          chartType="bar"
                          metric="winRate"
                        />
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/50 dark:to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-800/50 p-6 min-h-[300px] shadow-sm dark:shadow-none">
                      <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-6">
                        Profit on Risk by Strategy
                      </h3>
                      <div className="chart-container">
                        <StrategyChart
                          data={strategyPerformanceData}
                          isLoading={isLoadingStrategyPerformance}
                          chartType="bar"
                          metric="profitOnRisk"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Entry Time Analysis by Strategy (Options) */}
                  {entryTimeByStrategyData && Object.keys(entryTimeByStrategyData).length > 0 && (
                    <div className="mb-8">
                      <h3 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-6">
                        P&L by Entry Time (by Strategy)
                      </h3>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {Object.entries(entryTimeByStrategyData)
                          .filter(([, data]) => data.length > 0)
                          .map(([strategyType, data]) => {
                            const strategyName = strategyType
                              .split('_')
                              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                              .join(' ');
                            return (
                              <div
                                key={strategyType}
                                className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/50 dark:to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-800/50 p-6 shadow-sm dark:shadow-none"
                              >
                                <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
                                  {strategyName} P&L by Entry Time
                                </h4>
                                <div className="chart-container">
                                  <EntryTimeChart
                                    data={data}
                                    isLoading={isLoadingEntryTimeByStrategy}
                                    showWinRate={false}
                                  />
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {/* Entry Time Analysis (Options) */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/50 dark:to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-800/50 p-6 min-h-[300px] shadow-sm dark:shadow-none">
                      <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-6">
                        P&L by Entry Time
                      </h3>
                      <div className="chart-container">
                        <EntryTimeChart
                          data={optionsEntryTimeData}
                          isLoading={isLoadingOptionsEntryTime}
                          showWinRate={false}
                        />
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/50 dark:to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-800/50 p-6 min-h-[300px] shadow-sm dark:shadow-none">
                      <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-6">
                        Win Rate by Entry Time
                      </h3>
                      <div className="chart-container">
                        <EntryTimeChart
                          data={optionsEntryTimeData}
                          isLoading={isLoadingOptionsEntryTime}
                          showWinRate={true}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Stocks-Specific Charts (Stocks Tab Only) */}
              {activeTab === 'stocks' && (
                <>
                  {/* Holding Period Distribution */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/50 dark:to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-800/50 p-6 min-h-[300px] shadow-sm dark:shadow-none">
                      <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-6">
                        P&L by Holding Period
                      </h3>
                      <div className="chart-container">
                        <HoldingPeriodChart
                          data={stocksHoldingPeriodData}
                          isLoading={isLoadingStocksHoldingPeriod}
                          showWinRate={false}
                        />
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/50 dark:to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-800/50 p-6 min-h-[300px] shadow-sm dark:shadow-none">
                      <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-6">
                        Win Rate by Holding Period
                      </h3>
                      <div className="chart-container">
                        <HoldingPeriodChart
                          data={stocksHoldingPeriodData}
                          isLoading={isLoadingStocksHoldingPeriod}
                          showWinRate={true}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Futures-Specific Charts (Futures Tab Only) */}
              {activeTab === 'futures' && (
                <>
                  {/* Entry Time Analysis (Futures) */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/50 dark:to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-800/50 p-6 min-h-[300px] shadow-sm dark:shadow-none">
                      <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-6">
                        P&L by Entry Time
                      </h3>
                      <div className="chart-container">
                        <EntryTimeChart
                          data={futuresEntryTimeData}
                          isLoading={isLoadingFuturesEntryTime}
                          showWinRate={false}
                        />
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/50 dark:to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-800/50 p-6 min-h-[300px] shadow-sm dark:shadow-none">
                      <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-6">
                        Win Rate by Entry Time
                      </h3>
                      <div className="chart-container">
                        <EntryTimeChart
                          data={futuresEntryTimeData}
                          isLoading={isLoadingFuturesEntryTime}
                          showWinRate={true}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Contract Month Performance */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/50 dark:to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-800/50 p-6 min-h-[300px] shadow-sm dark:shadow-none">
                      <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-6">
                        P&L by Contract Month
                      </h3>
                      <div className="chart-container">
                        <FuturesContractMonthChart
                          data={futuresContractMonthData}
                          isLoading={isLoadingFuturesContractMonth}
                          showWinRate={false}
                        />
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/50 dark:to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-800/50 p-6 min-h-[300px] shadow-sm dark:shadow-none">
                      <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-6">
                        Win Rate by Contract Month
                      </h3>
                      <div className="chart-container">
                        <FuturesContractMonthChart
                          data={futuresContractMonthData}
                          isLoading={isLoadingFuturesContractMonth}
                          showWinRate={true}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Margin Efficiency */}
                  <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/50 dark:to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-800/50 p-6 mb-8 min-h-[300px] shadow-sm dark:shadow-none">
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-6">
                      Margin Efficiency by Symbol
                    </h3>
                    <div className="chart-container">
                      <FuturesMarginEfficiencyChart
                        data={futuresMarginEfficiencyData}
                        isLoading={isLoadingFuturesMarginEfficiency}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Crypto-Specific Charts (Crypto Tab Only) */}
              {activeTab === 'crypto' && (
                <>
                  {/* Coin Performance */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/50 dark:to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-800/50 p-6 min-h-[300px] shadow-sm dark:shadow-none">
                      <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-6">
                        P&L by Coin
                      </h3>
                      <div className="chart-container">
                        <CryptoCoinChart
                          data={cryptoCoinData}
                          isLoading={isLoadingCryptoCoin}
                          showWinRate={false}
                        />
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/50 dark:to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-800/50 p-6 min-h-[300px] shadow-sm dark:shadow-none">
                      <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-6">
                        Win Rate by Coin
                      </h3>
                      <div className="chart-container">
                        <CryptoCoinChart
                          data={cryptoCoinData}
                          isLoading={isLoadingCryptoCoin}
                          showWinRate={true}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Holding Period Distribution */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/50 dark:to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-800/50 p-6 min-h-[300px] shadow-sm dark:shadow-none">
                      <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-6">
                        P&L by Holding Period
                      </h3>
                      <div className="chart-container">
                        <HoldingPeriodChart
                          data={cryptoHoldingPeriodData}
                          isLoading={isLoadingCryptoHoldingPeriod}
                          showWinRate={false}
                        />
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/50 dark:to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-800/50 p-6 min-h-[300px] shadow-sm dark:shadow-none">
                      <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-6">
                        Win Rate by Holding Period
                      </h3>
                      <div className="chart-container">
                        <HoldingPeriodChart
                          data={cryptoHoldingPeriodData}
                          isLoading={isLoadingCryptoHoldingPeriod}
                          showWinRate={true}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Performance by Symbol */}
                <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/50 dark:to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-800/50 p-6 shadow-sm dark:shadow-none">
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-6">
                    Performance by Symbol
                  </h3>
                  {isLoadingSymbols ? (
                    <div className="h-64 flex items-center justify-center">
                      <div className="text-slate-500 dark:text-slate-400 text-sm">Loading...</div>
                    </div>
                  ) : symbolPerformance.length > 0 ? (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {symbolPerformance.slice(0, 10).map((symbol) => (
                        <div
                          key={symbol.symbol}
                          className="flex items-center justify-between p-4 bg-slate-100 dark:bg-slate-800/30 rounded-xl border border-slate-200 dark:border-slate-800/50 hover:border-emerald-500/30 transition-all"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                              <span className="font-semibold text-slate-900 dark:text-slate-100">{symbol.symbol}</span>
                              <span className={`text-xs px-2 py-0.5 rounded ${
                                symbol.winRate >= 50
                                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                  : 'bg-red-500/20 text-red-600 dark:text-red-400'
                              }`}>
                                {symbol.winRate.toFixed(1)}% WR
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-500">
                              {symbol.totalTrades} trades • {symbol.winningTrades}W / {symbol.losingTrades}L
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`font-semibold ${
                              symbol.totalPL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                            }`}>
                              {formatCurrency(symbol.totalPL)}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-500">
                              Avg: {formatCurrency(symbol.averagePL)}
                            </div>
                          </div>
                        </div>
                      ))}
                      {symbolPerformance.length > 10 && (
                        <div className="text-center text-sm text-slate-500 dark:text-slate-500 pt-2">
                          Showing top 10 of {symbolPerformance.length} symbols
                        </div>
                      )}
                    </div>
                  ) : (
                    <EmptyAnalytics />
                  )}
                </div>

                {/* Monthly Performance */}
                <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/50 dark:to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-800/50 p-6 relative overflow-hidden shadow-sm dark:shadow-none">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl" />
                  <div className="relative">
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-6">
                      Monthly Performance
                    </h3>
                    {isLoadingMonthly ? (
                      <div className="h-64 flex items-center justify-center">
                        <div className="text-slate-500 dark:text-slate-400 text-sm">Loading...</div>
                      </div>
                    ) : monthlyPerformance.length > 0 ? (
                      <div className="space-y-4">
                        {/* Simple bar chart representation */}
                        <div className="h-64 flex flex-col justify-between">
                          {monthlyPerformance.slice().reverse().map((month) => {
                            const maxPL = Math.max(...monthlyPerformance.map(m => Math.abs(m.totalPL)), 1);
                            const barWidth = (Math.abs(month.totalPL) / maxPL) * 100;
                            const isPositive = month.totalPL >= 0;
                            
                            return (
                              <div key={month.month} className="flex items-center gap-3">
                                <div className="w-20 text-xs text-slate-600 dark:text-slate-400 text-right">
                                  {month.monthLabel}
                                </div>
                                <div className="flex-1 relative h-8 bg-slate-200 dark:bg-slate-800/50 rounded-lg overflow-hidden">
                                  <div
                                    className={`absolute top-0 left-0 h-full transition-all ${
                                      isPositive ? 'bg-emerald-500/30' : 'bg-red-500/30'
                                    }`}
                                    style={{ width: `${barWidth}%` }}
                                  />
                                  <div className="absolute inset-0 flex items-center justify-between px-3">
                                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                      {month.totalTrades} trades
                                    </span>
                                    <span className={`text-xs font-semibold ${
                                      isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                                    }`}>
                                      {formatCurrency(month.totalPL)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {/* Summary stats */}
                        <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-200 dark:border-slate-800/50">
                          <div className="text-center">
                            <div className="text-xs text-slate-500 dark:text-slate-500 mb-1">Best Month</div>
                            <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                              {monthlyPerformance.length > 0
                                ? monthlyPerformance.reduce((best, m) => 
                                    m.totalPL > best.totalPL ? m : best
                                  ).monthLabel
                                : '—'}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-slate-500 dark:text-slate-500 mb-1">Worst Month</div>
                            <div className="text-sm font-semibold text-red-600 dark:text-red-400">
                              {monthlyPerformance.length > 0
                                ? monthlyPerformance.reduce((worst, m) => 
                                    m.totalPL < worst.totalPL ? m : worst
                                  ).monthLabel
                                : '—'}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-slate-500 dark:text-slate-500 mb-1">Avg Monthly</div>
                            <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                              {monthlyPerformance.length > 0
                                ? formatCurrency(
                                    monthlyPerformance.reduce((sum, m) => sum + m.totalPL, 0) / monthlyPerformance.length
                                  )
                                : '—'}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="h-64 flex items-center justify-center border border-slate-200 dark:border-slate-800/50 rounded-xl bg-slate-50 dark:bg-slate-950/30">
                        <div className="text-center">
                          <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 flex items-center justify-center">
                            <TrendingUp className="w-6 h-6 text-emerald-400" />
                          </div>
                          <p className="text-slate-500 dark:text-slate-400 text-sm">No monthly data available</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="py-12">
              <EmptyAnalytics />
            </div>
          )}
        </div>
      </div>

      {/* Custom Date Range Modal */}
      <CustomDateRangeModal
        isOpen={showDateRangeModal}
        onClose={() => setShowDateRangeModal(false)}
        onApply={handleCustomRangeApply}
        initialRange={customDateRange || undefined}
      />
    </div>
  );
};

