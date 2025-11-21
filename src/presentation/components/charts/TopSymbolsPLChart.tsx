import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { TooltipContentProps } from 'recharts/types/component/Tooltip';
import type { SymbolPerformance } from '@/infrastructure/services/performanceMetricsService';
import { formatCurrency } from '@/shared/utils/formatUtils';

interface TopSymbolsPLChartProps {
  data: SymbolPerformance[];
  isLoading?: boolean;
  limit?: number;
}

export const TopSymbolsPLChart = ({ data, isLoading, limit = 10 }: TopSymbolsPLChartProps) => {
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

  // Take top N symbols by P&L
  const chartData = data.slice(0, limit).map((symbol) => ({
    symbol: symbol.symbol,
    pl: symbol.totalPL,
  }));

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: TooltipContentProps<number, string>) => {
    if (active && payload && payload.length) {
      const entry = payload[0]?.payload as { symbol: string; pl: number } | undefined;
      const value = payload[0]?.value;
      if (!entry || value === undefined) return null;
      const symbol = entry.symbol;
      const symbolData = data.find((s) => s.symbol === symbol);
      return (
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-xl">
          <p className="text-slate-400 text-sm mb-2">{symbol}</p>
          <p className={`text-sm font-semibold ${value >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatCurrency(value)}
          </p>
          {symbolData && (
            <p className="text-xs text-slate-500 mt-1">
              {symbolData.totalTrades} trades • {symbolData.winRate.toFixed(1)}% WR
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={300} minHeight={250}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis
          type="number"
          tickFormatter={(value) => formatCurrency(value)}
          stroke="#94a3b8"
          style={{ fontSize: '12px' }}
        />
        <YAxis
          type="category"
          dataKey="symbol"
          stroke="#94a3b8"
          style={{ fontSize: '12px' }}
          width={70}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="pl" name="P&L" radius={[0, 8, 8, 0]}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.pl >= 0 ? '#10b981' : '#ef4444'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

