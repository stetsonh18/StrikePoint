import React, { useState, useMemo, useCallback } from 'react';
import { formatCurrency } from '@/shared/utils/formatUtils';
import type { DailyPerformanceCalendarData } from '@/application/hooks/useDailyPerformanceCalendar';
import { usePositionsByDate } from '@/application/hooks/usePositionsByDate';
import type { AssetType } from '@/domain/types/asset.types';
import type { Position } from '@/domain/types';

interface DailyPerformanceCalendarProps {
  data: DailyPerformanceCalendarData[];
  isLoading?: boolean;
  userId: string;
  assetType?: AssetType;
}

interface DayData {
  date: string;
  pl: number;
  trades: number;
  dayOfWeek: number;
  dayOfMonth: number;
}

interface WeekData {
  days: DayData[];
  weekTotal: number;
  daysWithTrades: number;
}

export const DailyPerformanceCalendar = React.memo(({ 
  data, 
  isLoading, 
  userId,
  assetType 
}: DailyPerformanceCalendarProps) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showTradesModal, setShowTradesModal] = useState(false);

  const { data: positionsForDate = [], isLoading: isLoadingTrades } = usePositionsByDate(
    userId,
    selectedDate || '',
    assetType,
    showTradesModal && !!selectedDate
  );

  // Extract year and month for use in navigation functions (must be before early returns)
  const currentYear = selectedMonth.getFullYear();
  const currentMonth = selectedMonth.getMonth();

  // Memoize calendar calculations to avoid recalculating on every render
  const calendarData = useMemo(() => {
    if (!data || data.length === 0) {
      return { weeks: [], monthlyPL: 0, daysWithTrades: 0, dataMap: new Map() };
    }

    // Create a map of date -> P&L and trades (filter by selected month)
    const dataMap = new Map<string, { pl: number; trades: number }>();
    data.forEach((entry) => {
      const entryDate = new Date(entry.date + 'T00:00:00'); // Add time to avoid timezone issues
      if (entryDate.getFullYear() === currentYear && entryDate.getMonth() === currentMonth) {
        dataMap.set(entry.date, { pl: entry.pl, trades: entry.trades });
      }
    });

    // Calculate monthly stats
    const monthlyPL = Array.from(dataMap.values()).reduce((sum, d) => sum + d.pl, 0);
    const daysWithTrades = Array.from(dataMap.values()).filter((d) => d.trades > 0).length;

    // Get first day of month and number of days
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const firstDayOfWeek = firstDay.getDay(); // 0 = Sunday, 6 = Saturday

    // Build calendar days
    const calendarDays: DayData[] = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfWeek; i++) {
      calendarDays.push({
        date: '',
        pl: 0,
        trades: 0,
        dayOfWeek: i,
        dayOfMonth: -1,
      });
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      const dateStr = date.toISOString().split('T')[0];
      const dayData = dataMap.get(dateStr) || { pl: 0, trades: 0 };
      
      calendarDays.push({
        date: dateStr,
        pl: dayData.pl,
        trades: dayData.trades,
        dayOfWeek: date.getDay(),
        dayOfMonth: day,
      });
    }

    // Group into weeks
    const weeks: WeekData[] = [];
    let currentWeek: DayData[] = [];
    
    calendarDays.forEach((day, index) => {
      currentWeek.push(day);
      
      // Start new week on Saturday (dayOfWeek === 6) or at the end
      if (day.dayOfWeek === 6 || index === calendarDays.length - 1) {
        // Pad week to always have 7 days
        while (currentWeek.length < 7) {
          currentWeek.push({
            date: '',
            pl: 0,
            trades: 0,
            dayOfWeek: currentWeek.length,
            dayOfMonth: -1,
          });
        }
        
        const weekTotal = currentWeek.reduce((sum, d) => sum + d.pl, 0);
        const daysWithTradesInWeek = currentWeek.filter((d) => d.trades > 0).length;
        weeks.push({
          days: [...currentWeek],
          weekTotal,
          daysWithTrades: daysWithTradesInWeek,
        });
        currentWeek = [];
      }
    });

    return { weeks, monthlyPL, daysWithTrades, dataMap };
  }, [data, currentYear, currentMonth]);

  const { weeks, monthlyPL, daysWithTrades, dataMap } = calendarData;

  // Memoize color functions to avoid recreating on every render
  const getDayColor = useCallback((pl: number, trades: number): string => {
    if (trades === 0) {
      return 'bg-slate-100 dark:bg-slate-800/30 border-slate-300 dark:border-slate-700/50'; // No trades
    }
    if (pl > 0) {
      return 'bg-amber-600/80 border-amber-500/50'; // Profitable (brown/orange)
    }
    if (pl < 0) {
      return 'bg-purple-600/80 border-purple-500/50'; // Loss (purple)
    }
    return 'bg-blue-500/50 border-blue-400/50'; // Break even
  }, []);

  const getTextColor = useCallback((pl: number, trades: number): string => {
    if (trades === 0) {
      return 'text-slate-500 dark:text-slate-500';
    }
    if (pl > 0) {
      return 'text-amber-100';
    }
    if (pl < 0) {
      return 'text-purple-100';
    }
    return 'text-blue-100';
  }, []);

  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="text-slate-400 text-sm">Loading performance calendar...</div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="text-slate-400 text-sm">No performance data available yet.</div>
      </div>
    );
  }

  // Navigate months
  const goToPreviousMonth = () => {
    setSelectedMonth(new Date(currentYear, currentMonth - 1, 1));
  };

  const goToNextMonth = () => {
    setSelectedMonth(new Date(currentYear, currentMonth + 1, 1));
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const handleDateClick = (date: string) => {
    if (!date || !dataMap.has(date)) return;
    setSelectedDate(date);
    setShowTradesModal(true);
  };

  const formatPositionSymbol = (position: Position): string => {
    if (position.asset_type === 'option') {
      return `${position.symbol} ${position.strike_price}${position.option_type === 'call' ? 'C' : 'P'} ${position.expiration_date ? new Date(position.expiration_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}`;
    }
    return position.symbol;
  };

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Daily Performance Calendar
            </h3>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Monthly stats: <span className={monthlyPL >= 0 ? 'text-amber-600 dark:text-amber-400' : 'text-purple-600 dark:text-purple-400'}>
                {formatCurrency(monthlyPL)}
              </span> over <span className="text-slate-700 dark:text-slate-300">{daysWithTrades} days</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={goToPreviousMonth}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 min-w-[120px] text-center">
              {monthNames[currentMonth]} {currentYear}
            </span>
            <button
              onClick={goToNextMonth}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            <table className="w-full border-collapse table-fixed">
              <colgroup>
                {dayNames.map((_, index) => (
                  <col key={index} className="w-[calc((100%-140px)/7)]" />
                ))}
                <col className="w-[140px]" />
              </colgroup>
              <thead>
                <tr>
                  {dayNames.map((day) => (
                    <th key={day} className="text-xs font-medium text-slate-600 dark:text-slate-400 pb-2 text-center">
                      {day}
                    </th>
                  ))}
                  <th className="text-xs font-medium text-slate-600 dark:text-slate-400 pb-2 text-center pl-4 text-right">
                    Weekly Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {weeks.map((week, weekIndex) => (
                  <tr key={weekIndex}>
                    {week.days.map((day, dayIndex) => {
                      if (day.dayOfMonth === -1) {
                        return (
                          <td key={dayIndex} className="p-1.5">
                            <div className="h-[100px] border border-slate-300 dark:border-slate-700/30 rounded-lg bg-slate-100 dark:bg-slate-800/20"></div>
                          </td>
                        );
                      }
                      
                      const hasTrades = day.trades > 0;
                      const isClickable = hasTrades;
                      
                      return (
                        <td key={dayIndex} className="p-1.5">
                          <div
                            onClick={() => isClickable && handleDateClick(day.date)}
                            className={`
                              border rounded-lg p-2 h-[100px] flex flex-col transition-all
                              ${getDayColor(day.pl, day.trades)}
                              ${isClickable ? 'cursor-pointer hover:ring-2 hover:ring-emerald-400/50' : ''}
                            `}
                          >
                            <div className="text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">
                              {day.dayOfMonth}
                            </div>
                            {hasTrades && (
                              <div className="flex-1 flex flex-col justify-center">
                                <div className={`text-xs font-medium mb-0.5 ${getTextColor(day.pl, day.trades)}`}>
                                  {formatCurrency(day.pl)}
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                  {day.trades} {day.trades === 1 ? 'trade' : 'trades'}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                    <td className="p-1.5 pl-4">
                      <div className={`
                        border rounded-lg p-2 h-[100px] flex flex-col
                        ${week.weekTotal >= 0 ? 'bg-amber-600/80 border-amber-500/50' : 'bg-purple-600/80 border-purple-500/50'}
                        ${week.daysWithTrades === 0 ? 'bg-slate-100 dark:bg-slate-800/30 border-slate-300 dark:border-slate-700/50' : ''}
                      `}>
                        <div className="text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">
                          Week {weekIndex + 1}
                        </div>
                        {week.daysWithTrades > 0 && (
                          <div className="flex-1 flex flex-col justify-center">
                            <div className={`text-xs font-medium mb-0.5 ${week.weekTotal >= 0 ? 'text-amber-100' : 'text-purple-100'}`}>
                              {formatCurrency(week.weekTotal)}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {week.daysWithTrades} {week.daysWithTrades === 1 ? 'day' : 'days'}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6 text-xs text-slate-600 dark:text-slate-400 pt-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-amber-600/80 border border-amber-500/50 rounded"></div>
            <span>Profitable Day</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-purple-600/80 border border-purple-500/50 rounded"></div>
            <span>Loss Day</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500/50 border border-blue-400/50 rounded"></div>
            <span>Break Even</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-slate-100 dark:bg-slate-800/30 border border-slate-300 dark:border-slate-700/50 rounded"></div>
            <span>No Trades</span>
          </div>
        </div>
      </div>

      {/* Trades Modal */}
      {showTradesModal && selectedDate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                Trades on {selectedDate ? new Date(selectedDate).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                }) : ''}
              </h3>
              <button
                onClick={() => {
                  setShowTradesModal(false);
                  setSelectedDate(null);
                }}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {isLoadingTrades ? (
                <div className="text-center text-slate-600 dark:text-slate-400 py-8">Loading trades...</div>
              ) : positionsForDate.length === 0 ? (
                <div className="text-center text-slate-600 dark:text-slate-400 py-8">No trades found for this date</div>
              ) : (
                <div className="space-y-3">
                  {positionsForDate.map((position) => (
                    <div
                      key={position.id}
                      className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:border-emerald-500/30 transition-all"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-slate-900 dark:text-slate-100">
                            {formatPositionSymbol(position)}
                          </span>
                          <span className="text-xs px-2 py-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                            {position.asset_type}
                          </span>
                          {position.side && (
                            <span
                              className={`text-xs px-2 py-1 rounded ${
                                position.side === 'long'
                                  ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                                  : 'bg-red-500/20 text-red-600 dark:text-red-400'
                              }`}
                            >
                              {position.side.toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className={`text-lg font-semibold ${
                          (position.realized_pl || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                        }`}>
                          {formatCurrency(position.realized_pl || 0)}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-slate-600 dark:text-slate-400">
                        <div>
                          <span className="text-slate-500 dark:text-slate-500">Quantity: </span>
                          <span className="text-slate-700 dark:text-slate-300">{position.current_quantity || position.opening_quantity}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 dark:text-slate-500">Avg Price: </span>
                          <span className="text-slate-700 dark:text-slate-300">${position.average_opening_price?.toFixed(2) || '0.00'}</span>
                        </div>
                        {position.closed_at && (
                          <div>
                            <span className="text-slate-500 dark:text-slate-500">Closed: </span>
                            <span className="text-slate-700 dark:text-slate-300">
                              {new Date(position.closed_at).toLocaleTimeString('en-US', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </span>
                          </div>
                        )}
                        {position.strategy_id && (
                          <div>
                            <span className="text-slate-500 dark:text-slate-500">Strategy: </span>
                            <span className="text-slate-700 dark:text-slate-300">Yes</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
});

DailyPerformanceCalendar.displayName = 'DailyPerformanceCalendar';
