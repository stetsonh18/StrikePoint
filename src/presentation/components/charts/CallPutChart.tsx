import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import type { OptionsByTypeData } from '@/application/hooks/useOptionsByType';
import { formatCurrency } from '@/shared/utils/formatUtils';

interface CallPutChartProps {
  data: OptionsByTypeData;
  isLoading?: boolean;
  chartType?: 'donut' | 'bar';
  metric?: 'distribution' | 'pl' | 'winRate';
}

const COLORS = {
  call: '#3b82f6',
  put: '#ef4444',
};

export const CallPutChart = ({ data, isLoading, chartType = 'donut', metric = 'distribution' }: CallPutChartProps) => {
  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="text-slate-400 text-sm">Loading chart data...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="text-slate-400 text-sm">No data available</div>
      </div>
    );
  }

  const totalTrades = data.call.totalTrades + data.put.totalTrades;

  if (totalTrades === 0) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="text-slate-400 text-sm">No trades available</div>
      </div>
    );
  }

  if (chartType === 'donut' && metric === 'distribution') {
    const pieData = [
      { name: 'Calls', value: data.call.totalTrades, color: COLORS.call },
      { name: 'Puts', value: data.put.totalTrades, color: COLORS.put },
    ];

    const CustomTooltip = ({ active, payload }: any) => {
      if (active && payload && payload.length) {
        const entry = payload[0];
        const percentage = ((entry.value / totalTrades) * 100).toFixed(1);
        return (
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-xl">
            <p className="text-sm font-semibold" style={{ color: entry.payload.color }}>
              {entry.name}
            </p>
            <p className="text-sm text-slate-300">
              {entry.value} trades ({percentage}%)
            </p>
          </div>
        );
      }
      return null;
    };

    const renderLabel = (entry: any) => {
      const percentage = ((entry.value / totalTrades) * 100).toFixed(1);
      return `${percentage}%`;
    };

    return (
      <ResponsiveContainer width="100%" height={250} minHeight={200}>
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderLabel}
            outerRadius={80}
            innerRadius={40}
            fill="#8884d8"
            dataKey="value"
          >
            {pieData.map((entry, index) => (
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
  }

  // Bar chart for P&L or Win Rate
  const barData = [
    {
      name: 'Call',
      pl: data.call.pl,
      winRate: data.call.winRate,
      totalTrades: data.call.totalTrades,
      winningTrades: data.call.winningTrades,
      losingTrades: data.call.losingTrades,
    },
    {
      name: 'Put',
      pl: data.put.pl,
      winRate: data.put.winRate,
      totalTrades: data.put.totalTrades,
      winningTrades: data.put.winningTrades,
      losingTrades: data.put.losingTrades,
    },
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const entry = payload[0].payload;
      const value = payload[0].value;
      return (
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-xl">
          <p className="text-slate-400 text-sm mb-2 font-semibold">{entry.name}</p>
          {metric === 'pl' ? (
            <>
              <p className={`text-sm font-semibold ${value >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatCurrency(value)}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {entry.totalTrades} trades • {entry.winRate.toFixed(1)}% WR
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-slate-300 font-semibold">
                {value.toFixed(1)}%
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {entry.winningTrades}W / {entry.losingTrades}L ({entry.totalTrades} total)
              </p>
            </>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={barData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis
          dataKey="name"
          stroke="#94a3b8"
          style={{ fontSize: '12px' }}
        />
        <YAxis
          tickFormatter={metric === 'pl' ? (value) => formatCurrency(value) : (value) => `${value}%`}
          stroke="#94a3b8"
          style={{ fontSize: '12px' }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar
          dataKey={metric === 'pl' ? 'pl' : 'winRate'}
          name={metric === 'pl' ? 'P&L' : 'Win Rate'}
          radius={[8, 8, 0, 0]}
        >
          {barData.map((entry, index) => {
            if (metric === 'pl') {
              return <Cell key={`cell-${index}`} fill={entry.pl >= 0 ? '#10b981' : '#ef4444'} />;
            } else {
              const color = entry.winRate >= 50 ? '#10b981' : entry.winRate >= 40 ? '#f59e0b' : '#ef4444';
              return <Cell key={`cell-${index}`} fill={color} />;
            }
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

