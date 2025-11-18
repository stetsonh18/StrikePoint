import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import type { ROIOverTimeData } from '@/application/hooks/useROIOverTime';

interface ROIOverTimeChartProps {
  data: ROIOverTimeData[];
  isLoading?: boolean;
}

export const ROIOverTimeChart = ({ data, isLoading }: ROIOverTimeChartProps) => {
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

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const entry = payload[0].payload;
      return (
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-xl">
          <p className="text-slate-400 text-sm mb-2">{formatDate(entry.date)}</p>
          <p className={`text-sm font-semibold ${entry.roi >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            ROI: {entry.roi.toFixed(2)}%
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Portfolio Value: ${entry.portfolioValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-slate-500">
            Net Cash Flow: ${entry.netCashFlow.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
          <linearGradient id="roiGradient" x1="0" y1="0" x2="0" y2="1">
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
          tickFormatter={(value) => `${value.toFixed(1)}%`}
          stroke="#94a3b8"
          style={{ fontSize: '12px' }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="roi"
          stroke="#10b981"
          strokeWidth={2}
          fill="url(#roiGradient)"
          name="ROI %"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

