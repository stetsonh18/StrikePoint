import React, { useState, useMemo, useCallback } from 'react';
import { Plus, TrendingUp, TrendingDown, DollarSign, Download, Filter, Trash2, Edit2 } from 'lucide-react';
import { useAuthStore } from '@/application/stores/auth.store';
import { useCashTransactions, useDeleteCashTransaction } from '@/application/hooks/useCashTransactions';
import { TransactionForm } from '@/presentation/components/TransactionForm';
import { useQueryClient } from '@tanstack/react-query';
import { formatDate as formatDateUtil } from '@/shared/utils/dateUtils';
import { TableSkeleton } from '@/presentation/components/SkeletonLoader';
import { Select } from '@/presentation/components/Select';
import { useToast } from '@/shared/hooks/useToast';
import { useConfirmation } from '@/shared/hooks/useConfirmation';
import { ConfirmationDialog } from '@/presentation/components/ConfirmationDialog';
import type { CashTransaction } from '@/domain/types';
import { logger } from '@/shared/utils/logger';
import { MobileTableCard, MobileTableCardHeader, MobileTableCardRow } from '@/presentation/components/MobileTableCard';

const CashTransactions: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const userId = user?.id || '';
  const queryClient = useQueryClient();

  const [filterType, setFilterType] = useState<string | 'all'>('all');
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<CashTransaction | null>(null);
  
  const toast = useToast();
  const confirmation = useConfirmation();
  const deleteMutation = useDeleteCashTransaction();

  // Calculate date range filter
  const dateFilter = useMemo(() => {
    if (dateRange === 'all') return undefined;
    const now = new Date();
    const daysAgo = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - daysAgo);
    return {
      startDate: startDate.toISOString().split('T')[0],
    };
  }, [dateRange]);

  // Fetch cash transactions
  const { data: transactions = [], isLoading: transactionsLoading } = useCashTransactions(
    userId,
    {
      ...dateFilter,
      transactionCode: filterType !== 'all' ? filterType : undefined,
    }
  );

  // Get unique transaction codes for filter dropdown
  const transactionCodes = useMemo(() => {
    const codes = new Set(transactions.map(t => t.transaction_code));
    return Array.from(codes).sort();
  }, [transactions]);

  // Filter transactions (already filtered by query, but sort here)
  const filteredTransactions = useMemo(() => {
    return [...transactions].sort(
      (a, b) => new Date(b.activity_date).getTime() - new Date(a.activity_date).getTime()
    );
  }, [transactions]);

  // Calculate summary
  const summary = useMemo(() => {
    const deposits = transactions
      .filter(t => ['ACH', 'RTP', 'DCF', 'DEP', 'DEPOSIT', 'WIRE'].includes(t.transaction_code))
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const withdrawals = transactions
      .filter(t => ['WD', 'WDRL', 'WITHD', 'WT'].includes(t.transaction_code))
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const dividends = transactions
      .filter(t => t.transaction_code === 'CDIV')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const interest = transactions
      .filter(t => t.transaction_code === 'INT')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const fees = transactions
      .filter(t => ['FEE', 'GOLD'].includes(t.transaction_code))
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    // Include FUTURES_MARGIN and FUTURES_MARGIN_RELEASE in net cash flow calculation
    // FUTURES_MARGIN represents margin reserved (debit), FUTURES_MARGIN_RELEASE represents margin released (credit)
    const netCashFlow = transactions
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      totalDeposits: deposits,
      totalWithdrawals: withdrawals,
      totalDividends: dividends,
      totalInterest: interest,
      totalFees: fees,
      netCashFlow,
    };
  }, [transactions]);

  const getTransactionIcon = (code: string, amount: number) => {
    const creditCodes = ['ACH', 'RTP', 'DCF', 'INT', 'CDIV', 'SLIP', 'GMPC', 'OCC', 'DEP', 'DEPOSIT', 'WIRE'];
    const isCredit = creditCodes.includes(code) || amount > 0;

    if (isCredit) {
      return <TrendingUp className="text-emerald-600 dark:text-emerald-400" size={20} />;
    } else {
      return <TrendingDown className="text-red-600 dark:text-red-400" size={20} />;
    }
  };

  const getTransactionColor = (code: string, amount: number) => {
    const creditCodes = ['ACH', 'RTP', 'DCF', 'INT', 'CDIV', 'SLIP', 'GMPC', 'OCC', 'DEP', 'DEPOSIT', 'WIRE'];
    const isCredit = creditCodes.includes(code) || amount > 0;
    
    return isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = formatDateUtil;

  const handleDelete = useCallback(async (transaction: CashTransaction) => {
    const confirmed = await confirmation.confirm({
      title: 'Delete Cash Transaction',
      message: `Are you sure you want to delete this ${transaction.transaction_code} transaction? This action cannot be undone.`,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      variant: 'danger',
    });

    if (!confirmed) return;

    try {
      await deleteMutation.mutateAsync(transaction.id);
      toast.success('Transaction deleted successfully');
    } catch (error) {
      logger.error('Error deleting transaction', error);
      toast.error('Failed to delete transaction', {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    }
  }, [confirmation, deleteMutation, toast]);

  return (
    <div className="p-4 md:p-8 space-y-4 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-slate-900 dark:from-slate-100 to-slate-600 dark:to-slate-400 bg-clip-text text-transparent">
            Cash Transactions
          </h1>
          <p className="text-slate-600 dark:text-slate-500 mt-2 text-lg">
            Track deposits, withdrawals, dividends, and interest payments
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <button
            className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700/50 rounded-xl text-slate-700 dark:text-slate-300 text-sm font-medium transition-all touch-target w-full sm:w-auto"
            onClick={() => {/* TODO: Export to CSV */}}
          >
            <Download size={18} className="inline mr-2" />
            Export
          </button>
          <button
            className="px-4 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-600 dark:text-emerald-400 text-sm font-medium transition-all touch-target w-full sm:w-auto"
            onClick={() => setShowAddModal(true)}
          >
            <Plus size={18} className="inline mr-2" />
            Add Transaction
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        <StatCard
          title="Total Deposits"
          value={formatCurrency(summary.totalDeposits)}
          icon={TrendingUp}
          positive
        />
        <StatCard
          title="Total Withdrawals"
          value={formatCurrency(summary.totalWithdrawals)}
          icon={TrendingDown}
          positive={false}
        />
        <StatCard
          title="Dividends & Interest"
          value={formatCurrency(summary.totalDividends + summary.totalInterest)}
          icon={DollarSign}
          positive
        />
        <StatCard
          title="Net Cash Flow"
          value={formatCurrency(summary.netCashFlow)}
          icon={DollarSign}
          positive={summary.netCashFlow >= 0}
        />
      </div>

      {/* Filters */}
      <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/50 dark:to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-800/50 p-4 shadow-sm dark:shadow-none">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-slate-500 dark:text-slate-400" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Filter by:
            </span>
          </div>

          <Select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            options={[
              { value: 'all', label: 'All Types' },
              ...transactionCodes.map(code => ({ value: code, label: code })),
            ]}
            controlSize="sm"
          />

          <Select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as '7d' | '30d' | '90d' | 'all')}
            options={[
              { value: '7d', label: 'Last 7 days' },
              { value: '30d', label: 'Last 30 days' },
              { value: '90d', label: 'Last 90 days' },
              { value: 'all', label: 'All time' },
            ]}
            controlSize="sm"
          />
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/50 dark:to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-800/50 overflow-hidden shadow-sm dark:shadow-none">
        {/* Mobile Card View */}
        <div className="md:hidden p-4 space-y-3">
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
                  title={transaction.description || transaction.transaction_code}
                  subtitle={formatDate(transaction.activity_date)}
                  badge={
                    <div className="flex items-center gap-2">
                      {getTransactionIcon(transaction.transaction_code, transaction.amount)}
                      <span className="text-slate-900 dark:text-slate-100 text-xs font-medium">
                        {transaction.transaction_code}
                      </span>
                    </div>
                  }
                  actions={
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingTransaction(transaction);
                        }}
                        className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors touch-target"
                        title="Edit transaction"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(transaction);
                        }}
                        className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 rounded transition-colors touch-target"
                        title="Delete transaction"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  }
                />
                {transaction.symbol && (
                  <MobileTableCardRow label="Symbol" value={transaction.symbol} />
                )}
                <MobileTableCardRow
                  label="Amount"
                  value={formatCurrency(transaction.amount)}
                  positive={transaction.amount >= 0}
                  negative={transaction.amount < 0}
                  highlight
                />
              </MobileTableCard>
            ))
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto table-wrapper">
          <table className="w-full">
            <thead className="bg-slate-100 dark:bg-slate-800/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Symbol
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/50">
              {transactionsLoading ? (
                <TableSkeleton rows={5} columns={6} />
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
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
                      {formatDate(transaction.activity_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        {getTransactionIcon(transaction.transaction_code, transaction.amount)}
                        <span className="text-slate-900 dark:text-slate-100">
                          {transaction.transaction_code}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900 dark:text-slate-100">
                      {transaction.description || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100">
                      {transaction.symbol || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      <span className={`font-semibold ${getTransactionColor(transaction.transaction_code, transaction.amount)}`}>
                        {formatCurrency(transaction.amount)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingTransaction(transaction);
                          }}
                          className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors"
                          title="Edit transaction"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(transaction);
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

      {/* Transaction Form Modal */}
      {showAddModal && (
        <TransactionForm
          assetType="cash"
          userId={userId}
          onClose={() => {
            setShowAddModal(false);
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['cash_transactions'] });
            queryClient.invalidateQueries({ queryKey: ['cash_balances'] });
            setShowAddModal(false);
          }}
        />
      )}

      {/* Edit Transaction Form Modal */}
      {editingTransaction && (
        <TransactionForm
          assetType="cash"
          userId={userId}
          editingCashTransaction={editingTransaction}
          onClose={() => {
            setEditingTransaction(null);
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['cash_transactions'] });
            queryClient.invalidateQueries({ queryKey: ['cash_balances'] });
            setEditingTransaction(null);
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
          <Icon className={`w-5 h-5 ${positive ? 'text-emerald-400' : 'text-red-400'}`} />
        </div>
      </div>
      <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
    </div>
  </div>
);

export default CashTransactions;
