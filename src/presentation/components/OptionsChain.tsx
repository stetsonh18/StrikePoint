import React, { useState, useMemo, useEffect } from 'react';
import { Search, Calendar, TrendingUp, TrendingDown, Filter } from 'lucide-react';
import { useOptionsChain } from '@/application/hooks/useOptionsChain';
import type { OptionChainEntry } from '@/domain/types';
import { formatDate as formatDateUtil } from '@/shared/utils/dateUtils';

interface OptionsChainProps {
  underlyingSymbol: string;
  onSelectOption?: (entry: OptionChainEntry) => void;
}

export const OptionsChain: React.FC<OptionsChainProps> = ({
  underlyingSymbol,
  onSelectOption,
}) => {
  const [selectedExpiration, setSelectedExpiration] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'call' | 'put'>('all');
  const [strikeRange, setStrikeRange] = useState<{ min: number; max: number } | null>(null);
  const [searchStrike, setSearchStrike] = useState('');

  // Fetch options chain - don't pass expiration to get ALL expirations
  // We'll filter by expiration on the frontend
  const { data: chainData, isLoading, error } = useOptionsChain(
    underlyingSymbol,
    undefined, // Don't filter by expiration - we want all dates
    undefined,
    filterType !== 'all' ? filterType : undefined
  );

  // Get available expirations
  const expirations = useMemo(() => {
    if (!chainData) return [];
    return chainData.expirations || [];
  }, [chainData]);

  // Set first expiration as default
  useEffect(() => {
    if (expirations.length > 0 && !selectedExpiration) {
      setSelectedExpiration(expirations[0]);
    }
  }, [expirations, selectedExpiration]);

  // Get filtered chain entries
  const filteredEntries = useMemo(() => {
    if (!chainData || !selectedExpiration) return [];

    const entries = chainData.chain[selectedExpiration] || [];

    return entries.filter((entry) => {
      // Filter by type
      if (filterType !== 'all' && entry.option_type !== filterType) {
        return false;
      }

      // Filter by strike range
      if (strikeRange) {
        if (entry.strike < strikeRange.min || entry.strike > strikeRange.max) {
          return false;
        }
      }

      // Filter by search strike
      if (searchStrike) {
        const searchNum = parseFloat(searchStrike);
        if (!isNaN(searchNum)) {
          // Show strikes within $5 of search
          if (Math.abs(entry.strike - searchNum) > 5) {
            return false;
          }
        }
      }

      return true;
    });
  }, [chainData, selectedExpiration, filterType, strikeRange, searchStrike]);

  // Group by strike for display
  const groupedByStrike = useMemo(() => {
    const grouped: Record<number, { call?: OptionChainEntry; put?: OptionChainEntry }> = {};

    filteredEntries.forEach((entry) => {
      if (!grouped[entry.strike]) {
        grouped[entry.strike] = {};
      }
      grouped[entry.strike][entry.option_type] = entry;
    });

    return grouped;
  }, [filteredEntries]);

  const strikes = Object.keys(groupedByStrike)
    .map(Number)
    .sort((a, b) => a - b);

  const formatCurrency = (amount?: number) => {
    if (amount === undefined || amount === null) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatNumber = (num?: number) => {
    if (num === undefined || num === null) return '-';
    return num.toLocaleString();
  };

  const formatPercent = (num?: number) => {
    if (num === undefined || num === null) return '-';
    return `${(num * 100).toFixed(2)}%`;
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-slate-600 dark:text-slate-400">
        <div className="inline-block w-8 h-8 border-4 border-emerald-600 dark:border-emerald-400 border-t-transparent rounded-full animate-spin mb-4" />
        <p>Loading options chain...</p>
      </div>
    );
  }

  if (error || !chainData) {
    return (
      <div className="p-8 text-center text-red-600 dark:text-red-400">
        <p>Failed to load options chain for {underlyingSymbol}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl">
        {/* Expiration Selector */}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Expiration</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 dark:text-slate-400" size={16} />
            <select
              value={selectedExpiration}
              onChange={(e) => setSelectedExpiration(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
            >
              {expirations.map((exp) => (
                <option key={exp} value={exp}>
                  {formatDateUtil(exp)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Type Filter */}
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Type</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
          >
            <option value="all">All</option>
            <option value="call">Calls</option>
            <option value="put">Puts</option>
          </select>
        </div>

        {/* Strike Search */}
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Strike Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 dark:text-slate-400" size={16} />
            <input
              type="number"
              step="0.01"
              value={searchStrike}
              onChange={(e) => setSearchStrike(e.target.value)}
              placeholder="150.00"
              className="w-32 pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
            />
          </div>
        </div>
      </div>

      {/* Options Chain Table */}
      <div className="overflow-x-auto bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl">
        <table className="w-full">
          <thead className="bg-slate-100 dark:bg-slate-900/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Strike
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Call
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Bid
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Ask
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Last
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Vol
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                OI
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                IV
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Delta
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Put
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Bid
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Ask
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Last
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Vol
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                OI
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                IV
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Delta
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {strikes.length === 0 ? (
              <tr>
                <td colSpan={17} className="px-4 py-8 text-center text-slate-600 dark:text-slate-400">
                  No options found for this expiration
                </td>
              </tr>
            ) : (
              strikes.map((strike) => {
                const call = groupedByStrike[strike].call;
                const put = groupedByStrike[strike].put;
                const isITMCall = call && chainData.underlying_price && call.strike < chainData.underlying_price;
                const isITMPut = put && chainData.underlying_price && put.strike > chainData.underlying_price;

                return (
                  <tr
                    key={strike}
                    className="hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
                    onClick={() => {
                      if (onSelectOption && call) onSelectOption(call);
                    }}
                  >
                    <td className="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
                      ${strike.toFixed(2)}
                    </td>
                    {/* Call columns */}
                    <td className="px-4 py-3 text-center">
                      {call ? (
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            isITMCall
                              ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                              : 'bg-slate-200 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          C
                        </span>
                      ) : (
                        <span className="text-slate-500 dark:text-slate-600">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-slate-700 dark:text-slate-300">
                      {formatCurrency(call?.bid)}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-slate-700 dark:text-slate-300">
                      {formatCurrency(call?.ask)}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-slate-900 dark:text-slate-100">
                      {formatCurrency(call?.last)}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-slate-700 dark:text-slate-300">
                      {formatNumber(call?.volume)}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-slate-700 dark:text-slate-300">
                      {formatNumber(call?.open_interest)}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-slate-700 dark:text-slate-300">
                      {formatPercent(call?.implied_volatility)}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-slate-700 dark:text-slate-300">
                      {call?.delta?.toFixed(3) || '-'}
                    </td>
                    {/* Put columns */}
                    <td className="px-4 py-3 text-center">
                      {put ? (
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            isITMPut
                              ? 'bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30'
                              : 'bg-slate-200 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          P
                        </span>
                      ) : (
                        <span className="text-slate-500 dark:text-slate-600">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-slate-700 dark:text-slate-300">
                      {formatCurrency(put?.bid)}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-slate-700 dark:text-slate-300">
                      {formatCurrency(put?.ask)}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-slate-900 dark:text-slate-100">
                      {formatCurrency(put?.last)}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-slate-700 dark:text-slate-300">
                      {formatNumber(put?.volume)}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-slate-700 dark:text-slate-300">
                      {formatNumber(put?.open_interest)}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-slate-700 dark:text-slate-300">
                      {formatPercent(put?.implied_volatility)}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-slate-700 dark:text-slate-300">
                      {put?.delta?.toFixed(3) || '-'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Underlying Price */}
      {chainData.underlying_price && (
        <div className="text-center text-sm text-slate-600 dark:text-slate-400">
          Underlying Price: <span className="text-slate-900 dark:text-slate-100 font-semibold">{formatCurrency(chainData.underlying_price)}</span>
        </div>
      )}
    </div>
  );
};

