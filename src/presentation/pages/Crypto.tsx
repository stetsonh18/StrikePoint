import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { TrendingUp, TrendingDown, Plus, Download, Search, DollarSign, Activity, Edit, Trash2 } from 'lucide-react';
import type { CryptoPosition, CryptoTransaction, Position, Transaction } from '@/domain/types';
import { useAuthStore } from '@/application/stores/auth.store';
import { usePositions, useUpdatePosition, useDeletePosition } from '@/application/hooks/usePositions';
import { useTransactions, useUpdateTransaction, useDeleteTransaction } from '@/application/hooks/useTransactions';
import { useCryptoQuotes } from '@/application/hooks/useCryptoQuotes';
import { getCoinIdFromSymbol } from '@/infrastructure/services/cryptoMarketDataService';
import { toCryptoPosition, toCryptoTransaction } from '@/shared/utils/positionTransformers';
import { CryptoTransactionForm } from '@/presentation/components/CryptoTransactionForm';
import { PositionEditForm } from '@/presentation/components/PositionEditForm';
import { SellCryptoPositionForm } from '@/presentation/components/SellCryptoPositionForm';
import { MarketStatusIndicator } from '@/presentation/components/MarketStatusIndicator';
import { formatDate as formatDateUtil } from '@/shared/utils/dateUtils';
import { useQueryClient } from '@tanstack/react-query';
import { TableSkeleton } from '@/presentation/components/SkeletonLoader';
import { useToast } from '@/shared/hooks/useToast';
import { useConfirmation } from '@/shared/hooks/useConfirmation';
import { ConfirmationDialog } from '@/presentation/components/ConfirmationDialog';
import { SortableTableHeader } from '@/presentation/components/SortableTableHeader';
import { sortData, type SortConfig } from '@/shared/utils/tableSorting';
import { getUserFriendlyErrorMessage } from '@/shared/utils/errorHandler';
import { MobileTableCard, MobileTableCardHeader, MobileTableCardRow } from '@/presentation/components/MobileTableCard';

