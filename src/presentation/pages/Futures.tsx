import React, { useState, useMemo, useCallback } from 'react';
import { TrendingUp, TrendingDown, Plus, Download, Search, Calendar, DollarSign, Activity, Shield, Edit, Trash2 } from 'lucide-react';
import type { FuturesContract, FuturesTransaction, Position, Transaction } from '@/domain/types';
import { useAuthStore } from '@/application/stores/auth.store';
import { usePositions, useDeletePosition } from '@/application/hooks/usePositions';
import { useTransactions, useUpdateTransaction, useDeleteTransaction } from '@/application/hooks/useTransactions';
import { toFuturesContract, toFuturesTransaction } from '@/shared/utils/positionTransformers';
import { parseContractSymbol, FUTURES_MONTH_CODES } from '@/domain/types/futures.types';
import { FuturesTransactionForm } from '@/presentation/components/FuturesTransactionForm';
import { useActiveFuturesContractSpecs } from '@/application/hooks/useFuturesContractSpecs';
import { PositionEditForm } from '@/presentation/components/PositionEditForm';
import { MarketStatusIndicator } from '@/presentation/components/MarketStatusIndicator';
import { useQueryClient } from '@tanstack/react-query';
import { TableSkeleton } from '@/presentation/components/SkeletonLoader';
import { formatDate as formatDateUtil } from '@/shared/utils/dateUtils';
import { useToast } from '@/shared/hooks/useToast';
import { useConfirmation } from '@/shared/hooks/useConfirmation';
import { ConfirmationDialog } from '@/presentation/components/ConfirmationDialog';
import { SortableTableHeader } from '@/presentation/components/SortableTableHeader';
import { sortData, type SortConfig } from '@/shared/utils/tableSorting';
import { getUserFriendlyErrorMessage } from '@/shared/utils/errorHandler';
import { logger } from '@/shared/utils/logger';
import { MobileTableCard, MobileTableCardHeader, MobileTableCardRow } from '@/presentation/components/MobileTableCard';

