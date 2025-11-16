import React, { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, Plus, Download, Search, Calendar, DollarSign, Activity, Shield } from 'lucide-react';
import type { FuturesContract, FuturesTransaction } from '@/domain/types';
import { useAuthStore } from '@/application/stores/auth.store';
import { usePositions } from '@/application/hooks/usePositions';
import { useTransactions } from '@/application/hooks/useTransactions';
import { toFuturesContract, toFuturesTransaction } from '@/shared/utils/positionTransformers';
import { FuturesTransactionForm } from '@/presentation/components/FuturesTransactionForm';
import { MarketStatusIndicator } from '@/presentation/components/MarketStatusIndicator';
import { useQueryClient } from '@tanstack/react-query';
import { TableSkeleton } from '@/presentation/components/SkeletonLoader';
import { formatDate as formatDateUtil } from '@/shared/utils/dateUtils';

const Futures: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const userId = user?.id || '';
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'positions' | 'transactions'>('positions');
  const [searchQuery, setSearchQuery] = useState('');
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [showCloseForm, setShowCloseForm] = useState(false);
  const [selectedPositionForClose, setSelectedPositionForClose] = useState<FuturesContract | null>(null);

  // Fetch futures positions
  const { data: allPositions, isLoading: positionsLoading } = usePositions(userId, {
    asset_type: 'futures',
    status: 'open',
  });

  // Fetch futures transactions
  const { data: allTransactions, isLoading: transactionsLoading } = useTransactions(userId, {
    asset_type: 'futures',
  });

  // Transform positions
  const positions = useMemo(() => {
    if (!allPositions) return [];
    return allPositions
      .filter((p) => p.asset_type === 'futures' && p.status === 'open' && p.expiration_date)
      .map((p) => {
        try {
          return toFuturesContract(p);
        } catch (e) {
          return null;
        }
      })
      .filter((p): p is FuturesContract => p !== null);
  }, [allPositions]);

  // Transform transactions
  const transactions = useMemo(() => {
    if (!allTransactions) return [];
    return allTransactions
      .filter((t) => t.asset_type === 'futures')
      .map(toFuturesTransaction);
  }, [allTransactions]);

  // Filter positions by search
  const filteredPositions = useMemo(() => {
    if (!searchQuery) return positions;
    return positions.filter(
      (pos) =>
        pos.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pos.contractName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pos.contractMonth.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, positions]);

  // Filter transactions by search
  const filteredTransactions = useMemo(() => {
    if (!searchQuery) return transactions;
    return transactions.filter(
      (tx) =>
        tx.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.contractName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, transactions]);

  const portfolioSummary = useMemo(() => {
    const totalValue = positions.reduce((sum, pos) => sum + (pos.marketValue || 0), 0);
    const totalPL = positions.reduce((sum, pos) => sum + (pos.unrealizedPL || 0), 0);
    const totalMargin = positions.reduce((sum, pos) => sum + (pos.marginRequirement || 0), 0);

    return {
      totalValue,
      totalPL,
      totalMargin,
      positionsCount: positions.length,
      contractsCount: positions.reduce((sum, pos) => sum + pos.quantity, 0),
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

  const getDaysToExpiration = (expirationDate: string) => {
    const today = new Date();
    const expDate = new Date(expirationDate);
    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleClosePosition = (position: FuturesContract) => {
    setSelectedPositionForClose(position);
    setShowCloseForm(true);
  };

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
            Futures
          </h1>
          <p className="text-slate-500 mt-2 text-lg">
            Track your futures positions and contracts
          </p>
          <div className="mt-3 flex items-center gap-3">
            <MarketStatusIndicator assetType="futures" />
            <div className="text-sm text-amber-400/80 flex items-center gap-1.5">
              <span>•</span>
              <span>Real-time pricing coming soon</span>
            </div>
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
            Add Transaction
          </button>
        </div>
      </div>

      {/* Portfolio Summary */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <StatCard
          title="Notional Value"
          value={formatCurrency(portfolioSummary.totalValue)}
          icon={DollarSign}
          positive
        />
        <StatCard
          title="Unrealized P&L"
          value={formatCurrency(portfolioSummary.totalPL)}
          icon={TrendingUp}
          positive={portfolioSummary.totalPL >= 0}
        />
        <StatCard
          title="Margin Used"
          value={formatCurrency(portfolioSummary.totalMargin)}
          icon={Shield}
          positive
        />
        <StatCard
          title="Positions"
          value={portfolioSummary.positionsCount.toString()}
          icon={Activity}
          positive
        />
        <StatCard
          title="Total Contracts"
          value={portfolioSummary.contractsCount.toString()}
          icon={Activity}
          positive
        />
      </div>

      {/* Tabs and Tables */}
      <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-800/50 overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-slate-800/50">
          <button
            onClick={() => setActiveTab('positions')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-all ${
              activeTab === 'positions'
                ? 'text-emerald-400 border-b-2 border-emerald-500 bg-emerald-500/5'
                : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/30'
            }`}
          >
            Positions
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-all ${
              activeTab === 'transactions'
                ? 'text-emerald-400 border-b-2 border-emerald-500 bg-emerald-500/5'
                : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/30'
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
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-xl text-slate-300 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
            />
          </div>
        </div>

        {/* Positions Tab */}
        {activeTab === 'positions' && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Contract
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Month
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
                    Notional Value
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                    P&L
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Margin
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Action
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
                      className="hover:bg-slate-800/30 transition-colors"
                    >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="font-semibold text-slate-100">
                          {position.symbol}
                        </div>
                        <div className="text-sm text-slate-400">
                          {position.contractName}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-100">
                      {position.contractMonth}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-100">
                      <div className="flex items-center gap-1">
                        <Calendar size={14} className="text-gray-500 dark:text-slate-400" />
                        <span>{formatDate(position.expirationDate)}</span>
                        <span className={`text-xs ${daysToExp < 7 ? 'text-red-400' : 'text-gray-500 dark:text-slate-400'}`}>
                          ({daysToExp}d)
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-100">
                      {position.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-100">
                      {position.averagePrice.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-100">
                      {(position.currentPrice || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-slate-100">
                      {formatCurrency(position.marketValue || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <div>
                        <span
                          className={`font-semibold ${
                            (position.unrealizedPL || 0) >= 0 ? 'text-emerald-400' : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {formatCurrency(position.unrealizedPL || 0)}
                        </span>
                        <div
                          className={`text-xs ${
                            (position.unrealizedPLPercent || 0) >= 0 ? 'text-emerald-400' : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {formatPercent(position.unrealizedPLPercent || 0)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-100">
                      {formatCurrency(position.marginRequirement || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => handleClosePosition(position)}
                        className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-xs font-medium transition-all"
                      >
                        Close
                      </button>
                    </td>
                  </tr>
                );
                })
              )}
              </tbody>
            </table>
          </div>
        )}

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Contract
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Contracts
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Fees
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {transactionsLoading ? (
                  <TableSkeleton rows={5} columns={7} />
                ) : filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                      No transactions found
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-100">
                        {formatDate(tx.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="font-medium text-slate-100">{tx.symbol}</div>
                          <div className="text-sm text-slate-400">{tx.contractName}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            tx.transactionType === 'Buy'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-red-500/20 text-red-400 border border-red-500/30'
                          }`}
                        >
                          {tx.transactionType}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-100">
                        {tx.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-100">
                        ${tx.price.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-100">
                        ${tx.fees.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <span
                          className={tx.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}
                        >
                          {formatCurrency(Math.abs(tx.amount))}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transaction Form Modal */}
      {showTransactionForm && (
        <FuturesTransactionForm
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

      {/* Close Position Form Modal */}
      {showCloseForm && selectedPositionForClose && (
        <FuturesTransactionForm
          userId={userId}
          initialValues={{
            transactionType: 'Sell',
            maxQuantity: selectedPositionForClose.quantity,
          }}
          onClose={() => {
            setShowCloseForm(false);
            setSelectedPositionForClose(null);
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['positions'] });
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            queryClient.invalidateQueries({ queryKey: ['cash-balance'] });
            setShowCloseForm(false);
            setSelectedPositionForClose(null);
          }}
        />
      )}
    </div>
  );
};

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  positive: boolean;
}

const StatCard = ({ title, value, icon: Icon, positive }: StatCardProps) => (
  <div className="group relative bg-gradient-to-br from-slate-900/50 to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-800/50 p-6 hover:border-emerald-500/30 transition-all duration-300 overflow-hidden ">
    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 to-emerald-500/0 group-hover:from-emerald-500/5 group-hover:to-transparent transition-all duration-300" />
    <div className="relative">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-slate-400">{title}</span>
        <div className={`p-2.5 rounded-xl ${positive ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
          <Icon className={`w-5 h-5 ${positive ? 'text-emerald-400' : 'text-red-400'}`} />
        </div>
      </div>
      <p className="text-3xl font-bold text-slate-100">{value}</p>
    </div>
  </div>
);

export default Futures;
