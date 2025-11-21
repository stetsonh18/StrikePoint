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
import type { BalanceOverTimeData } from '@/application/hooks/useBalanceOverTime';
import { formatCurrency } from '@/shared/utils/formatUtils';

interface BalanceOverTimeChartProps {
  data: BalanceOverTimeData[];
  isLoading?: boolean;
}

export const BalanceOverTimeChart = ({ data, isLoading }: BalanceOverTimeChartProps) => {
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

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const CustomTooltip = ({ active, payload }: TooltipContentProps<number, string>) => {
    if (active && payload && payload.length) {
      const entry = payload[0]?.payload as BalanceOverTimeData | undefined;
      if (!entry) return null;
      return (
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-xl">
          <p className="text-slate-400 text-sm mb-2">{formatDate(entry.date)}</p>
          <p className="text-sm text-emerald-400 font-semibold">
            Balance: {formatCurrency(entry.balance)}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Net Cash Flow: {formatCurrency(entry.netCashFlow)}
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
          <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          stroke="#94a3b8"
          style={{ fontSize: '12px' }}
        />
        <YAxis
          tickFormatter={(value) => formatCurrency(value)}
          stroke="#94a3b8"
          style={{ fontSize: '12px' }}
        />
      <Tooltip<number, string> content={(props) => <CustomTooltip {...props} />} />
        <Area
          type="monotone"
          dataKey="balance"
          stroke="#10b981"
          strokeWidth={2}
          fill="url(#balanceGradient)"
          name="Balance"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

