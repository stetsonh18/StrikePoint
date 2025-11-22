import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import type { TooltipContentProps } from 'recharts/types/component/Tooltip';
import type { DrawdownOverTimeData } from '@/application/hooks/useDrawdownOverTime';
import { formatCurrency } from '@/shared/utils/formatUtils';
import { formatChartDate } from '@/shared/utils/dateUtils';

interface DrawdownChartProps {
  data: DrawdownOverTimeData[];
  isLoading?: boolean;
}

export const DrawdownChart = ({ data, isLoading }: DrawdownChartProps) => {
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
      const entry = payload[0]?.payload as DrawdownOverTimeData | undefined;
      if (!entry) return null;
      return (
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-xl">
          <p className="text-slate-400 text-sm mb-2">{formatChartDate(entry.date)}</p>
          <p className="text-sm text-red-400 font-semibold">
            Drawdown: {entry.drawdown.toFixed(2)}%
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Peak: {formatCurrency(entry.peak)}
          </p>
          <p className="text-xs text-slate-500">
            Current: {formatCurrency(entry.current)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={300} minHeight={250}>
      <AreaChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <defs>
          <linearGradient id="drawdownGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis
          dataKey="date"
          tickFormatter={formatChartDate}
          stroke="#94a3b8"
          style={{ fontSize: '12px' }}
        />
        <YAxis
          tickFormatter={(value) => `${value.toFixed(1)}%`}
          stroke="#94a3b8"
          style={{ fontSize: '12px' }}
        />
        <Tooltip<number, string> content={(props) => <CustomTooltip {...props} />} />
        <Area
          type="monotone"
          dataKey="drawdown"
          stroke="#ef4444"
          strokeWidth={2}
          fill="url(#drawdownGradient)"
          name="Drawdown"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

