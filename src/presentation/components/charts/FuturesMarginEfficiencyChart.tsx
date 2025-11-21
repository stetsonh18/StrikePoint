import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { TooltipContentProps } from 'recharts/types/component/Tooltip';
import type { FuturesMarginEfficiencyData } from '@/application/hooks/useFuturesMarginEfficiency';
import { formatCurrency } from '@/shared/utils/formatUtils';

interface FuturesMarginEfficiencyChartProps {
  data: FuturesMarginEfficiencyData[];
  isLoading?: boolean;
}

export const FuturesMarginEfficiencyChart = ({ data, isLoading }: FuturesMarginEfficiencyChartProps) => {
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
      const entry = payload[0]?.payload as FuturesMarginEfficiencyData | undefined;
      const value = payload[0]?.value;
      if (!entry || value === undefined) return null;
      return (
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-xl">
          <p className="text-slate-400 text-sm mb-2 font-semibold">{entry.symbol}</p>
          <p className={`text-sm font-semibold ${value >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {value.toFixed(2)}%
          </p>
          <p className="text-xs text-slate-500 mt-1">
            P&L: {formatCurrency(entry.pl)}
          </p>
          <p className="text-xs text-slate-500">
            Margin Used: {formatCurrency(entry.marginUsed)}
          </p>
          <p className="text-xs text-slate-500">
            {entry.totalTrades} trades
          </p>
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
          dataKey="symbol"
          stroke="#94a3b8"
          style={{ fontSize: '12px' }}
        />
        <YAxis
          tickFormatter={(value) => `${value.toFixed(1)}%`}
          stroke="#94a3b8"
          style={{ fontSize: '12px' }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar
          dataKey="marginEfficiency"
          name="Margin Efficiency"
          radius={[8, 8, 0, 0]}
        >
          {data.map((entry, index) => {
            const color = entry.marginEfficiency >= 0 ? '#10b981' : '#ef4444';
            return <Cell key={`cell-${index}`} fill={color} />;
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

