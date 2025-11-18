import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { EntryTimePerformanceData } from '@/application/hooks/useEntryTimePerformance';
import { formatCurrency } from '@/shared/utils/formatUtils';

interface EntryTimeChartProps {
  data: EntryTimePerformanceData[];
  isLoading?: boolean;
  showWinRate?: boolean;
  title?: string;
}

export const EntryTimeChart = ({ data, isLoading, showWinRate = false, title }: EntryTimeChartProps) => {
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
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const entry = payload[0].payload;
      const value = payload[0].value;
      return (
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-xl">
          <p className="text-slate-400 text-sm mb-2 font-semibold">{entry.timeBucket}</p>
          {showWinRate ? (
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
                {formatCurrency(value)}
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
      <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis
          dataKey="timeBucket"
          stroke="#94a3b8"
          style={{ fontSize: '12px' }}
          angle={-45}
          textAnchor="end"
          height={80}
        />
        <YAxis
          tickFormatter={showWinRate ? (value) => `${value}%` : (value) => formatCurrency(value)}
          stroke="#94a3b8"
          style={{ fontSize: '12px' }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar
          dataKey={showWinRate ? 'winRate' : 'pl'}
          name={showWinRate ? 'Win Rate' : 'P&L'}
          radius={[8, 8, 0, 0]}
        >
          {data.map((entry, index) => {
            if (showWinRate) {
              const color = entry.winRate >= 50 ? '#10b981' : entry.winRate >= 40 ? '#f59e0b' : '#ef4444';
              return <Cell key={`cell-${index}`} fill={color} />;
            } else {
              return <Cell key={`cell-${index}`} fill={entry.pl >= 0 ? '#10b981' : '#ef4444'} />;
            }
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

