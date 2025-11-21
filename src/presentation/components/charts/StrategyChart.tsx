import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import type { TooltipContentProps } from 'recharts/types/component/Tooltip';
import type { StrategyPerformanceData } from '@/application/hooks/useStrategyPerformance';
import { formatCurrency } from '@/shared/utils/formatUtils';

interface StrategyChartProps {
  data: StrategyPerformanceData[];
  isLoading?: boolean;
  chartType?: 'donut' | 'bar';
  metric?: 'distribution' | 'pl' | 'winRate' | 'profitOnRisk';
}

const STRATEGY_COLORS: Record<string, string> = {
  'single_option': '#3b82f6',
  'vertical_spread': '#8b5cf6',
  'iron_condor': '#ef4444',
  'iron_butterfly': '#f59e0b',
  'butterfly': '#f97316',
  'straddle': '#10b981',
  'strangle': '#06b6d4',
  'calendar_spread': '#ec4899',
  'diagonal_spread': '#6366f1',
  'ratio_spread': '#14b8a6',
  'covered_call': '#84cc16',
  'cash_secured_put': '#a855f7',
  'custom': '#64748b',
};

// Format strategy type name for display
const formatStrategyName = (strategyType: string): string => {
  return strategyType
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const StrategyChart = ({ data, isLoading, chartType = 'donut', metric = 'distribution' }: StrategyChartProps) => {
  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="text-slate-400 text-sm">Loading chart data...</div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="text-slate-400 text-sm text-center">
          <p>No strategy data available</p>
          <p className="text-xs text-slate-500 mt-1">Strategies with closed positions will appear here</p>
        </div>
      </div>
    );
  }

  const totalTrades = data.reduce((sum, s) => sum + s.totalTrades, 0);

  if (totalTrades === 0) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="text-slate-400 text-sm">No trades available</div>
      </div>
    );
  }

  if (chartType === 'donut' && metric === 'distribution') {
    interface PieDataEntry {
      name: string;
      value: number;
      color: string;
    }
    const pieData: PieDataEntry[] = data.map((strategy) => ({
      name: formatStrategyName(strategy.strategyType),
      value: strategy.totalTrades,
      color: STRATEGY_COLORS[strategy.strategyType] || '#64748b',
    }));

    const CustomTooltip = ({ active, payload }: TooltipContentProps<number, string>) => {
      if (active && payload && payload.length) {
        const entry = payload[0];
        const pieEntry = entry.payload as PieDataEntry;
        const percentage = ((entry.value ?? 0) / totalTrades) * 100;
        return (
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-xl">
            <p className="text-sm font-semibold" style={{ color: pieEntry.color }}>
              {entry.name}
            </p>
            <p className="text-sm text-slate-300">
              {entry.value} trades ({percentage.toFixed(1)}%)
            </p>
          </div>
        );
      }
      return null;
    };

    const renderLabel = (entry: PieDataEntry) => {
      const percentage = ((entry.value / totalTrades) * 100).toFixed(1);
      return `${percentage}%`;
    };

    return (
      <ResponsiveContainer width="100%" height={250} minHeight={200}>
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderLabel}
            outerRadius={80}
            innerRadius={40}
            fill="#8884d8"
            dataKey="value"
          >
            {pieData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ color: '#94a3b8', fontSize: '12px' }}
            iconType="circle"
            formatter={(value) => formatStrategyName(value)}
          />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  // Bar chart for P&L, Win Rate, or Profit on Risk
  interface BarDataEntry {
    name: string;
    strategyType: string;
    pl: number;
    winRate: number;
    profitOnRisk: number;
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
  }
  const barData: BarDataEntry[] = data.map((strategy) => ({
    name: formatStrategyName(strategy.strategyType),
    strategyType: strategy.strategyType,
    pl: strategy.pl,
    winRate: strategy.winRate,
    profitOnRisk: strategy.profitOnRisk,
    totalTrades: strategy.totalTrades,
    winningTrades: strategy.winningTrades,
    losingTrades: strategy.losingTrades,
  }));

  const CustomTooltip = ({ active, payload }: TooltipContentProps<number, string>) => {
    if (active && payload && payload.length) {
      const entry = payload[0]?.payload as BarDataEntry | undefined;
      const value = payload[0]?.value;
      if (!entry || value === undefined) return null;
      return (
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-xl">
          <p className="text-slate-400 text-sm mb-2 font-semibold">{entry.name}</p>
          {metric === 'pl' ? (
            <>
              <p className={`text-sm font-semibold ${value >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatCurrency(value)}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {entry.totalTrades} trades • {entry.winRate.toFixed(1)}% WR
              </p>
            </>
          ) : metric === 'winRate' ? (
            <>
              <p className="text-sm text-slate-300 font-semibold">
                {value.toFixed(1)}%
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {entry.winningTrades}W / {entry.losingTrades}L ({entry.totalTrades} total)
              </p>
            </>
          ) : (
            <>
              <p className={`text-sm font-semibold ${value >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {value.toFixed(2)}%
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {entry.totalTrades} trades • P&L: {formatCurrency(entry.pl)}
              </p>
            </>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={300} minHeight={250}>
      <BarChart data={barData} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis
          dataKey="name"
          stroke="#94a3b8"
          style={{ fontSize: '12px' }}
          angle={-45}
          textAnchor="end"
          height={80}
        />
        <YAxis
          tickFormatter={
            metric === 'pl'
              ? (value) => formatCurrency(value)
              : metric === 'profitOnRisk'
              ? (value) => `${value.toFixed(1)}%`
              : (value) => `${value}%`
          }
          stroke="#94a3b8"
          style={{ fontSize: '12px' }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar
          dataKey={metric === 'pl' ? 'pl' : metric === 'winRate' ? 'winRate' : 'profitOnRisk'}
          name={metric === 'pl' ? 'P&L' : metric === 'winRate' ? 'Win Rate' : 'Profit on Risk'}
          radius={[8, 8, 0, 0]}
        >
          {barData.map((entry, index) => {
            if (metric === 'pl') {
              return <Cell key={`cell-${index}`} fill={entry.pl >= 0 ? '#10b981' : '#ef4444'} />;
            } else if (metric === 'winRate') {
              const winRateColor = entry.winRate >= 50 ? '#10b981' : entry.winRate >= 40 ? '#f59e0b' : '#ef4444';
              return <Cell key={`cell-${index}`} fill={winRateColor} />;
            } else {
              return <Cell key={`cell-${index}`} fill={entry.profitOnRisk >= 0 ? '#10b981' : '#ef4444'} />;
            }
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

