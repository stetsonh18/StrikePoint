import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { Last7DaysPLData } from '@/application/hooks/useLast7DaysPL';
import { formatCurrency } from '@/shared/utils/formatUtils';

interface Last7DaysPLChartProps {
  data: Last7DaysPLData[];
  isLoading?: boolean;
}

export const Last7DaysPLChart = ({ data, isLoading }: Last7DaysPLChartProps) => {
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
  const parseLocalDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map((value) => parseInt(value, 10));
    return new Date(year, (month || 1) - 1, day || 1);
  };

  const formatDate = (dateStr: string) => {
    const date = parseLocalDate(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const value = payload[0].value;
      return (
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-xl">
          <p className="text-slate-400 text-sm mb-2">{formatDate(payload[0].payload.date)}</p>
          <p className={`text-sm font-semibold ${value >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatCurrency(value)}
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
        <Tooltip content={<CustomTooltip />} />
        <Bar
          dataKey="pl"
          name="P&L"
          radius={[8, 8, 0, 0]}
        >
          {data.map((entry, index) => (
            <Cell key={index} fill={entry.pl >= 0 ? '#10b981' : '#ef4444'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

