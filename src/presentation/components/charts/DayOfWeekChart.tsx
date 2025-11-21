import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import type { TooltipContentProps } from 'recharts/types/component/Tooltip';
import type { DayOfWeekPerformance } from '@/application/hooks/useDayOfWeekPerformance';
import { formatCurrency } from '@/shared/utils/formatUtils';

interface DayOfWeekChartProps {
  data: DayOfWeekPerformance[];
  isLoading?: boolean;
  showWinRate?: boolean;
}

export const DayOfWeekChart = ({ data, isLoading, showWinRate = false }: DayOfWeekChartProps) => {
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
        <div className="text-slate-400 text-sm">No data available</div>
      </div>
    );
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: TooltipContentProps<number, string>) => {
    if (active && payload && payload.length) {
      const entry = payload[0]?.payload as DayOfWeekPerformance | undefined;
      if (!entry) return null;
      return (
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-xl">
          <p className="text-slate-400 text-sm mb-2 font-semibold">{entry.dayOfWeek}</p>
          {showWinRate ? (
            <>
              <p className="text-sm text-slate-300">
                Win Rate: <span className="font-semibold">{entry.winRate.toFixed(1)}%</span>
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {entry.winningTrades}W / {entry.losingTrades}L ({entry.totalTrades} total)
              </p>
            </>
          ) : (
            <>
              <p className={`text-sm font-semibold ${entry.pl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatCurrency(entry.pl)}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {entry.totalTrades} trades • {entry.winRate.toFixed(1)}% WR
              </p>
            </>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={250} minHeight={200}>
      <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis
          dataKey="dayOfWeek"
          stroke="#94a3b8"
          style={{ fontSize: '12px' }}
        />
        <YAxis
          tickFormatter={showWinRate ? (value) => `${value}%` : (value) => formatCurrency(value)}
          stroke="#94a3b8"
          style={{ fontSize: '12px' }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Bar
          dataKey={showWinRate ? 'winRate' : 'pl'}
          name={showWinRate ? 'Win Rate' : 'P&L'}
          radius={[8, 8, 0, 0]}
        >
          {data.map((entry, index) => {
            if (showWinRate) {
              // Color by win rate threshold
              const color = entry.winRate >= 50 ? '#10b981' : entry.winRate >= 40 ? '#f59e0b' : '#ef4444';
              return <Cell key={`cell-${index}`} fill={color} />;
            } else {
              // Color by P&L
              return <Cell key={`cell-${index}`} fill={entry.pl >= 0 ? '#10b981' : '#ef4444'} />;
            }
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

