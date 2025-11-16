import React, { useState, useMemo, useEffect } from 'react';
import { TrendingUp, TrendingDown, Plus, Download, Search, DollarSign, Activity } from 'lucide-react';
import type { CryptoPosition, CryptoTransaction } from '@/domain/types';
import { useAuthStore } from '@/application/stores/auth.store';
import { usePositions } from '@/application/hooks/usePositions';
import { useTransactions } from '@/application/hooks/useTransactions';
import { useCryptoQuotes } from '@/application/hooks/useCryptoQuotes';
import { getCoinIdFromSymbol } from '@/infrastructure/services/cryptoMarketDataService';
import { toCryptoPosition, toCryptoTransaction } from '@/shared/utils/positionTransformers';
import { CryptoTransactionForm } from '@/presentation/components/CryptoTransactionForm';
import { SellCryptoPositionForm } from '@/presentation/components/SellCryptoPositionForm';
import { MarketStatusIndicator } from '@/presentation/components/MarketStatusIndicator';
import { formatDate as formatDateUtil } from '@/shared/utils/dateUtils';
import { useQueryClient } from '@tanstack/react-query';
import { TableSkeleton } from '@/presentation/components/SkeletonLoader';

const Crypto: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const userId = user?.id || '';
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'positions' | 'transactions'>('positions');
  const [searchQuery, setSearchQuery] = useState('');
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [showSellForm, setShowSellForm] = useState(false);
  const [selectedPositionForSell, setSelectedPositionForSell] = useState<CryptoPosition | null>(null);

  // Fetch crypto positions
  const { data: allPositions, isLoading: positionsLoading } = usePositions(userId, {
    asset_type: 'crypto',
    status: 'open',
  });

  // Fetch crypto transactions
  const { data: allTransactions, isLoading: transactionsLoading } = useTransactions(userId, {
    asset_type: 'crypto',
  });

  // Get unique symbols from positions for real-time quotes
  const positionSymbols = useMemo(() => {
    if (!allPositions) return [];
    return Array.from(
      new Set(
        allPositions
          .filter((p) => p.asset_type === 'crypto' && p.status === 'open')
          .map((p) => p.symbol)
      )
    );
  }, [allPositions]);

  // Convert symbols to CoinGecko IDs for quotes
  const [coinIdMap, setCoinIdMap] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchCoinIds = async () => {
      const idMap: Record<string, string> = {};
      for (const symbol of positionSymbols) {
        const coinId = await getCoinIdFromSymbol(symbol);
        if (coinId) {
          idMap[symbol] = coinId;
        }
      }
      setCoinIdMap(idMap);
    };

    if (positionSymbols.length > 0) {
      fetchCoinIds();
    }
  }, [positionSymbols]);

  const coinIds = Object.values(coinIdMap);

  // Fetch real-time quotes for all positions
  const { data: quotes = {} } = useCryptoQuotes(coinIds, coinIds.length > 0);

  // Transform positions with real-time prices
  const positions = useMemo(() => {
    if (!allPositions) return [];
    const cryptoPositions = allPositions
      .filter((p) => p.asset_type === 'crypto' && p.status === 'open')
      .map((p) => {
        try {
          return toCryptoPosition(p);
        } catch (e) {
          return null;
        }
      })
      .filter((p): p is CryptoPosition => p !== null);

    // Update positions with real-time quotes
    return cryptoPositions.map((position) => {
      const quote = quotes[position.symbol];
      if (quote) {
        const currentPrice = quote.current_price;
        const marketValue = position.quantity * currentPrice;
        const costBasis = position.costBasis;
        const unrealizedPL = marketValue - costBasis;
        const unrealizedPLPercent = costBasis > 0 ? (unrealizedPL / costBasis) * 100 : 0;

        return {
          ...position,
          currentPrice,
          marketValue,
          unrealizedPL,
          unrealizedPLPercent,
        };
      }
      return position;
    });
  }, [allPositions, quotes]);

  // Transform transactions
  const transactions = useMemo(() => {
    if (!allTransactions) return [];
    return allTransactions
      .filter((t) => t.asset_type === 'crypto')
      .map((t) => {
        try {
          return toCryptoTransaction(t);
        } catch (e) {
          return null;
        }
      })
      .filter((t): t is CryptoTransaction => t !== null);
  }, [allTransactions]);

  // Filter positions
  const filteredPositions = useMemo(() => {
    if (!searchQuery) return positions;
    return positions.filter(pos =>
      pos.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pos.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, positions]);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    if (!searchQuery) return transactions;
    return transactions.filter(tx =>
      tx.symbol.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, transactions]);

  const portfolioSummary = useMemo(() => {
    const totalValue = positions.reduce((sum, pos) => sum + (pos.marketValue || 0), 0);
    const totalCost = positions.reduce((sum, pos) => sum + pos.costBasis, 0);
    const totalPL = positions.reduce((sum, pos) => sum + (pos.unrealizedPL || 0), 0);
    const totalPLPercent = totalCost > 0 ? (totalPL / totalCost) * 100 : 0;

    return {
      totalValue,
      totalCost,
      totalPL,
      totalPLPercent,
      positionsCount: positions.length,
    };
  }, [positions]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatPercent = (percent: number) => {
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
  };

  const formatDate = formatDateUtil;

  const handleSellClick = (position: CryptoPosition) => {
    setSelectedPositionForSell(position);
    setShowSellForm(true);
  };

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
            Cryptocurrency
          </h1>
          <p className="text-slate-500 mt-2 text-lg">
            Track your crypto holdings and transactions
          </p>
          <div className="mt-3">
            <MarketStatusIndicator assetType="crypto" />
          </div>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-xl text-slate-300 text-sm font-medium transition-all">
            <Download size={18} className="inline mr-2" />
            Export
          </button>
          <button
            onClick={() => setShowTransactionForm(true)}
            className="px-4 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm font-medium transition-all"
          >
            <Plus size={18} className="inline mr-2" />
            Add Trade
          </button>
        </div>
      </div>

      {/* Portfolio Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          title="Total Value"
          value={formatCurrency(portfolioSummary.totalValue)}
          icon={DollarSign}
          positive
        />
        <StatCard
          title="Total Cost"
          value={formatCurrency(portfolioSummary.totalCost)}
          icon={DollarSign}
          positive
        />
        <StatCard
          title="Unrealized P&L"
          value={formatCurrency(portfolioSummary.totalPL)}
          subtitle={formatPercent(portfolioSummary.totalPLPercent)}
          icon={TrendingUp}
          positive={portfolioSummary.totalPL >= 0}
        />
        <StatCard
          title="Holdings"
          value={portfolioSummary.positionsCount.toString()}
          icon={Activity}
          positive
        />
      </div>

      {/* Tabs */}
      <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-800/50 overflow-hidden">
        <div className="flex border-b border-slate-800/50">
          <button
            onClick={() => setActiveTab('positions')}
            className={`px-6 py-3 font-medium transition-all ${
              activeTab === 'positions'
                ? 'text-emerald-400 border-b-2 border-emerald-500/50'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            Positions
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-6 py-3 font-medium transition-all ${
              activeTab === 'transactions'
                ? 'text-emerald-400 border-b-2 border-emerald-500/50'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            Transactions
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-slate-800/50">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Search by symbol..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-xl text-slate-300 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
            />
          </div>
        </div>

        {/* Content */}
        <div className="overflow-x-auto">
          {activeTab === 'positions' ? (
            <table className="w-full">
              <thead className="bg-slate-800/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Asset
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Avg Price
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Current Price
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Market Value
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Unrealized P&L
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                    P&L %
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {positionsLoading ? (
                  <TableSkeleton rows={5} columns={8} />
                ) : filteredPositions.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-6 py-8 text-center text-slate-400"
                    >
                      No positions found
                    </td>
                  </tr>
                ) : (
                  filteredPositions.map((position) => (
                    <tr
                      key={position.id}
                      className="hover:bg-slate-800/30 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="font-semibold text-slate-100">
                            {position.symbol}
                          </div>
                          <div className="text-sm text-slate-400">
                            {position.name}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-100">
                        {position.quantity.toFixed(8)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-100">
                        {formatCurrency(position.averagePrice)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-100">
                        {formatCurrency(position.currentPrice || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-slate-100">
                        {formatCurrency(position.marketValue || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <span
                          className={`font-semibold ${
                            (position.unrealizedPL || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {formatCurrency(position.unrealizedPL || 0)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <div className="flex items-center justify-end gap-1">
                          {(position.unrealizedPLPercent || 0) >= 0 ? (
                            <TrendingUp size={16} className="text-emerald-400" />
                          ) : (
                            <TrendingDown size={16} className="text-red-400" />
                          )}
                          <span
                            className={`font-semibold ${
                              (position.unrealizedPLPercent || 0) >= 0
                                ? 'text-emerald-400'
                                : 'text-red-400'
                            }`}
                          >
                            {formatPercent(position.unrealizedPLPercent || 0)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSellClick(position);
                          }}
                          className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm font-medium transition-all"
                        >
                          Sell
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-800/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Symbol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Fees
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {transactionsLoading ? (
                  <TableSkeleton rows={5} columns={7} />
                ) : filteredTransactions.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-8 text-center text-slate-400"
                    >
                      No transactions found
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((transaction) => (
                    <tr
                      key={transaction.id}
                      className="hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-100">
                        {formatDate(transaction.activityDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-semibold text-slate-100">
                          {transaction.symbol}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            transaction.transactionType === 'buy'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-red-500/20 text-red-400 border border-red-500/30'
                          }`}
                        >
                          {transaction.transactionType.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-100">
                        {transaction.quantity.toFixed(8)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-100">
                        {transaction.price ? formatCurrency(transaction.price) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-slate-100">
                        {formatCurrency(transaction.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-400">
                        {transaction.fees ? formatCurrency(transaction.fees) : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Sell Position Form Modal */}
      {showSellForm && selectedPositionForSell && (
        <SellCryptoPositionForm
          position={selectedPositionForSell}
          userId={userId}
          onClose={() => {
            setShowSellForm(false);
            setSelectedPositionForSell(null);
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['positions'] });
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            queryClient.invalidateQueries({ queryKey: ['cash_transactions'] });
            queryClient.invalidateQueries({ queryKey: ['cash-balance'] });
            setShowSellForm(false);
            setSelectedPositionForSell(null);
          }}
        />
      )}

      {/* Add Transaction Form Modal (for new trades) */}
      {showTransactionForm && !showSellForm && (
        <CryptoTransactionForm
          userId={userId}
          onClose={() => {
            setShowTransactionForm(false);
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['positions'] });
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            queryClient.invalidateQueries({ queryKey: ['cash_transactions'] });
            queryClient.invalidateQueries({ queryKey: ['cash-balance'] });
            setShowTransactionForm(false);
          }}
        />
      )}
    </div>
  );
};

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  positive: boolean;
}

const StatCard = ({ title, value, subtitle, icon: Icon, positive }: StatCardProps) => (
  <div className="group relative bg-gradient-to-br from-slate-900/50 to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-800/50 p-6 hover:border-emerald-500/30 transition-all duration-300 overflow-hidden ">
    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 to-emerald-500/0 group-hover:from-emerald-500/5 group-hover:to-transparent transition-all duration-300" />
    <div className="relative">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-slate-400">{title}</span>
        <div className={`p-2.5 rounded-xl ${positive ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
          <Icon className={`w-5 h-5 ${positive ? 'text-emerald-400' : 'text-red-400'}`} />
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-3xl font-bold text-slate-100">{value}</p>
        {subtitle && (
          <p className={`text-sm font-medium ${positive ? 'text-emerald-400' : 'text-red-400'}`}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  </div>
);

export default Crypto;