const Futures: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const userId = user?.id || '';
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'positions' | 'transactions'>('positions');
  const [searchQuery, setSearchQuery] = useState('');
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [showCloseForm, setShowCloseForm] = useState(false);
  const [selectedPositionForClose, setSelectedPositionForClose] = useState<FuturesContract | null>(null);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [positionSort, setPositionSort] = useState<SortConfig<FuturesContract> | null>(null);
  const [transactionSort, setTransactionSort] = useState<SortConfig<FuturesTransaction> | null>(null);
  
  const toast = useToast();
  const confirmation = useConfirmation();
  const deletePositionMutation = useDeletePosition();
  const updateTransactionMutation = useUpdateTransaction();
  const deleteTransactionMutation = useDeleteTransaction();

  // Fetch contract specs for finding contract IDs
  const { data: contractSpecs = [] } = useActiveFuturesContractSpecs(userId);

  // Fetch open futures positions
  const { data: allPositions, isLoading: positionsLoading } = usePositions(userId, {
    asset_type: 'futures',
    status: 'open',
  });

  // Fetch closed futures positions for realized P&L calculation
  const { data: closedPositions = [] } = usePositions(userId, {
    asset_type: 'futures',
    status: 'closed',
  });

  // Fetch futures transactions
  const { data: allTransactions, isLoading: transactionsLoading } = useTransactions(userId, {
    asset_type: 'futures',
  });

  // Create a map of transaction IDs to transactions for quick lookup
  const transactionMap = useMemo(() => {
    if (!allTransactions) return new Map<string, Transaction>();
    const map = new Map<string, Transaction>();
    allTransactions.forEach((tx) => {
      map.set(tx.id, tx);
    });
    return map;
  }, [allTransactions]);

  // Transform positions with contract month backfill from transactions
  const positions = useMemo(() => {
    if (!allPositions) return [];
    return allPositions
      .filter((p) => p.asset_type === 'futures' && p.status === 'open')
      .map((p) => {
        try {
          // If contract_month is missing, try to get it from the opening transaction
          if (!p.contract_month && p.opening_transaction_ids && p.opening_transaction_ids.length > 0) {
            const openingTxId = p.opening_transaction_ids[0];
            const openingTx = transactionMap.get(openingTxId);
            if (openingTx?.instrument) {
              // Try to parse contract month from transaction's instrument field
              const parsed = parseContractSymbol(openingTx.instrument);
              if (parsed) {
                const monthName = FUTURES_MONTH_CODES[parsed.monthCode];
                const year = parsed.year.length === 2 ? `20${parsed.year}` : parsed.year;
                p.contract_month = monthName 
                  ? `${monthName.toUpperCase().slice(0, 3)}${year.slice(-2)}` 
                  : `${parsed.monthCode}${parsed.year}`;
              }
            }
          }
          return toFuturesContract(p);
        } catch (e) {
          logger.error('Error transforming futures position', e, { position: p });
          return null;
        }
      })
      .filter((p): p is FuturesContract => p !== null);
  }, [allPositions, transactionMap]);

  // Transform transactions
  const transactions = useMemo(() => {
    if (!allTransactions) return [];
    return allTransactions
      .filter((t) => t.asset_type === 'futures')
      .map(toFuturesTransaction);
  }, [allTransactions]);

  // Filter and sort positions by search
  const filteredPositions = useMemo(() => {
    let filtered = positions;
    if (searchQuery) {
      filtered = filtered.filter(
        (pos) =>
          pos.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
          pos.contractName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          pos.contractMonth.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return sortData(filtered, positionSort);
  }, [searchQuery, positions, positionSort]);

  // Filter and sort transactions by search
  const filteredTransactions = useMemo(() => {
    let filtered = transactions;
    if (searchQuery) {
      filtered = filtered.filter(
        (tx) =>
          tx.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
          tx.contractMonth.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return sortData(filtered, transactionSort);
  }, [searchQuery, transactions, transactionSort]);

  const portfolioSummary = useMemo(() => {
    const totalValue = positions.reduce((sum, pos) => sum + (pos.marketValue || 0), 0);
    const unrealizedPL = positions.reduce((sum, pos) => sum + (pos.unrealizedPL || 0), 0);
    const totalMargin = positions.reduce((sum, pos) => sum + ((pos.marginRequirement || 0) * pos.quantity), 0);

    // Calculate realized P&L from closed positions
    const realizedPL = closedPositions.reduce((sum, pos) => sum + (pos.realized_pl || 0), 0);

    return {
      totalValue,
      unrealizedPL,
      realizedPL,
      totalMargin,
      positionsCount: positions.length,
      contractsCount: positions.reduce((sum, pos) => sum + pos.quantity, 0),
    };
  }, [positions, closedPositions]);

  // Helper function to parse contract month (e.g., "DEC25" -> { monthCode: "Z", year: "25" })
  const parseContractMonth = useCallback((contractMonth: string): { monthCode: string; year: string } | null => {
    if (!contractMonth) return null;

    // Try to parse format like "DEC25", "MAR25"
    const formattedMatch = contractMonth.match(/^([A-Z]{3})(\d{2})$/);
    if (formattedMatch) {
      const monthName = formattedMatch[1];
      const year = formattedMatch[2];
      // Convert month name to month code
      const monthNameToCode: Record<string, string> = {
        JAN: 'F', FEB: 'G', MAR: 'H', APR: 'J', MAY: 'K', JUN: 'M',
        JUL: 'N', AUG: 'Q', SEP: 'U', OCT: 'V', NOV: 'X', DEC: 'Z'
      };
      const monthCode = monthNameToCode[monthName];
      if (monthCode) {
        return { monthCode, year };
      }
    }

    // Try to parse format like "H25", "Z24" (month code + year)
    const codeMatch = contractMonth.match(/^([FGHJKMNQUVXZ])(\d{2,4})$/);
    if (codeMatch) {
      const monthCode = codeMatch[1];
      const year = codeMatch[2].length === 2 ? codeMatch[2] : codeMatch[2].slice(-2);
      return { monthCode, year };
    }

    return null;
  }, []);

  // Compute close form initial values
  const closeFormInitialValues = useMemo(() => {
    if (!showCloseForm || !selectedPositionForClose) return null;
    
    // Parse contract month to get month code and year
    const parsedMonth = parseContractMonth(selectedPositionForClose.contractMonth);
    const monthCode = parsedMonth?.monthCode || '';
    const year = parsedMonth?.year || '';

    // Find contract spec by symbol
    const contractSpec = contractSpecs.find(spec => spec.symbol === selectedPositionForClose.symbol);

    return {
      contractId: contractSpec?.id || '',
      transactionType: 'Sell' as const,
      maxQuantity: selectedPositionForClose.quantity,
      contractMonth: monthCode,
      contractYear: year,
    };
  }, [showCloseForm, selectedPositionForClose, contractSpecs, parseContractMonth]);

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

  const getDaysToExpiration = (expirationDate: string | null) => {
    if (!expirationDate) return 0;
    const today = new Date();
    const expDate = new Date(expirationDate);
    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleClosePosition = useCallback((position: FuturesContract) => {
    setSelectedPositionForClose(position);
    setShowCloseForm(true);
  }, []);

  const handleEditPosition = useCallback((position: FuturesContract) => {
    // Find the original position from allPositions
    const originalPosition = allPositions?.find(p => p.id === position.id);
    if (originalPosition) {
      setEditingPosition(originalPosition);
      setShowTransactionForm(true);
    }
  }, [allPositions]);

  const handleEditTransaction = useCallback((transaction: FuturesTransaction) => {
    // Find the original transaction from allTransactions
    const originalTransaction = allTransactions?.find(t => t.id === transaction.id);
    if (originalTransaction) {
      setEditingTransaction(originalTransaction);
      setShowTransactionForm(true);
    }
  }, [allTransactions]);

  const handleDeleteTransaction = useCallback(async (transaction: FuturesTransaction) => {
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

  const handleDeletePosition = useCallback(async (position: FuturesContract) => {
    const confirmed = await confirmation.confirm({
      title: 'Delete Position',
      message: `Are you sure you want to delete the position for ${position.symbol} ${position.contractMonth}? This action cannot be undone.`,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      variant: 'danger',
    });

    if (!confirmed) return;
    const originalPosition = allPositions?.find(p => p.id === position.id);
    if (originalPosition) {
      await deletePositionMutation.mutateAsync({ id: originalPosition.id, userId });
    }
  }, [confirmation, deletePositionMutation, allPositions]);

  return (
    <div className="p-4 md:p-8 space-y-4 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400 bg-clip-text text-transparent">
            Futures
          </h1>
          <p className="text-slate-600 dark:text-slate-500 mt-2 text-sm md:text-lg">
            Track your futures positions and contracts
          </p>
          <div className="mt-3 flex items-center gap-3">
            <MarketStatusIndicator assetType="futures" />
            <div className="text-sm text-amber-600 dark:text-amber-400/80 flex items-center gap-1.5">
              <span>•</span>
              <span>Real-time pricing coming soon</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <button className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700/50 rounded-xl text-slate-700 dark:text-slate-300 text-sm font-medium transition-all touch-target w-full sm:w-auto">
            <Download size={18} className="inline mr-2" />
            Export
          </button>
          <button
            onClick={() => setShowTransactionForm(true)}
            className="px-4 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-600 dark:text-emerald-400 text-sm font-medium transition-all touch-target w-full sm:w-auto"
          >
            <Plus size={18} className="inline mr-2" />
            Add Transaction
          </button>
        </div>
      </div>

      {/* Portfolio Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-6">
        <StatCard
          title="Realized P&L"
          value={formatCurrency(portfolioSummary.realizedPL)}
          icon={DollarSign}
          positive={portfolioSummary.realizedPL >= 0}
        />
        <StatCard
          title="Unrealized P&L"
          value={formatCurrency(portfolioSummary.unrealizedPL)}
          icon={TrendingUp}
          positive={portfolioSummary.unrealizedPL >= 0}
        />
        <StatCard
          title="Margin Used"
          value={formatCurrency(portfolioSummary.totalMargin)}
          icon={Shield}
          positive
        />
        <StatCard
          title="Open Positions"
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
      <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/50 dark:to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-800/50 overflow-hidden shadow-sm dark:shadow-none">
        {/* Tabs */}
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
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700/50 rounded-xl text-slate-900 dark:text-slate-300 placeholder-slate-500 dark:placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
            />
          </div>
        </div>

        {/* Positions Tab */}
        {activeTab === 'positions' && (
          <>
            {/* Mobile Card View */}
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
                filteredPositions.map((position) => {
                  const daysToExp = getDaysToExpiration(position.expirationDate);
                  return (
                    <MobileTableCard key={position.id}>
                      <MobileTableCardHeader
                        title={position.symbol}
                        subtitle={position.contractName}
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
                          </div>
                        }
                      />
                      <MobileTableCardRow label="Month" value={position.contractMonth} />
                      <MobileTableCardRow 
                        label="Expiration" 
                        value={
                          <div className="flex items-center gap-1.5">
                            <Calendar size={14} className="text-slate-500 dark:text-slate-400" />
                            <span>{formatDateUtil(position.expirationDate)}</span>
                            <span className={`text-xs ${daysToExp < 7 ? 'text-red-500 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>
                              ({daysToExp}d)
                            </span>
                          </div>
                        } 
                      />
                      <MobileTableCardRow label="Contracts" value={position.quantity} />
                      <MobileTableCardRow label="Avg Price" value={formatCurrency(position.averagePrice)} />
                      <MobileTableCardRow label="Current Price" value={formatCurrency(position.currentPrice || 0)} />
                      <MobileTableCardRow
                        label="Unrealized P&L"
                        value={formatCurrency(position.unrealizedPL || 0)}
                        positive={(position.unrealizedPL || 0) >= 0}
                        negative={(position.unrealizedPL || 0) < 0}
                        highlight
                      />
                      {position.marginRequirement && (
                        <MobileTableCardRow label="Margin" value={formatCurrency(position.marginRequirement)} />
                      )}
                      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800/50">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleClosePosition(position);
                          }}
                          className="w-full px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm font-medium transition-all touch-target"
                        >
                          Close Position
                        </button>
                      </div>
                    </MobileTableCard>
                  );
                })
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto table-wrapper">
              <table className="w-full">
              <thead className="bg-slate-100 dark:bg-slate-800/50">
                <tr>
                  <SortableTableHeader
                    label="Contract"
                    sortKey="symbol"
                    currentSort={positionSort}
                    onSortChange={setPositionSort}
                    align="left"
                  />
                  <SortableTableHeader
                    label="Month"
                    sortKey="contractMonth"
                    currentSort={positionSort}
                    onSortChange={setPositionSort}
                    align="left"
                  />
                  <SortableTableHeader
                    label="Expiration"
                    sortKey="expirationDate"
                    currentSort={positionSort}
                    onSortChange={setPositionSort}
                    align="left"
                  />
                  <SortableTableHeader
                    label="Contracts"
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
                    label="Current"
                    sortKey="currentPrice"
                    currentSort={positionSort}
                    onSortChange={setPositionSort}
                    align="right"
                  />
                  <SortableTableHeader
                    label="P&L"
                    sortKey="unrealizedPL"
                    currentSort={positionSort}
                    onSortChange={setPositionSort}
                    align="right"
                  />
                  <SortableTableHeader
                    label="Margin"
                    sortKey="marginRequirement"
                    currentSort={positionSort}
                    onSortChange={setPositionSort}
                    align="right"
                  />
                  <th className="px-6 py-3 text-center text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/50">
                {positionsLoading ? (
                  <TableSkeleton rows={5} columns={10} />
                ) : filteredPositions.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                      No positions found
                    </td>
                  </tr>
                ) : (
                  filteredPositions.map((position) => {
                  const daysToExp = getDaysToExpiration(position.expirationDate);
                  return (
                    <tr
                      key={position.id}
                      className="hover:bg-slate-100 dark:hover:bg-slate-800/30 transition-colors"
                    >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {position.symbol}
                        </div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">
                          {position.contractName}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100">
                      {position.contractMonth}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100">
                      {position.expirationDate ? (
                        <div className="flex items-center gap-1">
                          <Calendar size={14} className="text-slate-500 dark:text-slate-400" />
                          <span>{formatDate(position.expirationDate)}</span>
                          <span className={`text-xs ${daysToExp < 7 ? 'text-red-500 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>
                            ({daysToExp}d)
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-500 dark:text-slate-400">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-900 dark:text-slate-100">
                      {position.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-900 dark:text-slate-100">
                      {position.averagePrice.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-900 dark:text-slate-100">
                      {(position.currentPrice || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <div>
                        <span
                          className={`font-semibold ${
                            (position.unrealizedPL || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {formatCurrency(position.unrealizedPL || 0)}
                        </span>
                        <div
                          className={`text-xs ${
                            (position.unrealizedPLPercent || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {formatPercent(position.unrealizedPLPercent || 0)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-900 dark:text-slate-100">
                      {formatCurrency((position.marginRequirement || 0) * position.quantity)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleClosePosition(position);
                          }}
                          className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-red-600 dark:text-red-400 text-xs font-medium transition-all"
                        >
                          Close
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
                );
                })
              )}
              </tbody>
            </table>
          </div>
          </>
        )}

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <>
            {/* Mobile Card View */}
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
                      badge={
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            transaction.transactionType === 'buy'
                              ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                              : 'bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30'
                          }`}
                        >
                          {transaction.transactionType.toUpperCase()}
                        </span>
                      }
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
                    <MobileTableCardRow label="Contracts" value={transaction.quantity} />
                    <MobileTableCardRow label="Price" value={formatCurrency(transaction.price || 0)} />
                    <MobileTableCardRow label="Fees" value={formatCurrency(transaction.fees || 0)} />
                    <MobileTableCardRow label="Amount" value={formatCurrency(Math.abs(transaction.amount || 0))} highlight />
                  </MobileTableCard>
                ))
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto table-wrapper">
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
                    label="Contract"
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
                    label="Contracts"
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
                    label="Fees"
                    sortKey="fees"
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
                    <td colSpan={8} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                      No transactions found
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-100 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100">
                        {formatDate(tx.activityDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="font-medium text-slate-900 dark:text-slate-100">{tx.symbol}</div>
                          {tx.contractMonth && (
                            <div className="text-sm text-slate-500 dark:text-slate-400">{tx.contractMonth}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            tx.transactionType === 'buy'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-red-500/20 text-red-400 border border-red-500/30'
                          }`}
                        >
                          {tx.transactionType.charAt(0).toUpperCase() + tx.transactionType.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-900 dark:text-slate-100">
                        {tx.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-900 dark:text-slate-100">
                        ${tx.price.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-900 dark:text-slate-100">
                        ${tx.fees.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <span
                          className={tx.amount >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}
                        >
                          {formatCurrency(Math.abs(tx.amount))}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditTransaction(tx);
                            }}
                            className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors"
                            title="Edit transaction"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTransaction(tx);
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
          </div>
          </>
        )}
      </div>

      {/* Transaction Form Modal */}
      {showTransactionForm && (
        <>
          {editingPosition ? (
            <PositionEditForm
              position={editingPosition}
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
          ) : editingTransaction ? (
            <FuturesTransactionForm
              userId={userId}
              onClose={() => {
                setShowTransactionForm(false);
                setEditingTransaction(null);
              }}
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ['positions'] });
                queryClient.invalidateQueries({ queryKey: ['transactions'] });
                queryClient.invalidateQueries({ queryKey: ['cash-balance'] });
                setShowTransactionForm(false);
                setEditingTransaction(null);
              }}
            />
          ) : (
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
        </>
      )}

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmation.isOpen}
        title={confirmation.title}
        message={confirmation.message}
        confirmLabel={confirmation.confirmLabel}
        cancelLabel={confirmation.cancelLabel}
        variant={confirmation.variant}
        onConfirm={confirmation.handleConfirm}
        onCancel={confirmation.handleCancel}
      />

      {/* Close Position Form Modal */}
      {showCloseForm && selectedPositionForClose && closeFormInitialValues && (
        <FuturesTransactionForm
          userId={userId}
          initialValues={closeFormInitialValues}
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
  <div className="group relative bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/50 dark:to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-800/50 p-6 hover:border-emerald-500/30 transition-all duration-300 overflow-hidden shadow-sm dark:shadow-none">
    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 to-emerald-500/0 group-hover:from-emerald-500/5 group-hover:to-transparent transition-all duration-300" />
    <div className="relative">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{title}</span>
        <div className={`p-2.5 rounded-xl ${positive ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
          <Icon className={`w-5 h-5 ${positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`} />
        </div>
      </div>
      <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
    </div>
  </div>
);

export default Futures;
