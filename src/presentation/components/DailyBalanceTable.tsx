import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Edit, Trash2, X, Plus } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PortfolioSnapshotRepository, type PortfolioSnapshot, type CreatePortfolioSnapshotDto } from '@/infrastructure/repositories/portfolioSnapshot.repository';
import { ConfirmationDialog } from './ConfirmationDialog';
import { useConfirmation } from '@/shared/hooks/useConfirmation';
import { useToast } from '@/shared/hooks/useToast';
import { formatDate } from '@/shared/utils/dateUtils';

interface DailyBalanceTableProps {
  userId: string;
  formatCurrency: (amount: number) => string;
}

export const DailyBalanceTable = ({ userId, formatCurrency }: DailyBalanceTableProps) => {
  const [editingSnapshot, setEditingSnapshot] = useState<PortfolioSnapshot | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<PortfolioSnapshot>>({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSnapshotData, setNewSnapshotData] = useState<Partial<CreatePortfolioSnapshotDto>>({
    snapshot_date: new Date().toISOString().split('T')[0],
    portfolio_value: 0,
    net_cash_flow: 0,
    total_market_value: 0,
    total_realized_pl: 0,
    total_unrealized_pl: 0,
    open_positions_count: 0,
    total_positions_count: 0,
    positions_breakdown: {
      stocks: { count: 0, value: 0 },
      options: { count: 0, value: 0 },
      crypto: { count: 0, value: 0 },
      futures: { count: 0, value: 0 },
    },
  });
  const queryClient = useQueryClient();
  const confirmation = useConfirmation();
  const toast = useToast();

  // Fetch all snapshots
  const { data: snapshots = [], isLoading } = useQuery({
    queryKey: ['portfolio-snapshots', userId],
    queryFn: () => PortfolioSnapshotRepository.getAll(userId),
    enabled: !!userId,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => PortfolioSnapshotRepository.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio-snapshots', userId] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-history', userId] });
      toast.success('Snapshot deleted successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete snapshot', {
        description: error.message,
      });
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: CreatePortfolioSnapshotDto) => {
      return PortfolioSnapshotRepository.upsert(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio-snapshots', userId] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-history', userId] });
      setShowAddModal(false);
      setNewSnapshotData({
        snapshot_date: new Date().toISOString().split('T')[0],
        portfolio_value: 0,
        net_cash_flow: 0,
        total_market_value: 0,
        total_realized_pl: 0,
        total_unrealized_pl: 0,
        open_positions_count: 0,
        total_positions_count: 0,
        positions_breakdown: {
          stocks: { count: 0, value: 0 },
          options: { count: 0, value: 0 },
          crypto: { count: 0, value: 0 },
          futures: { count: 0, value: 0 },
        },
      });
      toast.success('Snapshot created successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to create snapshot', {
        description: error.message,
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<PortfolioSnapshot> }) => {
      // Use upsert to update
      const snapshot = await PortfolioSnapshotRepository.getById(id);
      if (!snapshot) throw new Error('Snapshot not found');

      const updated: PortfolioSnapshot = {
        ...snapshot,
        ...updates,
      };

      await PortfolioSnapshotRepository.upsert({
        user_id: updated.user_id,
        snapshot_date: updated.snapshot_date,
        portfolio_value: updated.portfolio_value ?? snapshot.portfolio_value,
        net_cash_flow: updated.net_cash_flow ?? snapshot.net_cash_flow,
        total_market_value: updated.total_market_value ?? snapshot.total_market_value,
        total_realized_pl: updated.total_realized_pl ?? snapshot.total_realized_pl,
        total_unrealized_pl: updated.total_unrealized_pl ?? snapshot.total_unrealized_pl,
        open_positions_count: snapshot.open_positions_count,
        total_positions_count: snapshot.total_positions_count,
        positions_breakdown: snapshot.positions_breakdown,
      });

      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio-snapshots', userId] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-history', userId] });
      setEditingSnapshot(null);
      setEditFormData({});
      toast.success('Snapshot updated successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to update snapshot', {
        description: error.message,
      });
    },
  });

  const handleEdit = useCallback((snapshot: PortfolioSnapshot) => {
    setEditingSnapshot(snapshot);
    setEditFormData({
      portfolio_value: snapshot.portfolio_value,
      net_cash_flow: snapshot.net_cash_flow,
      total_market_value: snapshot.total_market_value,
      total_realized_pl: snapshot.total_realized_pl,
      total_unrealized_pl: snapshot.total_unrealized_pl,
    });
  }, []);

  const handleDelete = useCallback(async (snapshot: PortfolioSnapshot) => {
    const confirmed = await confirmation.confirm({
      title: 'Delete Snapshot',
      message: `Are you sure you want to delete the snapshot for ${formatDate(snapshot.snapshot_date)}? This action cannot be undone.`,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      variant: 'danger',
    });

    if (confirmed) {
      deleteMutation.mutate(snapshot.id);
    }
  }, [confirmation, deleteMutation]);

  const handleSaveEdit = useCallback(() => {
    if (!editingSnapshot) return;
    updateMutation.mutate({ id: editingSnapshot.id, updates: editFormData });
  }, [editingSnapshot, editFormData, updateMutation]);

  const handleAddSnapshot = useCallback(() => {
    if (!newSnapshotData.snapshot_date) {
      toast.error('Date is required');
      return;
    }

    createMutation.mutate({
      user_id: userId,
      snapshot_date: newSnapshotData.snapshot_date!,
      portfolio_value: newSnapshotData.portfolio_value ?? 0,
      net_cash_flow: newSnapshotData.net_cash_flow ?? 0,
      total_market_value: newSnapshotData.total_market_value ?? 0,
      total_realized_pl: newSnapshotData.total_realized_pl ?? 0,
      total_unrealized_pl: newSnapshotData.total_unrealized_pl ?? 0,
      open_positions_count: newSnapshotData.open_positions_count ?? 0,
      total_positions_count: newSnapshotData.total_positions_count ?? 0,
      positions_breakdown: newSnapshotData.positions_breakdown ?? {
        stocks: { count: 0, value: 0 },
        options: { count: 0, value: 0 },
        crypto: { count: 0, value: 0 },
        futures: { count: 0, value: 0 },
      },
    });
  }, [newSnapshotData, userId, createMutation, toast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-slate-600 dark:text-slate-400 text-sm">Loading snapshots...</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Portfolio Snapshots</h3>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-xl text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 text-sm font-medium transition-all"
        >
          <Plus size={16} />
          Add Balance
        </button>
      </div>

      {snapshots.length === 0 ? (
        <div className="flex items-center justify-center py-12 border border-slate-200 dark:border-slate-800/50 rounded-xl bg-slate-50 dark:bg-slate-900/30">
          <div className="text-center">
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-2">No snapshots available.</p>
            <p className="text-slate-500 dark:text-slate-500 text-xs">Click "Add Balance" to manually add a portfolio snapshot.</p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800/50">
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">Date</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">Portfolio Value</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">Realized P&L</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">Unrealized P&L</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">Daily Change</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800/50">
            {snapshots.map((snapshot) => (
              <tr key={snapshot.id} className="hover:bg-slate-100 dark:hover:bg-slate-800/30 transition-colors">
                <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900 dark:text-slate-300">
                  {formatDate(snapshot.snapshot_date)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-slate-900 dark:text-slate-300">
                  {formatCurrency(snapshot.portfolio_value)}
                </td>
                <td className={`px-4 py-3 whitespace-nowrap text-sm text-right ${
                  snapshot.total_realized_pl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  {snapshot.total_realized_pl >= 0 ? '+' : ''}{formatCurrency(snapshot.total_realized_pl)}
                </td>
                <td className={`px-4 py-3 whitespace-nowrap text-sm text-right ${
                  snapshot.total_unrealized_pl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  {snapshot.total_unrealized_pl >= 0 ? '+' : ''}{formatCurrency(snapshot.total_unrealized_pl)}
                </td>
                <td className={`px-4 py-3 whitespace-nowrap text-sm text-right ${
                  (snapshot.daily_pl_change || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  {snapshot.daily_pl_change !== null ? (
                    <>
                      {snapshot.daily_pl_change >= 0 ? '+' : ''}{formatCurrency(snapshot.daily_pl_change)}
                      {snapshot.daily_pl_percent !== null && (
                        <span className="ml-2 text-xs">
                          ({snapshot.daily_pl_percent >= 0 ? '+' : ''}{snapshot.daily_pl_percent.toFixed(2)}%)
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-slate-500 dark:text-slate-500">-</span>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => handleEdit(snapshot)}
                      className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors"
                      title="Edit snapshot"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(snapshot)}
                      className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                      title="Delete snapshot"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}

      {/* Add Modal */}
      {showAddModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              setShowAddModal(false);
              setNewSnapshotData({
                snapshot_date: new Date().toISOString().split('T')[0],
                portfolio_value: 0,
                net_cash_flow: 0,
                total_market_value: 0,
                total_realized_pl: 0,
                total_unrealized_pl: 0,
                open_positions_count: 0,
                total_positions_count: 0,
                positions_breakdown: {
                  stocks: { count: 0, value: 0 },
                  options: { count: 0, value: 0 },
                  crypto: { count: 0, value: 0 },
                  futures: { count: 0, value: 0 },
                },
              });
            }}
            aria-hidden="true"
          />
          <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl max-w-2xl w-full flex flex-col my-auto z-[10000]" style={{ maxHeight: '90vh', marginTop: 'auto', marginBottom: 'auto' }}>
            <div className="flex items-center justify-between p-6 pb-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                Add Portfolio Snapshot
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewSnapshotData({
                    snapshot_date: new Date().toISOString().split('T')[0],
                    portfolio_value: 0,
                    net_cash_flow: 0,
                    total_market_value: 0,
                    total_realized_pl: 0,
                    total_unrealized_pl: 0,
                    open_positions_count: 0,
                    total_positions_count: 0,
                    positions_breakdown: {
                      stocks: { count: 0, value: 0 },
                      options: { count: 0, value: 0 },
                      crypto: { count: 0, value: 0 },
                      futures: { count: 0, value: 0 },
                    },
                  });
                }}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 min-h-0">
              <div className="grid grid-cols-2 gap-4 pb-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-400 mb-1.5">Date *</label>
                <input
                  type="date"
                  value={newSnapshotData.snapshot_date || ''}
                  onChange={(e) => setNewSnapshotData({ ...newSnapshotData, snapshot_date: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700/50 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-400 mb-1.5">Portfolio Value *</label>
                <input
                  type="number"
                  step="0.01"
                  value={newSnapshotData.portfolio_value ?? ''}
                  onChange={(e) => setNewSnapshotData({ ...newSnapshotData, portfolio_value: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700/50 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-400 mb-1">Net Cash Flow</label>
                <input
                  type="number"
                  step="0.01"
                  value={newSnapshotData.net_cash_flow ?? ''}
                  onChange={(e) => setNewSnapshotData({ ...newSnapshotData, net_cash_flow: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700/50 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-400 mb-1">Total Market Value</label>
                <input
                  type="number"
                  step="0.01"
                  value={newSnapshotData.total_market_value ?? ''}
                  onChange={(e) => setNewSnapshotData({ ...newSnapshotData, total_market_value: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700/50 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-400 mb-1">Realized P&L</label>
                <input
                  type="number"
                  step="0.01"
                  value={newSnapshotData.total_realized_pl ?? ''}
                  onChange={(e) => setNewSnapshotData({ ...newSnapshotData, total_realized_pl: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700/50 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-400 mb-1">Unrealized P&L</label>
                <input
                  type="number"
                  step="0.01"
                  value={newSnapshotData.total_unrealized_pl ?? ''}
                  onChange={(e) => setNewSnapshotData({ ...newSnapshotData, total_unrealized_pl: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700/50 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>
            </div>
            </div>

            <div className="flex gap-3 justify-end p-6 pt-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex-shrink-0">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewSnapshotData({
                    snapshot_date: new Date().toISOString().split('T')[0],
                    portfolio_value: 0,
                    net_cash_flow: 0,
                    total_market_value: 0,
                    total_realized_pl: 0,
                    total_unrealized_pl: 0,
                    open_positions_count: 0,
                    total_positions_count: 0,
                    positions_breakdown: {
                      stocks: { count: 0, value: 0 },
                      options: { count: 0, value: 0 },
                      crypto: { count: 0, value: 0 },
                      futures: { count: 0, value: 0 },
                    },
                  });
                }}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700/50 rounded-xl text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 text-sm font-medium transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSnapshot}
                disabled={createMutation.isPending || !newSnapshotData.snapshot_date}
                className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-xl text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createMutation.isPending ? 'Creating...' : 'Create Snapshot'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Edit Modal */}
      {editingSnapshot && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              setEditingSnapshot(null);
              setEditFormData({});
            }}
            aria-hidden="true"
          />
          <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto z-[10000]" style={{ marginTop: 'auto', marginBottom: 'auto' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                Edit Snapshot - {formatDate(editingSnapshot.snapshot_date)}
              </h3>
              <button
                onClick={() => {
                  setEditingSnapshot(null);
                  setEditFormData({});
                }}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-400 mb-1">Portfolio Value</label>
                <input
                  type="number"
                  step="0.01"
                  value={editFormData.portfolio_value ?? editingSnapshot.portfolio_value}
                  onChange={(e) => setEditFormData({ ...editFormData, portfolio_value: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700/50 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-400 mb-1">Net Cash Flow</label>
                <input
                  type="number"
                  step="0.01"
                  value={editFormData.net_cash_flow ?? editingSnapshot.net_cash_flow}
                  onChange={(e) => setEditFormData({ ...editFormData, net_cash_flow: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700/50 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-400 mb-1">Total Market Value</label>
                <input
                  type="number"
                  step="0.01"
                  value={editFormData.total_market_value ?? editingSnapshot.total_market_value}
                  onChange={(e) => setEditFormData({ ...editFormData, total_market_value: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700/50 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-400 mb-1">Realized P&L</label>
                <input
                  type="number"
                  step="0.01"
                  value={editFormData.total_realized_pl ?? editingSnapshot.total_realized_pl}
                  onChange={(e) => setEditFormData({ ...editFormData, total_realized_pl: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700/50 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-400 mb-1">Unrealized P&L</label>
                <input
                  type="number"
                  step="0.01"
                  value={editFormData.total_unrealized_pl ?? editingSnapshot.total_unrealized_pl}
                  onChange={(e) => setEditFormData({ ...editFormData, total_unrealized_pl: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700/50 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => {
                  setEditingSnapshot(null);
                  setEditFormData({});
                }}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700/50 rounded-xl text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 text-sm font-medium transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={updateMutation.isPending}
                className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-xl text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

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
    </>
  );
};

