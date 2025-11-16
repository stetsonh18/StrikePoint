import React, { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, Plus, Download, Search, Calendar, DollarSign, Activity, Sparkles, Layers } from 'lucide-react';
import type { OptionContract, OptionTransaction, OptionChainEntry } from '@/domain/types';
import { useAuthStore } from '@/application/stores/auth.store';
import { usePositions } from '@/application/hooks/usePositions';
import { useTransactions } from '@/application/hooks/useTransactions';
import { toOptionContract, toOptionTransaction } from '@/shared/utils/positionTransformers';
import { TransactionForm } from '@/presentation/components/TransactionForm';
import { OptionsMultiLegForm } from '@/presentation/components/OptionsMultiLegForm';
import { OptionsChain } from '@/presentation/components/OptionsChain';
import { MarketStatusIndicator } from '@/presentation/components/MarketStatusIndicator';
import { useQueryClient } from '@tanstack/react-query';
import { TableSkeleton } from '@/presentation/components/SkeletonLoader';
import { formatDate as formatDateUtil } from '@/shared/utils/dateUtils';

const Options: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const userId = user?.id || '';
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'positions' | 'transactions' | 'chain'>('positions');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'call' | 'put'>('all');
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [showMultiLegForm, setShowMultiLegForm] = useState(false);
  const [chainSymbol, setChainSymbol] = useState('');

  // Fetch option positions
  const { data: allPositions, isLoading: positionsLoading } = usePositions(userId, {
    asset_type: 'option',
    status: 'open',
  });

  // Fetch option transactions
  const { data: allTransactions, isLoading: transactionsLoading } = useTransactions(userId, {
    asset_type: 'option',
  });

  // Transform positions
  const positions = useMemo(() => {
    if (!allPositions) return [];
    return allPositions
      .filter((p) => p.asset_type === 'option' && p.status === 'open' && p.option_type && p.strike_price && p.expiration_date)
      .map((p) => {
        try {
          return toOptionContract(p);
        } catch (e) {
          return null;
        }
      })
      .filter((p): p is OptionContract => p !== null);
  }, [allPositions]);

  // Transform transactions
  const transactions = useMemo(() => {
    if (!allTransactions) return [];
    return allTransactions
      .filter((t) => t.asset_type === 'option' && t.option_type && t.strike_price && t.expiration_date)
      .map((t) => {
        try {
          return toOptionTransaction(t);
        } catch (e) {
          return null;
        }
      })
      .filter((t): t is OptionTransaction => t !== null);
  }, [allTransactions]);

  // Calculate portfolio summary
  const portfolioSummary = useMemo(() => {
    const totalValue = positions.reduce((sum, pos) => sum + (pos.marketValue || 0), 0);
    const totalCost = positions.reduce((sum, pos) => sum + pos.costBasis, 0);
    const totalPL = positions.reduce((sum, pos) => sum + (pos.unrealizedPL || 0), 0);
    const totalPLPercent = totalCost > 0 ? (totalPL / totalCost) * 100 : 0;

    const callsCount = positions.filter(p => p.optionType === 'call').length;
    const putsCount = positions.filter(p => p.optionType === 'put').length;

    return {
      totalValue,
      totalCost,
      totalPL,
      totalPLPercent,
      positionsCount: positions.length,
      callsCount,
      putsCount,
    };
  }, [positions]);

  // Filter positions
  const filteredPositions = useMemo(() => {
    let filtered = positions;

    if (searchQuery) {
      filtered = filtered.filter(pos =>
        pos.underlyingSymbol.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filterType !== 'all') {
      filtered = filtered.filter(pos => pos.optionType === filterType);
    }

    return filtered;
  }, [searchQuery, filterType, positions]);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    if (!searchQuery) return transactions;
    return transactions.filter(tx =>
      tx.underlyingSymbol.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, transactions]);

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

  const getDaysToExpiration = (expirationDate: string) => {
    const today = new Date();
    const expDate = new Date(expirationDate);
    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
            Options
          </h1>
          <p className="text-slate-500 mt-2 text-lg">
            Track your options positions, strategies, and Greeks
          </p>
          <div className="mt-3">
            <MarketStatusIndicator assetType="option" />
          </div>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-xl text-slate-300 text-sm font-medium transition-all">
            <Download size={18} className="inline mr-2" />
            Export
          </button>
          <button
            onClick={() => setShowMultiLegForm(true)}
            className="px-4 py-2.5 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded-xl text-purple-400 text-sm font-medium transition-all"
          >
            <Layers size={18} className="inline mr-2" />
            Multi-Leg Strategy
          </button>
          <button
            onClick={() => setShowTransactionForm(true)}
            className="px-4 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm font-medium transition-all"
          >
            <Plus size={18} className="inline mr-2" />
            Single Leg Strategy
          </button>
        </div>
      </div>

      {/* Portfolio Summary */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <StatCard
          title="Total Value"
          value={formatCurrency(portfolioSummary.totalValue)}
          icon={DollarSign}
          positive
        />
        <StatCard
          title="Cost Basis"
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
          title="Total Positions"
          value={portfolioSummary.positionsCount.toString()}
          icon={Activity}
          positive
        />
        <StatCard
          title="Calls / Puts"
          value={`${portfolioSummary.callsCount} / ${portfolioSummary.putsCount}`}
          icon={Sparkles}
          positive
        />
      </div>

      {/* Tabs */}
      <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-800/50 overflow-hidden ">
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
          <button
            onClick={() => setActiveTab('chain')}
            className={`px-6 py-3 font-medium transition-all ${
              activeTab === 'chain'
                ? 'text-emerald-400 border-b-2 border-emerald-500/50'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            Options Chain
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-slate-800/50 flex gap-4">
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Search by underlying symbol..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-xl text-slate-300 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
            />
          </div>
          {activeTab === 'positions' && (
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-xl text-slate-300 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
            >
              <option value="all">All Types</option>
              <option value="call">Calls Only</option>
              <option value="put">Puts Only</option>
            </select>
          )}
        </div>

        {/* Content */}
        <div className="overflow-x-auto">
          {activeTab === 'chain' ? (
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Underlying Symbol
                </label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={chainSymbol}
                    onChange={(e) => setChainSymbol(e.target.value.toUpperCase())}
                    placeholder="AAPL"
                    className="flex-1 px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-xl text-slate-300 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                  />
                </div>
              </div>
              {chainSymbol ? (
                <OptionsChain
                  underlyingSymbol={chainSymbol}
                  onSelectOption={(entry: OptionChainEntry) => {
                    // Pre-fill transaction form with selected option
                    setChainSymbol('');
                    setActiveTab('positions');
                    setShowTransactionForm(true);
                    // Could pass entry data to form if needed
                  }}
                />
              ) : (
                <div className="text-center py-12 text-slate-400">
                  <p>Enter an underlying symbol to view options chain</p>
                </div>
              )}
            </div>
          ) : activeTab === 'positions' ? (
            <table className="w-full">
              <thead className="bg-slate-800/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Symbol
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Strike
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Expiration
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Contracts
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Avg Price
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Current
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Value
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                      P&L
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Delta
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {positionsLoading ? (
                    <TableSkeleton rows={5} columns={10} />
                  ) : filteredPositions.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-6 py-8 text-center text-slate-400">
                        No positions found
                      </td>
                    </tr>
                  ) : (
                    filteredPositions.map((position) => {
                      const daysToExp = getDaysToExpiration(position.expirationDate);
                      return (
                        <tr
                          key={position.id}
                          className="hover:bg-slate-800/30 transition-colors cursor-pointer"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="font-semibold text-slate-100">
                              {position.underlyingSymbol}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                position.optionType === 'call'
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-red-500/20 text-red-400 border border-red-500/30'
                              }`}
                            >
                              {position.optionType.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-100">
                            ${position.strikePrice}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-100">
                            <div className="flex items-center gap-1">
                              <Calendar size={14} className="text-slate-400" />
                              <span>{formatDate(position.expirationDate)}</span>
                              <span className={`text-xs ${daysToExp < 7 ? 'text-red-500 dark:text-red-400' : 'text-slate-400'}`}>
                                ({daysToExp}d)
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-100">
                            {position.quantity}
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
                            <div>
                              <span
                              className={`font-semibold ${
                                (position.unrealizedPL || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
                              }`}
                              >
                                {formatCurrency(position.unrealizedPL || 0)}
                              </span>
                              <div className={`text-xs ${(position.unrealizedPLPercent || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {formatPercent(position.unrealizedPLPercent || 0)}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-100">
                            {position.delta?.toFixed(2) || '-'}
                          </td>
                        </tr>
                      );
                    })
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
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Contracts
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {transactionsLoading ? (
                    <TableSkeleton rows={5} columns={6} />
                  ) : filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
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
                        <td className="px-6 py-4 text-sm text-slate-100">
                          {transaction.description}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                transaction.transactionType === 'BTO' || transaction.transactionType === 'STO'
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30'
                              }`}
                          >
                            {transaction.transactionType}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-100">
                          {transaction.quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-100">
                          {transaction.price ? formatCurrency(transaction.price) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-slate-100">
                          {transaction.amount ? formatCurrency(Math.abs(transaction.amount)) : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
        </div>
      </div>

      {/* Transaction Form Modal */}
      {showTransactionForm && (
        <TransactionForm
          assetType="option"
          userId={userId}
          onClose={() => setShowTransactionForm(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['positions'] });
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            queryClient.invalidateQueries({ queryKey: ['cash-balance'] });
            setShowTransactionForm(false);
          }}
        />
      )}

      {/* Multi-Leg Strategy Form Modal */}
      {showMultiLegForm && (
        <OptionsMultiLegForm
          userId={userId}
          onClose={() => setShowMultiLegForm(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['positions'] });
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            queryClient.invalidateQueries({ queryKey: ['cash-balance'] });
            queryClient.invalidateQueries({ queryKey: ['strategies'] });
            setShowMultiLegForm(false);
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

export default Options;
