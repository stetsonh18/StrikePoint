import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { TooltipContentProps } from 'recharts/types/component/Tooltip';
type ChartTooltipPayload = NonNullable<TooltipContentProps<number, string>['payload']>[number];
import type { PLOverTimeData } from '@/application/hooks/usePLOverTime';
import { formatCurrency } from '@/shared/utils/formatUtils';
import { ChartSkeleton } from '@/presentation/components/SkeletonLoader';
import { formatChartDate } from '@/shared/utils/dateUtils';

interface PLOverTimeChartProps {
  data: PLOverTimeData[];
  isLoading?: boolean;
}

export const PLOverTimeChart = ({ data, isLoading }: PLOverTimeChartProps) => {
  if (isLoading) {
    return <ChartSkeleton title="P&L Over Time" />;
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="text-slate-400 text-sm">No data available</div>
      </div>
    );
  }


  // Custom tooltip with proper typing
  const CustomTooltip = ({ active, payload }: TooltipContentProps<number, string>) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0]?.payload as PLOverTimeData | undefined;
      if (!dataPoint) {
        return null;
      }
      return (
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-xl">
          <p className="text-slate-400 text-sm mb-2">{formatChartDate(dataPoint.date)}</p>
          {payload.map((entry: ChartTooltipPayload, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {`${entry.name}: ${formatCurrency(entry.value as number)}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={300} minHeight={250}>
      <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis
          dataKey="date"
          tickFormatter={formatChartDate}
          stroke="#94a3b8"
          style={{ fontSize: '12px' }}
        />
        <YAxis
          tickFormatter={(value) => formatCurrency(value)}
          stroke="#94a3b8"
          style={{ fontSize: '12px' }}
        />
        <Tooltip<number, string> content={(props) => <CustomTooltip {...props} />} />
        <Legend />
        <Line
          type="monotone"
          dataKey="cumulativePL"
          name="Total P&L"
          stroke="#10b981"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="realizedPL"
          name="Realized P&L"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="unrealizedPL"
          name="Unrealized P&L"
          stroke="#f59e0b"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