const Crypto: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const userId = user?.id || '';
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'positions' | 'transactions'>('positions');
  const [searchQuery, setSearchQuery] = useState('');
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [showSellForm, setShowSellForm] = useState(false);
  const [selectedPositionForSell, setSelectedPositionForSell] = useState<CryptoPosition | null>(null);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [positionSort, setPositionSort] = useState<SortConfig<CryptoPosition> | null>(null);
  const [transactionSort, setTransactionSort] = useState<SortConfig<CryptoTransaction> | null>(null);
  
  const toast = useToast();
  const confirmation = useConfirmation();
  const updatePositionMutation = useUpdatePosition();
  const deletePositionMutation = useDeletePosition();
  const updateTransactionMutation = useUpdateTransaction();
  const deleteTransactionMutation = useDeleteTransaction();

  // Fetch crypto positions (open only for display)
  const { data: allPositions, isLoading: positionsLoading } = usePositions(userId, {
    asset_type: 'crypto',
    status: 'open',
  });

  // Fetch all crypto positions (including closed) for realized P&L calculation
  const { data: allCryptoPositions } = usePositions(userId, {
    asset_type: 'crypto',
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
          name: quote.name || position.name, // Use quote name if available, fallback to mapped name
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

  // Filter and sort positions
  const filteredPositions = useMemo(() => {
    let filtered = positions;
    if (searchQuery) {
      filtered = filtered.filter(pos =>
        pos.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pos.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return sortData(filtered, positionSort);
  }, [searchQuery, positions, positionSort]);

  // Filter and sort transactions
  const filteredTransactions = useMemo(() => {
    let filtered = transactions;
    if (searchQuery) {
      filtered = filtered.filter(tx =>
        tx.symbol.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return sortData(filtered, transactionSort);
  }, [searchQuery, transactions, transactionSort]);

  // Calculate realized P&L from all crypto positions (including closed)
  const realizedPL = useMemo(() => {
    if (!allCryptoPositions) return 0;
    return allCryptoPositions.reduce((sum, pos) => sum + (pos.realized_pl || 0), 0);
  }, [allCryptoPositions]);

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
      realizedPL,
    };
  }, [positions, realizedPL]);

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

  const handleEditPosition = useCallback((position: CryptoPosition) => {
    // Find the original position from allPositions
    const originalPosition = allPositions?.find(p => p.id === position.id);
    if (originalPosition) {
      setEditingPosition(originalPosition);
      setShowTransactionForm(true);
    }
  }, [allPositions]);

  const handleDeletePosition = useCallback(async (position: CryptoPosition) => {
    const confirmed = await confirmation.confirm({
      title: 'Delete Position',
      message: `Are you sure you want to delete the position for ${position.symbol}? This action cannot be undone.`,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      variant: 'danger',
    });

    if (!confirmed) return;
    await deletePositionMutation.mutateAsync({ id: position.id, userId });
  }, [confirmation, deletePositionMutation]);

  const handleEditTransaction = useCallback((transaction: CryptoTransaction) => {
    // Find the original transaction from allTransactions
    const originalTransaction = allTransactions?.find(t => t.id === transaction.id);
    if (originalTransaction) {
      setEditingTransaction(originalTransaction);
      setShowTransactionForm(true);
    }
  }, [allTransactions]);

  const handleDeleteTransaction = useCallback(async (transaction: CryptoTransaction) => {
    const confirmed = await confirmation.confirm({
      title: 'Delete Transaction',
      message: `Are you sure you want to delete this transaction? This action cannot be undone and may affect your positions.`,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      variant: 'danger',
    });

    if (!confirmed) return;
    await deleteTransactionMutation.mutateAsync({ id: transaction.id, userId });
  }, [confirmation, deleteTransactionMutation]);

  return (
    <div className="p-4 md:p-8 space-y-4 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400 bg-clip-text text-transparent">
            Cryptocurrency
          </h1>
          <p className="text-slate-600 dark:text-slate-500 mt-2 text-lg">
            Track your crypto holdings and transactions
          </p>
          <div className="mt-3">
            <MarketStatusIndicator assetType="crypto" />
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <button className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700/50 rounded-xl text-slate-700 dark:text-slate-300 text-sm font-medium transition-all touch-target w-full sm:w-auto">
            <Download size={18} className="inline mr-2" />
            Export
          </button>
          <button
            onClick={() => setShowTransactionForm(true)}
            className="px-4 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm font-medium transition-all touch-target w-full sm:w-auto"
          >
            <Plus size={18} className="inline mr-2" />
            Add Trade
          </button>
        </div>
      </div>

      {/* Portfolio Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-6">
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
          title="Realized P&L"
          value={formatCurrency(portfolioSummary.realizedPL)}
          icon={TrendingUp}
          positive={portfolioSummary.realizedPL >= 0}
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
      <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/50 dark:to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-800/50 overflow-hidden shadow-sm dark:shadow-none">
        <div className="flex border-b border-slate-200 dark:border-slate-800/50">
          <button
            onClick={() => setActiveTab('positions')}
            className={`flex-1 px-4 md:px-6 py-3 font-medium transition-all touch-target ${
              activeTab === 'positions'
                ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500/50'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300'
            }`}
          >
            Positions
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`flex-1 px-4 md:px-6 py-3 font-medium transition-all touch-target ${
              activeTab === 'transactions'
                ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500/50'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300'
            }`}
          >
            Transactions
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800/50">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 dark:text-slate-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Search by symbol..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700/50 rounded-xl text-slate-900 dark:text-slate-300 placeholder-slate-500 dark:placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
            />
          </div>
        </div>

        {/* Content */}
        {/* Mobile Card Views */}
        {activeTab === 'positions' && (
          <div className="md:hidden space-y-3">
            {positionsLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/50 rounded-xl p-4 animate-pulse">
                    <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/3 mb-3"></div>
                    <div className="space-y-2">
                      <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded"></div>
                      <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded"></div>
                      <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredPositions.length === 0 ? (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                No positions found
              </div>
            ) : (
              filteredPositions.map((position) => (
                <MobileTableCard key={position.id}>
                  <MobileTableCardHeader
                    title={position.symbol}
                    subtitle={position.name}
                    actions={
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditPosition(position);
                          }}
                          className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors touch-target"
                          title="Edit position"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePosition(position);
                          }}
                          className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 rounded transition-colors touch-target"
                          title="Delete position"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    }
                  />
                  <MobileTableCardRow label="Quantity" value={position.quantity.toFixed(8)} />
                  <MobileTableCardRow label="Avg Price" value={formatCurrency(position.averagePrice)} />
                  <MobileTableCardRow label="Current Price" value={formatCurrency(position.currentPrice || 0)} />
                  <MobileTableCardRow label="Market Value" value={formatCurrency(position.marketValue || 0)} highlight />
                  <MobileTableCardRow
                    label="Unrealized P&L"
                    value={formatCurrency(position.unrealizedPL || 0)}
                    positive={(position.unrealizedPL || 0) >= 0}
                    negative={(position.unrealizedPL || 0) < 0}
                    highlight
                  />
                  <MobileTableCardRow
                    label="P&L %"
                    value={formatPercent(position.unrealizedPLPercent || 0)}
                    positive={(position.unrealizedPLPercent || 0) >= 0}
                    negative={(position.unrealizedPLPercent || 0) < 0}
                  />
                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800/50">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSellClick(position);
                      }}
                      className="w-full px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm font-medium transition-all touch-target"
                    >
                      Sell Position
                    </button>
                  </div>
                </MobileTableCard>
              ))
            )}
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="md:hidden space-y-3">
            {transactionsLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/50 rounded-xl p-4 animate-pulse">
                    <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/3 mb-3"></div>
                    <div className="space-y-2">
                      <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded"></div>
                      <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                No transactions found
              </div>
            ) : (
              filteredTransactions.map((transaction) => (
                <MobileTableCard key={transaction.id}>
                  <MobileTableCardHeader
                    title={transaction.symbol}
                    subtitle={formatDateUtil(transaction.activityDate)}
                    actions={
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditTransaction(transaction);
                          }}
                          className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors touch-target"
                          title="Edit transaction"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTransaction(transaction);
                          }}
                          className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 rounded transition-colors touch-target"
                          title="Delete transaction"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    }
                  />
                  <MobileTableCardRow label="Type" value={transaction.transactionType} />
                  <MobileTableCardRow label="Quantity" value={transaction.quantity.toFixed(8)} />
                  <MobileTableCardRow label="Price" value={formatCurrency(transaction.price || 0)} />
                  <MobileTableCardRow label="Amount" value={formatCurrency(Math.abs(transaction.amount || 0))} highlight />
                  <MobileTableCardRow label="Fees" value={formatCurrency(transaction.fees || 0)} />
                </MobileTableCard>
              ))
            )}
          </div>
        )}

        {/* Desktop Table Views */}
        <div className="hidden md:block overflow-x-auto table-wrapper">
          {activeTab === 'positions' ? (
            <table className="w-full">
              <thead className="bg-slate-100 dark:bg-slate-800/50">
                <tr>
                  <SortableTableHeader
                    label="Asset"
                    sortKey="symbol"
                    currentSort={positionSort}
                    onSortChange={setPositionSort}
                    align="left"
                  />
                  <SortableTableHeader
                    label="Quantity"
                    sortKey="quantity"
                    currentSort={positionSort}
                    onSortChange={setPositionSort}
                    align="right"
                  />
                  <SortableTableHeader
                    label="Avg Price"
                    sortKey="averagePrice"
                    currentSort={positionSort}
                    onSortChange={setPositionSort}
                    align="right"
                  />
                  <SortableTableHeader
                    label="Current Price"
                    sortKey="currentPrice"
                    currentSort={positionSort}
                    onSortChange={setPositionSort}
                    align="right"
                  />
                  <SortableTableHeader
                    label="Market Value"
                    sortKey="marketValue"
                    currentSort={positionSort}
                    onSortChange={setPositionSort}
                    align="right"
                  />
                  <SortableTableHeader
                    label="Unrealized P&L"
                    sortKey="unrealizedPL"
                    currentSort={positionSort}
                    onSortChange={setPositionSort}
                    align="right"
                  />
                  <SortableTableHeader
                    label="P&L %"
                    sortKey="unrealizedPLPercent"
                    currentSort={positionSort}
                    onSortChange={setPositionSort}
                    align="right"
                  />
                  <th className="px-6 py-3 text-center text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/50">
                {positionsLoading ? (
                  <TableSkeleton rows={5} columns={8} />
                ) : filteredPositions.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-6 py-8 text-center text-slate-500 dark:text-slate-400"
                    >
                      No positions found
                    </td>
                  </tr>
                ) : (
                  filteredPositions.map((position) => (
                    <tr
                      key={position.id}
                      className="hover:bg-slate-100 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {position.symbol}
                          </div>
                          <div className="text-sm text-slate-500 dark:text-slate-400">
                            {position.name}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-900 dark:text-slate-100">
                        {position.quantity.toFixed(8)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-900 dark:text-slate-100">
                        {formatCurrency(position.averagePrice)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-900 dark:text-slate-100">
                        {formatCurrency(position.currentPrice || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-slate-900 dark:text-slate-100">
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
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSellClick(position);
                            }}
                            className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm font-medium transition-all"
                          >
                            Sell
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditPosition(position);
                            }}
                            className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors"
                            title="Edit position"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePosition(position);
                            }}
                            className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                            title="Delete position"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-100 dark:bg-slate-800/50">
                <tr>
                  <SortableTableHeader
                    label="Date"
                    sortKey="activityDate"
                    currentSort={transactionSort}
                    onSortChange={setTransactionSort}
                    align="left"
                  />
                  <SortableTableHeader
                    label="Symbol"
                    sortKey="symbol"
                    currentSort={transactionSort}
                    onSortChange={setTransactionSort}
                    align="left"
                  />
                  <SortableTableHeader
                    label="Type"
                    sortKey="transactionType"
                    currentSort={transactionSort}
                    onSortChange={setTransactionSort}
                    align="left"
                  />
                  <SortableTableHeader
                    label="Quantity"
                    sortKey="quantity"
                    currentSort={transactionSort}
                    onSortChange={setTransactionSort}
                    align="right"
                  />
                  <SortableTableHeader
                    label="Price"
                    sortKey="price"
                    currentSort={transactionSort}
                    onSortChange={setTransactionSort}
                    align="right"
                  />
                  <SortableTableHeader
                    label="Amount"
                    sortKey="amount"
                    currentSort={transactionSort}
                    onSortChange={setTransactionSort}
                    align="right"
                  />
                  <SortableTableHeader
                    label="Fees"
                    sortKey="fees"
                    currentSort={transactionSort}
                    onSortChange={setTransactionSort}
                    align="right"
                  />
                  <th className="px-6 py-3 text-center text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/50">
                {transactionsLoading ? (
                  <TableSkeleton rows={5} columns={8} />
                ) : filteredTransactions.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-6 py-8 text-center text-slate-500 dark:text-slate-400"
                    >
                      No transactions found
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((transaction) => (
                    <tr
                      key={transaction.id}
                      className="hover:bg-slate-100 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100">
                        {formatDate(transaction.activityDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
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
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-900 dark:text-slate-100">
                        {transaction.quantity.toFixed(8)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-900 dark:text-slate-100">
                        {transaction.price ? formatCurrency(transaction.price) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-slate-900 dark:text-slate-100">
                        {formatCurrency(transaction.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-400">
                        {transaction.fees ? formatCurrency(transaction.fees) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditTransaction(transaction);
                            }}
                            className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors"
                            title="Edit transaction"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTransaction(transaction);
                            }}
                            className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                            title="Delete transaction"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmation.isOpen}
        title={confirmation.options.title}
        message={confirmation.options.message}
        confirmLabel={confirmation.options.confirmLabel}
        cancelLabel={confirmation.options.cancelLabel}
        variant={confirmation.options.variant}
        onConfirm={confirmation.handleConfirm}
        onCancel={confirmation.handleCancel}
      />

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
        <>
          {editingPosition ? (
            <PositionEditForm
              position={editingPosition}
              userId={userId}
              onClose={() => {
                setShowTransactionForm(false);
                setEditingPosition(null);
                setEditingTransaction(null);
              }}
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ['positions'] });
                queryClient.invalidateQueries({ queryKey: ['position-statistics'] });
                setShowTransactionForm(false);
                setEditingPosition(null);
                setEditingTransaction(null);
              }}
            />
          ) : (
            <CryptoTransactionForm
              userId={userId}
              onClose={() => {
                setShowTransactionForm(false);
                setEditingPosition(null);
                setEditingTransaction(null);
              }}
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ['positions'] });
                queryClient.invalidateQueries({ queryKey: ['transactions'] });
                queryClient.invalidateQueries({ queryKey: ['cash_transactions'] });
                queryClient.invalidateQueries({ queryKey: ['cash-balance'] });
                setShowTransactionForm(false);
                setEditingPosition(null);
                setEditingTransaction(null);
              }}
            />
          )}
        </>
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
  <div className="group relative bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/50 dark:to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-800/50 p-6 hover:border-emerald-500/30 transition-all duration-300 overflow-hidden shadow-sm dark:shadow-none">
    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 to-emerald-500/0 group-hover:from-emerald-500/5 group-hover:to-transparent transition-all duration-300" />
    <div className="relative">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{title}</span>
        <div className={`p-2.5 rounded-xl ${positive ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
          <Icon className={`w-5 h-5 ${positive ? 'text-emerald-400' : 'text-red-400'}`} />
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
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
