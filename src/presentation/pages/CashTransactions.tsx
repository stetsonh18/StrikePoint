import React, { useState, useMemo, useCallback } from 'react';
import { Plus, TrendingUp, TrendingDown, DollarSign, Download, Upload, Filter, Edit, Trash2 } from 'lucide-react';
import { useAuthStore } from '@/application/stores/auth.store';
import { useCashTransactions, useUpdateCashTransaction, useDeleteCashTransaction } from '@/application/hooks/useCashTransactions';
import { TransactionForm } from '@/presentation/components/TransactionForm';
import { useQueryClient } from '@tanstack/react-query';
import { formatDate as formatDateUtil } from '@/shared/utils/dateUtils';
import { TableSkeleton } from '@/presentation/components/SkeletonLoader';
import { Select } from '@/presentation/components/Select';
import { useToast } from '@/shared/hooks/useToast';
import { useConfirmation } from '@/shared/hooks/useConfirmation';
import { ConfirmationDialog } from '@/presentation/components/ConfirmationDialog';
import type { CashTransaction } from '@/domain/types';

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
  const updateMutation = useUpdateCashTransaction();
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
    // Credit codes (positive amounts)
    const creditCodes = ['ACH', 'RTP', 'DCF', 'INT', 'CDIV', 'SLIP', 'GMPC', 'OCC', 'DEP', 'DEPOSIT', 'WIRE'];
    // Debit codes (negative amounts)
    const debitCodes = ['WD', 'WDRL', 'WITHD', 'WT', 'FEE', 'GOLD'];
    
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

    const netCashFlow = transactions.reduce((sum, t) => sum + t.amount, 0);

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
      return <TrendingUp className="text-emerald-400" size={20} />;
    } else {
      return <TrendingDown className="text-red-400" size={20} />;
    }
  };

  const getTransactionColor = (code: string, amount: number) => {
    const creditCodes = ['ACH', 'RTP', 'DCF', 'INT', 'CDIV', 'SLIP', 'GMPC', 'OCC', 'DEP', 'DEPOSIT', 'WIRE'];
    const isCredit = creditCodes.includes(code) || amount > 0;
    
    return isCredit ? 'text-emerald-400' : 'text-red-400';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = formatDateUtil;

  const handleEdit = useCallback((transaction: CashTransaction) => {
    setEditingTransaction(transaction);
    setShowAddModal(true);
  }, []);

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
      console.error('Error deleting transaction:', error);
      toast.error('Failed to delete transaction', {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    }
  }, [confirmation, deleteMutation, toast]);

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
            Cash Transactions
          </h1>
          <p className="text-slate-500 mt-2 text-lg">
            Track deposits, withdrawals, dividends, and interest payments
          </p>
        </div>
        <div className="flex gap-3">
          <button
            className="px-4 py-2 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-xl text-slate-300 text-sm font-medium transition-all"
            onClick={() => {/* TODO: Export to CSV */}}
          >
            <Download size={18} className="inline mr-2" />
            Export
          </button>
          <button
            className="px-4 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm font-medium transition-all"
            onClick={() => setShowAddModal(true)}
          >
            <Plus size={18} className="inline mr-2" />
            Add Transaction
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
      <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-800/50 p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-slate-400" />
            <span className="text-sm font-medium text-slate-300">
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
            size="sm"
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
            size="sm"
          />
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-800/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Symbol
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Actions
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
                      {formatDate(transaction.activity_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        {getTransactionIcon(transaction.transaction_code, transaction.amount)}
                        <span className="text-slate-100">
                          {transaction.transaction_code}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-100">
                      {transaction.description || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-100">
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
                            handleEdit(transaction);
                          }}
                          className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors"
                          title="Edit transaction"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(transaction);
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
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
            setEditingTransaction(null);
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['cash_transactions'] });
            queryClient.invalidateQueries({ queryKey: ['cash_balances'] });
            setShowAddModal(false);
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
  <div className="group relative bg-gradient-to-br from-slate-900/50 to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-800/50 p-6 hover:border-emerald-500/30 transition-all duration-300 overflow-hidden">
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

export default CashTransactions;
