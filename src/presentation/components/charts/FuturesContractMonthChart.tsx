import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { TooltipContentProps } from 'recharts/types/component/Tooltip';
import type { FuturesContractMonthPerformanceData } from '@/application/hooks/useFuturesContractMonthPerformance';
import { formatCurrency } from '@/shared/utils/formatUtils';

interface FuturesContractMonthChartProps {
  data: FuturesContractMonthPerformanceData[];
  isLoading?: boolean;
  showWinRate?: boolean;
}

export const FuturesContractMonthChart = ({ data, isLoading, showWinRate = false }: FuturesContractMonthChartProps) => {
  // Helper function to extract just the month from contract month (e.g., "DEC24" -> "DEC")
  const formatContractMonth = (contractMonth: string): string => {
    if (!contractMonth) return contractMonth;
    
    // Match formats like "DEC24", "MAR25", "DEC 2024", "MAR 2025"
    const match = contractMonth.match(/^([A-Z]{3})(\d{2,4}|\s+\d{4})?$/i);
    if (match) {
      return match[1].toUpperCase();
    }
    
    // If it doesn't match the expected format, try to extract first 3 letters
    const firstThree = contractMonth.substring(0, 3).toUpperCase();
    if (/^[A-Z]{3}$/.test(firstThree)) {
      return firstThree;
    }
    
    // Fallback: return as-is if we can't parse it
    return contractMonth;
  };

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

  // Transform data to use month-only format for display
  const displayData = data.map(entry => ({
    ...entry,
    displayMonth: formatContractMonth(entry.contractMonth),
  }));

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: TooltipContentProps<number, string>) => {
    if (active && payload && payload.length) {
      const entry = payload[0]?.payload as (FuturesContractMonthPerformanceData & { displayMonth: string }) | undefined;
      const value = payload[0]?.value;
      if (!entry || value === undefined) return null;
      return (
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-xl">
          <p className="text-slate-400 text-sm mb-2 font-semibold">{entry.displayMonth}</p>
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
      <BarChart data={displayData} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis
          dataKey="displayMonth"
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
          {displayData.map((entry, index) => {
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

