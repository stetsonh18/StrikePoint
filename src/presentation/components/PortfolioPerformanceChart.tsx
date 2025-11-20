import React, { useState, useMemo, useCallback } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { usePortfolioHistory, type TimePeriod } from '@/application/hooks/usePortfolioHistory';
import { LoadingSpinner } from './LoadingSpinner';
import { formatDate } from '@/shared/utils/dateUtils';
import { useTheme } from '@/shared/theme/useTheme';

interface PortfolioPerformanceChartProps {
  userId: string;
  formatCurrency: (amount: number) => string;
  isExpanded?: boolean;
}

const TIME_PERIODS: { value: TimePeriod; label: string }[] = [
  { value: '1D', label: '1D' },
  { value: '1W', label: '1W' },
  { value: '1M', label: '1M' },
  { value: '3M', label: '3M' },
  { value: '1Y', label: '1Y' },
  { value: 'ALL', label: 'ALL' },
];

export const PortfolioPerformanceChart = React.memo<PortfolioPerformanceChartProps>(({ 
  userId, 
  formatCurrency, 
  isExpanded = false 
}) => {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('ALL');
  const { data: historyData, isLoading, error } = usePortfolioHistory(userId, timePeriod);
  const { theme } = useTheme();

  // Format data for charts
  const chartData = useMemo(() => {
    if (!historyData) return [];
    
    return historyData.map((item) => ({
      date: formatDate(item.date),
      dateValue: item.date,
      portfolioValue: item.portfolioValue,
      netCashFlow: item.netCashFlow,
      totalDeposits: item.totalDeposits,
      realizedPL: item.realizedPL,
      unrealizedPL: item.unrealizedPL,
      totalPL: item.realizedPL + item.unrealizedPL,
    }));
  }, [historyData]);

  // Memoize time period change handler
  const handleTimePeriodChange = useCallback((period: TimePeriod) => {
    setTimePeriod(period);
  }, []);

  // Memoize tooltip formatters
  const portfolioTooltipFormatter = useCallback((value: number, name: string) => {
    if (name === 'portfolioValue') return [formatCurrency(value), 'Portfolio Value'];
    if (name === 'netCashFlow') return [formatCurrency(value), 'Net Cash Flow'];
    if (name === 'totalDeposits') return [formatCurrency(value), 'Total Deposits'];
    return [formatCurrency(value), name];
  }, [formatCurrency]);

  const plTooltipFormatter = useCallback((value: number, name: string) => {
    if (name === 'totalPL') return [`${value >= 0 ? '+' : ''}${formatCurrency(value)}`, 'Total P&L'];
    if (name === 'realizedPL') return [`${value >= 0 ? '+' : ''}${formatCurrency(value)}`, 'Realized P&L'];
    if (name === 'unrealizedPL') return [`${value >= 0 ? '+' : ''}${formatCurrency(value)}`, 'Unrealized P&L'];
    return [`${value >= 0 ? '+' : ''}${formatCurrency(value)}`, name];
  }, [formatCurrency]);

  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading portfolio history..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-64 flex items-center justify-center">
        <p className="text-red-600 dark:text-red-400 text-sm">Error loading portfolio history</p>
      </div>
    );
  }

  if (!chartData || chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 dark:text-slate-400 text-sm mb-2">No portfolio history available</p>
          <p className="text-slate-500 dark:text-slate-500 text-xs">Generate a snapshot to see your portfolio performance over time</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Time Period Selector */}
      <div className="flex items-center gap-2 flex-wrap">
        {TIME_PERIODS.map((period) => (
          <button
            key={period.value}
            onClick={() => handleTimePeriodChange(period.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              timePeriod === period.value
                ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                : 'bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700/50 hover:border-slate-400 dark:hover:border-slate-600/50'
            }`}
          >
            {period.label}
          </button>
        ))}
      </div>

      {/* Two Charts - Side by Side when not expanded, stacked when expanded */}
      <div className={isExpanded ? 'space-y-8' : 'grid grid-cols-1 lg:grid-cols-2 gap-6'}>
        {/* Chart 1: Portfolio Value & Cash Flow */}
        <div className="flex flex-col">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Portfolio Value & Cash Flow</h4>
          <div className={isExpanded ? 'h-[500px]' : 'flex-1 min-h-64'} style={{ minHeight: isExpanded ? '500px' : '256px' }}>
            <ResponsiveContainer width="100%" height="100%" minHeight={isExpanded ? 500 : 256}>
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#334155' : '#cbd5e1'} />
                <XAxis
                  dataKey="date"
                  stroke={theme === 'dark' ? '#64748b' : '#94a3b8'}
                  fontSize={12}
                  tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748b' }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  stroke={theme === 'dark' ? '#64748b' : '#94a3b8'}
                  fontSize={12}
                  tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748b' }}
                  tickFormatter={(value) => formatCurrency(value)}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
                    border: theme === 'dark' ? '1px solid #334155' : '1px solid #e2e8f0',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: theme === 'dark' ? '#e2e8f0' : '#1e293b' }}
                  formatter={portfolioTooltipFormatter}
                />
                <Legend
                  wrapperStyle={{ color: theme === 'dark' ? '#94a3b8' : '#64748b', fontSize: '12px' }}
                  iconType="line"
                />
                <Line
                  type="monotone"
                  dataKey="portfolioValue"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                  name="Portfolio Value"
                />
                <Line
                  type="monotone"
                  dataKey="netCashFlow"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  strokeDasharray="5 5"
                  name="Net Cash Flow"
                />
                <Line
                  type="monotone"
                  dataKey="totalDeposits"
                  stroke="#f59e0b"
                  strokeWidth={1.5}
                  dot={false}
                  strokeDasharray="4 4"
                  name="Total Deposits"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: P&L Breakdown */}
        <div className="flex flex-col">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Profit & Loss</h4>
          <div className={isExpanded ? 'h-[500px]' : 'flex-1 min-h-64'} style={{ minHeight: isExpanded ? '500px' : '256px' }}>
            <ResponsiveContainer width="100%" height="100%" minHeight={isExpanded ? 500 : 256}>
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#334155' : '#cbd5e1'} />
                <XAxis
                  dataKey="date"
                  stroke={theme === 'dark' ? '#64748b' : '#94a3b8'}
                  fontSize={12}
                  tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748b' }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  stroke={theme === 'dark' ? '#64748b' : '#94a3b8'}
                  fontSize={12}
                  tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748b' }}
                  tickFormatter={(value) => `${value >= 0 ? '+' : ''}${formatCurrency(value)}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
                    border: theme === 'dark' ? '1px solid #334155' : '1px solid #e2e8f0',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: theme === 'dark' ? '#e2e8f0' : '#1e293b' }}
                  formatter={plTooltipFormatter}
                />
                <Legend
                  wrapperStyle={{ color: theme === 'dark' ? '#94a3b8' : '#64748b', fontSize: '12px' }}
                  iconType="line"
                />
                <Line
                  type="monotone"
                  dataKey="totalPL"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={false}
                  name="Total P&L"
                />
                <Line
                  type="monotone"
                  dataKey="realizedPL"
                  stroke="#3b82f6"
                  strokeWidth={1.5}
                  dot={false}
                  strokeDasharray="5 5"
                  name="Realized P&L"
                />
                <Line
                  type="monotone"
                  dataKey="unrealizedPL"
                  stroke="#8b5cf6"
                  strokeWidth={1.5}
                  dot={false}
                  strokeDasharray="5 5"
                  name="Unrealized P&L"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
});

PortfolioPerformanceChart.displayName = 'PortfolioPerformanceChart';

