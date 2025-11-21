import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import type { TooltipContentProps } from 'recharts/types/component/Tooltip';

interface WinLossDistributionChartProps {
  winningTrades: number;
  losingTrades: number;
  isLoading?: boolean;
}

const COLORS = {
  win: '#10b981',
  loss: '#ef4444',
};

export const WinLossDistributionChart = ({ winningTrades, losingTrades, isLoading }: WinLossDistributionChartProps) => {
  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="text-slate-400 text-sm">Loading chart data...</div>
      </div>
    );
  }

  const totalTrades = winningTrades + losingTrades;
  
  if (totalTrades === 0) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="text-slate-400 text-sm">No trades available</div>
      </div>
    );
  }

  interface PieDataEntry {
    name: string;
    value: number;
    color: string;
  }
  const data: PieDataEntry[] = [
    { name: 'Wins', value: winningTrades, color: COLORS.win },
    { name: 'Losses', value: losingTrades, color: COLORS.loss },
  ];

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
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={renderLabel}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ color: '#94a3b8', fontSize: '12px' }}
          iconType="circle"
        />
      </PieChart>
    </ResponsiveContainer>
  );
};

