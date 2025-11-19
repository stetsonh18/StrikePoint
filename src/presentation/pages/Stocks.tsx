import { useState, useMemo, useCallback } from 'react';
import { TrendingUp, TrendingDown, Plus, Download, Search, DollarSign, Activity, Edit, Trash2 } from 'lucide-react';
import type { StockPosition, StockTransaction, Transaction, Position } from '@/domain/types';
import { useAuthStore } from '@/application/stores/auth.store';
import { usePositions, useUpdatePosition, useDeletePosition } from '@/application/hooks/usePositions';
import { useTransactions, useUpdateTransaction, useDeleteTransaction } from '@/application/hooks/useTransactions';
import { useStockQuotes } from '@/application/hooks/useStockQuotes';
import { toStockPosition, toStockTransaction } from '@/shared/utils/positionTransformers';
import { formatDate as formatDateUtil } from '@/shared/utils/dateUtils';
import { TransactionForm } from '@/presentation/components/TransactionForm';
import { PositionEditForm } from '@/presentation/components/PositionEditForm';
import { SellPositionForm } from '@/presentation/components/SellPositionForm';
import { MarketStatusIndicator } from '@/presentation/components/MarketStatusIndicator';
import { useQueryClient } from '@tanstack/react-query';
import { TableSkeleton } from '@/presentation/components/SkeletonLoader';
import { useToast } from '@/shared/hooks/useToast';
import { useConfirmation } from '@/shared/hooks/useConfirmation';
import { ConfirmationDialog } from '@/presentation/components/ConfirmationDialog';
import { SortableTableHeader } from '@/presentation/components/SortableTableHeader';
import { sortData, type SortConfig } from '@/shared/utils/tableSorting';
import { getUserFriendlyErrorMessage } from '@/shared/utils/errorHandler';
import { StockPositionRow } from '@/presentation/components/tables/StockPositionRow';

