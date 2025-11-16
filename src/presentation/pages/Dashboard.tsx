import { useMemo, memo, useCallback } from 'react';
import { DollarSign, TrendingUp, Activity, PieChart, Award, Newspaper, ExternalLink, LineChart, Bitcoin, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/application/stores/auth.store';
import { usePositionStatistics, usePositions } from '@/application/hooks/usePositions';
import { useTransactions } from '@/application/hooks/useTransactions';
import { usePortfolioValue } from '@/application/hooks/usePortfolioValue';
import { useMarketNews } from '@/application/hooks/useMarketNews';
import { useStockQuotes } from '@/application/hooks/useStockQuotes';
import { formatDate } from '@/shared/utils/dateUtils';
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

export const Dashboard = () => {
  const user = useAuthStore((state) => state.user);
  const userId = user?.id || 'demo-user';

  const { data: positionStats, isLoading: statsLoading, error: statsError } = usePositionStatistics(userId);
  const { data: transactions, isLoading: transactionsLoading, error: transactionsError } = useTransactions(userId);
  const { data: allPositions, isLoading: positionsLoading, error: positionsError } = usePositions(userId);
  const { portfolioValue, netCashFlow, unrealizedPL: portfolioUnrealizedPL, isLoading: portfolioLoading, error: portfolioError } = usePortfolioValue(userId);
  const { articles: marketNews = [], isLoading: newsLoading, error: newsError } = useMarketNews('general', undefined, true);

  const realizedPL = positionStats?.totalRealizedPL || 0;
  const unrealizedPL = portfolioUnrealizedPL; // Use calculated unrealized P&L from all open positions
  const totalOpenPositions = positionStats?.open || 0;
  
  // Use net cash flow for cash balance display
  const cashBalance = netCashFlow || 0;

  // Get open positions by asset type
  const openPositions = useMemo(() => {
    if (!allPositions) return [];
    return allPositions.filter((p: Position) => p.status === 'open');
  }, [allPositions]);

  // Get unique symbols from positions for quotes
  const positionSymbols = useMemo(() => {
    const symbols = new Set<string>();
    openPositions.forEach((p: Position) => {
      if (p.symbol) symbols.add(p.symbol);
    });
    return Array.from(symbols);
  }, [openPositions]);

  // Fetch quotes for positions
  const { data: quotesData } = useStockQuotes(positionSymbols, positionSymbols.length > 0);
  const quotes = useMemo(() => {
    if (!quotesData) return {};
    // Handle both array and record formats
    if (Array.isArray(quotesData)) {
      const quotesRecord: Record<string, any> = {};
      quotesData.forEach((quote: any) => {
        if (quote?.symbol) quotesRecord[quote.symbol] = quote;
      });
      return quotesRecord;
    }
    return quotesData as Record<string, any>;
  }, [quotesData]);

  // Calculate asset type breakdown
  const assetBreakdown = useMemo(() => {
    const breakdown = {
      stocks: 0,
      options: 0,
      crypto: 0,
      futures: 0,
      cash: 1, // Always 1 cash account
    };

    openPositions.forEach((p: Position) => {
      if (p.asset_type === 'stock') breakdown.stocks++;
      else if (p.asset_type === 'option') breakdown.options++;
      else if (p.asset_type === 'crypto') breakdown.crypto++;
      else if (p.asset_type === 'futures') breakdown.futures++;
    });

    return breakdown;
  }, [openPositions]);

  // Calculate top performing positions with details
  const topPositions = useMemo(() => {
    if (!openPositions || openPositions.length === 0) return [];

    return openPositions
      .map((p: Position) => {
        const quote = quotes[p.symbol];
        const currentPrice = quote?.price || p.average_opening_price || 0;
        const marketValue = (p.current_quantity || 0) * currentPrice;
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
  }, [openPositions, quotes]);

  // Calculate asset allocation for pie chart
  const assetAllocation = useMemo(() => {
    if (!openPositions || openPositions.length === 0) return [];

    const allocation = new Map<string, number>();
    
    openPositions.forEach((p: Position) => {
      const quote = quotes[p.symbol];
      const currentPrice = quote?.price || p.average_opening_price || 0;
      const marketValue = (p.current_quantity || 0) * currentPrice;
      const assetType = p.asset_type.charAt(0).toUpperCase() + p.asset_type.slice(1);
      allocation.set(assetType, (allocation.get(assetType) || 0) + marketValue);
    });

    const total = Array.from(allocation.values()).reduce((sum, val) => sum + val, 0);
    if (total === 0) return [];

    return Array.from(allocation.entries())
      .map(([name, value]) => ({
        name,
        value: Number(value.toFixed(2)),
        percent: Number(((value / total) * 100).toFixed(1)),
      }))
      .sort((a, b) => b.value - a.value);
  }, [openPositions, quotes]);

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
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-slate-500 mt-2 text-lg">
            Portfolio overview and key metrics
          </p>
        </div>
        <RealtimeIndicator
          queryKey={['portfolio', userId]}
          lastUpdated={new Date()}
          showRefreshButton={true}
        />
      </div>

      {/* Error Display */}
      {(portfolioError || statsError || positionsError) && (
        <InlineError
          message={getUserFriendlyErrorMessage(portfolioError || statsError || positionsError)}
          onRetry={isRetryableError(portfolioError || statsError || positionsError) ? () => window.location.reload() : undefined}
        />
      )}

      {/* Top Row - Key Financial Metrics (5 Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {portfolioLoading || statsLoading ? (
          <StatCardSkeleton count={5} />
        ) : (
          <>
            <StatCard
              title="Portfolio Value"
              value={formatCurrency(portfolioValue)}
              icon={DollarSign}
              iconColor="text-blue-400"
              bgColor="bg-blue-500/10"
            />
            <StatCard
              title="Cash Balance"
              value={formatCurrency(cashBalance)}
              icon={DollarSign}
              iconColor="text-emerald-400"
              bgColor="bg-emerald-500/10"
            />
            <StatCard
              title="Realized P&L"
              value={`${realizedPL >= 0 ? '+' : ''}${formatCurrency(realizedPL)}`}
              icon={TrendingUp}
              iconColor={realizedPL >= 0 ? 'text-emerald-400' : 'text-red-400'}
              bgColor={realizedPL >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'}
              subtitle={realizedPL >= 0 ? '+0.00%' : '-0.00%'}
            />
            <StatCard
              title="Unrealized P&L"
              value={`${unrealizedPL >= 0 ? '+' : ''}${formatCurrency(unrealizedPL)}`}
              icon={TrendingUp}
              iconColor={unrealizedPL >= 0 ? 'text-emerald-400' : 'text-red-400'}
              bgColor={unrealizedPL >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'}
              subtitle=""
            />
            <StatCard
              title="Open Positions"
              value={totalOpenPositions.toString()}
              icon={Activity}
              iconColor="text-blue-400"
              bgColor="bg-blue-500/10"
              subtitle={`${allPositions?.length || 0} total`}
            />
          </>
        )}
      </div>

      {/* Asset Type Breakdown (5 Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <AssetTypeCard
          title="Stocks"
          count={assetBreakdown.stocks}
          icon={LineChart}
        />
        <AssetTypeCard
          title="Options"
          count={assetBreakdown.options}
          icon={Zap}
        />
        <AssetTypeCard
          title="Crypto"
          count={assetBreakdown.crypto}
          icon={Bitcoin}
        />
        <AssetTypeCard
          title="Futures"
          count={assetBreakdown.futures}
          icon={Zap}
        />
        <AssetTypeCard
          title="Cash"
          count={assetBreakdown.cash}
          icon={DollarSign}
        />
      </div>

      {/* Main Content Area - 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Top Performing Positions */}
        <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-800/50 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-5 h-5 text-emerald-400" />
            <h3 className="text-xl font-semibold text-slate-100">
              Top Performing Positions
            </h3>
          </div>
          {positionsLoading ? (
            <div className="space-y-3">
              <PositionCardSkeleton count={5} />
            </div>
          ) : topPositions.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-slate-400 text-sm">No open positions</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topPositions.map((pos) => (
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

        {/* Right Column - Market Overview */}
        <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-800/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Newspaper className="w-5 h-5 text-emerald-400" />
              <h3 className="text-xl font-semibold text-slate-100">
                Market Overview
              </h3>
            </div>
            <Link
              to="/news"
              className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              View More
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
          {newsLoading ? (
            <ArticleSkeleton count={5} />
          ) : marketNews.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Newspaper className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                <p className="text-slate-400 text-sm">No market news available</p>
                <p className="text-slate-500 text-xs mt-1">Check your Finnhub API key in Settings</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {marketNews.slice(0, 10).map((article) => (
                <NewsArticleCard key={article.id} article={article} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Section - Recent Transactions and Asset Allocation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-800/50 p-6">
          <h3 className="text-xl font-semibold text-slate-100 mb-4">
            Recent Transactions
          </h3>
          {transactionsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/30 animate-pulse">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="h-4 bg-slate-800/50 rounded w-24 mb-2" />
                      <div className="h-3 bg-slate-800/50 rounded w-16" />
                    </div>
                    <div className="text-right">
                      <div className="h-4 bg-slate-800/50 rounded w-20 mb-2" />
                      <div className="h-3 bg-slate-800/50 rounded w-16 ml-auto" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : recentTransactions.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Activity className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                <p className="text-slate-400 text-sm">No transactions yet</p>
                <p className="text-slate-500 text-xs mt-1">Import your trades to see them here</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {recentTransactions.map((tx) => (
                <TransactionItem
                  key={tx.id}
                  id={tx.id}
                  underlying_symbol={tx.underlying_symbol}
                  instrument={tx.instrument}
                  transaction_code={tx.transaction_code}
                  amount={tx.amount}
                  activity_date={tx.activity_date}
                  formatCurrency={formatCurrency}
                />
              ))}
            </div>
          )}
        </div>

        {/* Asset Allocation */}
        <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-800/50 p-6">
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="w-5 h-5 text-emerald-400" />
            <h3 className="text-xl font-semibold text-slate-100">
              Asset Allocation
            </h3>
          </div>
          {positionsLoading ? (
            <div className="h-64 flex items-center justify-center">
              <LoadingSpinner size="lg" text="Loading asset allocation..." />
            </div>
          ) : assetAllocation.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-slate-400 text-sm">No open positions</p>
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
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {assetAllocation.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
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
  <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-800/50 p-6 hover:border-slate-700/50 transition-all">
    <div className="flex items-center justify-between mb-3">
      <span className="text-sm font-medium text-slate-400">{title}</span>
      <div className={`p-2 rounded-lg ${bgColor}`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
    </div>
    <p className="text-2xl font-bold text-slate-100 mb-1">{value}</p>
    {subtitle && (
      <p className="text-xs text-slate-500">{subtitle}</p>
    )}
  </div>
));
StatCard.displayName = 'StatCard';

interface AssetTypeCardProps {
  title: string;
  count: number;
  icon: React.ElementType;
}

const AssetTypeCard = memo(({ title, count, icon: Icon }: AssetTypeCardProps) => (
  <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-800/50 p-4 hover:border-slate-700/50 transition-all">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-slate-400 mb-1">{title}</p>
        <p className="text-2xl font-bold text-slate-100">{count}</p>
      </div>
      <div className="p-2 rounded-lg bg-blue-500/10">
        <Icon className="w-5 h-5 text-blue-400" />
      </div>
    </div>
  </div>
));
AssetTypeCard.displayName = 'AssetTypeCard';