const Stocks: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const userId = user?.id || '';
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'positions' | 'transactions'>('positions');
  const [searchQuery, setSearchQuery] = useState('');
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [showSellForm, setShowSellForm] = useState(false);
  const [selectedPositionForSell, setSelectedPositionForSell] = useState<StockPosition | null>(null);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [positionSort, setPositionSort] = useState<SortConfig<StockPosition> | null>(null);
  const [transactionSort, setTransactionSort] = useState<SortConfig<StockTransaction> | null>(null);
  
  const toast = useToast();
  const confirmation = useConfirmation();
  const updatePositionMutation = useUpdatePosition();
  const deletePositionMutation = useDeletePosition();
  const updateTransactionMutation = useUpdateTransaction();
  const deleteTransactionMutation = useDeleteTransaction();

  // Fetch stock positions (open only for display)
  const { data: allPositions, isLoading: positionsLoading } = usePositions(userId, {
    asset_type: 'stock',
    status: 'open',
  });

  // Fetch all stock positions (including closed) for realized P&L calculation
  const { data: allStockPositions } = usePositions(userId, {
    asset_type: 'stock',
  });

  // Fetch stock transactions
  const { data: allTransactions, isLoading: transactionsLoading } = useTransactions(userId, {
    asset_type: 'stock',
  });

  // Get unique symbols from positions for real-time quotes
  const positionSymbols = useMemo(() => {
    if (!allPositions) return [];
    return Array.from(
      new Set(
        allPositions
          .filter((p) => p.asset_type === 'stock' && p.status === 'open')
          .map((p) => p.symbol)
      )
    );
  }, [allPositions]);

  // Fetch real-time quotes for all positions
  const { data: quotes = {} } = useStockQuotes(positionSymbols, positionSymbols.length > 0);

  // Transform positions with real-time prices
  const positions = useMemo(() => {
    if (!allPositions) return [];
    const stockPositions = allPositions
      .filter((p) => p.asset_type === 'stock' && p.status === 'open')
      .map(toStockPosition);

      // Update positions with real-time quotes
      return stockPositions.map((position) => {
        const quote = quotes[position.symbol];
        if (quote && quote.price > 0) {
          const currentPrice = quote.price;
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
        // If no quote available, use average price as fallback
        return {
          ...position,
          currentPrice: position.averagePrice || 0,
          marketValue: position.quantity * (position.averagePrice || 0),
          unrealizedPL: 0,
          unrealizedPLPercent: 0,
        };
      });
  }, [allPositions, quotes]);

  // Transform transactions
  const transactions = useMemo(() => {
    if (!allTransactions) return [];
    return allTransactions
      .filter((t) => t.asset_type === 'stock')
      .map(toStockTransaction);
  }, [allTransactions]);

  // Calculate realized P&L from all stock positions (including closed)
  const realizedPL = useMemo(() => {
    if (!allStockPositions) return 0;
    return allStockPositions.reduce((sum, pos) => sum + (pos.realized_pl || 0), 0);
  }, [allStockPositions]);

  // Calculate portfolio summary
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

  // Filter and sort positions
  const filteredPositions = useMemo(() => {
    let filtered = positions;
    if (searchQuery) {
      filtered = filtered.filter(pos =>
        pos.symbol.toLowerCase().includes(searchQuery.toLowerCase())
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

  const handleSellClick = useCallback((position: StockPosition) => {
    setSelectedPositionForSell(position);
    setShowSellForm(true);
  }, []);

  const handleEditPosition = useCallback((position: StockPosition) => {
    // Find the original position from allPositions
    const originalPosition = allPositions?.find(p => p.id === position.id);
    if (originalPosition) {
      setEditingPosition(originalPosition);
      setShowTransactionForm(true);
    }
  }, [allPositions]);

  const handleDeletePosition = useCallback(async (position: StockPosition) => {
    const confirmed = await confirmation.confirm({
      title: 'Delete Position',
      message: `Are you sure you want to delete the position for ${position.symbol}? This action cannot be undone.`,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      variant: 'danger',
    });

    if (!confirmed) return;
    await deletePositionMutation.mutateAsync(position.id);
  }, [confirmation, deletePositionMutation]);

  const handleEditTransaction = useCallback((transaction: StockTransaction) => {
    // Find the original transaction from allTransactions
    const originalTransaction = allTransactions?.find(t => t.id === transaction.id);
    if (originalTransaction) {
      setEditingTransaction(originalTransaction);
      setShowTransactionForm(true);
    }
  }, [allTransactions]);

  const handleDeleteTransaction = useCallback(async (transaction: StockTransaction) => {
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
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400 bg-clip-text text-transparent">
            Stocks
          </h1>
          <p className="text-slate-600 dark:text-slate-500 mt-2 text-lg">
            Track your stock positions and transaction history
          </p>
          <div className="mt-3">
            <MarketStatusIndicator assetType="stock" />
          </div>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700/50 rounded-xl text-slate-700 dark:text-slate-300 text-sm font-medium transition-all">
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
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
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
          title="Positions"
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
            className={`px-6 py-3 font-medium transition-all ${
              activeTab === 'positions'
                ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500/50'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300'
            }`}
          >
            Positions
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-6 py-3 font-medium transition-all ${
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
        <div className="overflow-x-auto">
          {activeTab === 'positions' ? (
            <table className="w-full">
              <thead className="bg-slate-100 dark:bg-slate-800/50">
                <tr>
                  <SortableTableHeader
                    label="Symbol"
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
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {position.symbol}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-900 dark:text-slate-100">
                        {position.quantity}
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
                        {transaction.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-900 dark:text-slate-100">
                        {formatCurrency(transaction.price)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-slate-900 dark:text-slate-100">
                        {formatCurrency(transaction.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-500 dark:text-slate-400">
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
        <SellPositionForm
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
              }}
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ['positions'] });
                queryClient.invalidateQueries({ queryKey: ['position-statistics'] });
                setShowTransactionForm(false);
                setEditingPosition(null);
              }}
            />
          ) : (
            <TransactionForm
              assetType="stock"
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

export default Stocks;
