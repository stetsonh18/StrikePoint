import React, { useState, useEffect, useCallback } from 'react';
import { Save, User, Shield, Bell, Settings as SettingsIcon, TrendingDown, Trash2, AlertTriangle, Activity } from 'lucide-react';
import { useAuthStore } from '@/application/stores/auth.store';
import { useUserPreferences, useUpdateUserPreferences } from '@/application/hooks/useUserPreferences';
import { FuturesContractManager } from '../components/FuturesContractManager';
import { DailyBalanceTable } from '../components/DailyBalanceTable';
import { supabase } from '@/infrastructure/api/supabase';
import { useToast } from '@/shared/hooks/useToast';
import { PortfolioSnapshotRepository } from '@/infrastructure/repositories/portfolioSnapshot.repository';
import { logger } from '@/shared/utils/logger';

export const Settings = () => {
  const user = useAuthStore((state) => state.user);
  const userId = user?.id || '';
  const toast = useToast();
  
  const [activeTab, setActiveTab] = useState<'general' | 'futures' | 'portfolio-history'>('general');

  // Form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [timezone, setTimezone] = useState('America/New_York');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [desktopNotifications, setDesktopNotifications] = useState(false);

  // Delete confirmation state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Load user preferences
  const { data: preferences, isLoading: preferencesLoading } = useUserPreferences(userId);
  const updatePreferences = useUpdateUserPreferences(userId);

  // Format currency function (moved outside conditional render)
  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }, []);
  
  // Load user profile data
  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
      setEmail(user.email || '');
    }
  }, [user]);
  
  // Load preferences into form
  useEffect(() => {
    if (preferences) {
      setCurrency(preferences.currency);
      setTimezone(preferences.timezone);
      setEmailNotifications(preferences.notifications.email);
      setDesktopNotifications(preferences.notifications.desktop);
    }
  }, [preferences]);
  
  const handleSave = async () => {
    try {
      // Update user profile (full name in auth metadata)
      if (user && fullName !== (user.fullName || '')) {
        const { error: profileError } = await supabase.auth.updateUser({
          data: {
            full_name: fullName,
          },
        });
        
        if (profileError) {
          logger.error('Error updating profile', profileError);
          toast.error('Failed to update profile information', {
            description: profileError.message || 'Please try again.',
          });
          return;
        }
        
        // Refresh user session to get updated metadata
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          // The auth store listener will pick up the change automatically
        }
      }
      
      // Update preferences
      await updatePreferences.mutateAsync({
        currency,
        timezone,
        notifications: {
          email: emailNotifications,
          desktop: desktopNotifications,
        },
      });
      
      toast.success('Settings saved successfully!');
    } catch (error) {
      logger.error('Error saving settings', error);
      toast.error('Failed to save settings', {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    }
  };
  
  const hasChanges = preferences && (
    currency !== preferences.currency ||
    timezone !== preferences.timezone ||
    emailNotifications !== preferences.notifications.email ||
    desktopNotifications !== preferences.notifications.desktop ||
    fullName !== (user?.fullName || '')
  );

  const handleDeleteAllData = async () => {
    if (deleteConfirmation !== 'DELETE') {
      toast.error('Please type DELETE to confirm');
      return;
    }

    setIsDeleting(true);

    try {
      // Delete all user data in the correct order to respect foreign key constraints
      // Tables are deleted in reverse dependency order

      // 1. Delete position_matches first (references positions and transactions)
      const { error: matchesError } = await supabase
        .from('position_matches')
        .delete()
        .eq('user_id', userId);

      if (matchesError) throw matchesError;

      // 2. Delete transactions (references positions)
      const { error: transactionsError } = await supabase
        .from('transactions')
        .delete()
        .eq('user_id', userId);

      if (transactionsError) throw transactionsError;

      // 3. Delete positions
      const { error: positionsError } = await supabase
        .from('positions')
        .delete()
        .eq('user_id', userId);

      if (positionsError) throw positionsError;

      // 4. Delete cash_transactions
      const { error: cashTxError } = await supabase
        .from('cash_transactions')
        .delete()
        .eq('user_id', userId);

      if (cashTxError) throw cashTxError;

      // 5. Delete strategies
      const { error: strategiesError } = await supabase
        .from('strategies')
        .delete()
        .eq('user_id', userId);

      if (strategiesError) throw strategiesError;

      // 6. Delete cash_balances
      const { error: balancesError } = await supabase
        .from('cash_balances')
        .delete()
        .eq('user_id', userId);

      if (balancesError) throw balancesError;

      // 7. Delete journal_entries
      const { error: journalError } = await supabase
        .from('journal_entries')
        .delete()
        .eq('user_id', userId);

      if (journalError) throw journalError;

      // 8. Delete portfolio_snapshots (portfolio history)
      await PortfolioSnapshotRepository.deleteAllForUser(userId);

      // 9. Delete imports
      const { error: importsError } = await supabase
        .from('imports')
        .delete()
        .eq('user_id', userId);

      if (importsError) throw importsError;

      // 10. Delete user_preferences (will be recreated on next load)
      const { error: preferencesError } = await supabase
        .from('user_preferences')
        .delete()
        .eq('user_id', userId);

      if (preferencesError) throw preferencesError;

      toast.success('All data deleted successfully!', {
        description: 'Your account has been reset. The page will reload.',
      });

      // Reset form
      setShowDeleteDialog(false);
      setDeleteConfirmation('');

      // Reload the page after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      logger.error('Error deleting user data', error);
      toast.error('Failed to delete all data', {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 dark:from-slate-100 to-slate-600 dark:to-slate-400 bg-clip-text text-transparent">
          Settings
        </h1>
        <p className="text-slate-600 dark:text-slate-500 mt-2 text-lg">
          Manage your account and preferences
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/50 dark:to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-800/50 overflow-hidden shadow-sm dark:shadow-none">
        <div className="flex border-b border-slate-200 dark:border-slate-800/50">
          <button
            onClick={() => setActiveTab('general')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-all ${
              activeTab === 'general'
                ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500 bg-emerald-500/5'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/30'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <SettingsIcon size={18} />
              <span>General</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('futures')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-all ${
              activeTab === 'futures'
                ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500 bg-emerald-500/5'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/30'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <TrendingDown size={18} />
              <span>Futures Contracts</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('portfolio-history')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-all ${
              activeTab === 'portfolio-history'
                ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500 bg-emerald-500/5'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/30'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Activity size={18} />
              <span>Portfolio History</span>
            </div>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'portfolio-history' ? (
            <div>
              <DailyBalanceTable 
                userId={userId} 
                formatCurrency={formatCurrency}
              />
            </div>
          ) : activeTab === 'general' ? (
            <div className="max-w-3xl space-y-6">
              {/* Profile Information */}
              <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/50 dark:to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-800/50 p-6 shadow-sm dark:shadow-none">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10">
                    <User className="w-5 h-5 text-emerald-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                    Profile Information
                  </h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      placeholder="John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-800/50 rounded-xl text-slate-900 dark:text-slate-200 placeholder-slate-500 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      placeholder="john@example.com"
                      value={email}
                      disabled
                      className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-800/50 rounded-xl text-slate-500 dark:text-slate-400 cursor-not-allowed"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                      Email cannot be changed from settings
                    </p>
                  </div>
                </div>
              </div>

              {/* Trading Preferences */}
              <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/50 dark:to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-800/50 p-6 shadow-sm dark:shadow-none">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10">
                    <Shield className="w-5 h-5 text-emerald-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                    Trading Preferences
                  </h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Default Currency
                    </label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700/50 rounded-xl text-slate-900 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all [&>option]:bg-white dark:[&>option]:bg-slate-800 [&>option]:text-slate-900 dark:[&>option]:text-slate-300"
                    >
                      <option value="USD">USD - US Dollar</option>
                      <option value="EUR">EUR - Euro</option>
                      <option value="GBP">GBP - British Pound</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Timezone
                    </label>
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700/50 rounded-xl text-slate-900 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all [&>option]:bg-white dark:[&>option]:bg-slate-800 [&>option]:text-slate-900 dark:[&>option]:text-slate-300"
                    >
                      <option value="UTC">UTC - Coordinated Universal Time</option>
                      <option value="America/New_York">EST - Eastern Time</option>
                      <option value="America/Chicago">CST - Central Time</option>
                      <option value="America/Denver">MST - Mountain Time</option>
                      <option value="America/Los_Angeles">PST - Pacific Time</option>
                      <option value="America/Phoenix">MST - Arizona Time</option>
                      <option value="Europe/London">GMT - London</option>
                      <option value="Europe/Paris">CET - Paris</option>
                      <option value="Asia/Tokyo">JST - Tokyo</option>
                      <option value="Asia/Hong_Kong">HKT - Hong Kong</option>
                      <option value="Australia/Sydney">AEDT - Sydney</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Notifications */}
              <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/50 dark:to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-800/50 p-6 shadow-sm dark:shadow-none">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10">
                    <Bell className="w-5 h-5 text-emerald-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                    Notifications
                  </h3>
                </div>
                <div className="space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer group p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/30 transition-all">
                    <input
                      type="checkbox"
                      checked={emailNotifications}
                      onChange={(e) => setEmailNotifications(e.target.checked)}
                      className="w-5 h-5 text-emerald-500 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 rounded focus:ring-2 focus:ring-emerald-500/50 transition-all"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-200 block">
                        Email notifications for trade updates
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-500">Get notified when your trades are executed</span>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/30 transition-all">
                    <input
                      type="checkbox"
                      checked={desktopNotifications}
                      onChange={(e) => setDesktopNotifications(e.target.checked)}
                      className="w-5 h-5 text-emerald-500 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 rounded focus:ring-2 focus:ring-emerald-500/50 transition-all"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-200 block">
                        Desktop notifications
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-500">Receive push notifications on your device</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="bg-gradient-to-br from-red-50 dark:from-red-950/30 to-red-100 dark:to-red-900/20 backdrop-blur-sm rounded-2xl border border-red-200 dark:border-red-800/50 p-6 shadow-sm dark:shadow-none">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 rounded-xl bg-red-500/10">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                    Danger Zone
                  </h3>
                </div>
                <div className="space-y-4">
                  <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30 rounded-xl">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h4 className="text-base font-semibold text-red-600 dark:text-red-400 mb-1">
                          Delete All Data
                        </h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          Permanently delete all positions, transactions, cash transactions, strategies, journal entries, portfolio history, and other data. This action cannot be undone.
                        </p>
                      </div>
                      <button
                        onClick={() => setShowDeleteDialog(true)}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all whitespace-nowrap"
                      >
                        Delete All
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <button
                onClick={handleSave}
                disabled={!hasChanges || updatePreferences.isPending || preferencesLoading}
                className="group flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:scale-105 disabled:hover:scale-100"
              >
                <Save className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" />
                {updatePreferences.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          ) : activeTab === 'futures' ? (
            <div>
              <FuturesContractManager />
            </div>
          ) : null}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-white dark:from-slate-900 to-slate-50 dark:to-slate-800 rounded-2xl border border-red-200 dark:border-red-800/50 shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-xl bg-red-500/10">
                <Trash2 className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Delete All Data
              </h3>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30 rounded-xl">
                <p className="text-sm text-slate-700 dark:text-slate-300 mb-2">
                  <strong className="text-red-600 dark:text-red-400">Warning:</strong> This will permanently delete:
                </p>
                <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1 ml-4 list-disc">
                  <li>All positions and transactions</li>
                  <li>All cash transactions and balances</li>
                  <li>All strategies and journal entries</li>
                  <li>All imports and position matches</li>
                  <li>Your preferences (will be reset to defaults)</li>
                </ul>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Type <span className="text-red-600 dark:text-red-400 font-mono">DELETE</span> to confirm:
                </label>
                <input
                  type="text"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder="DELETE"
                  className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-800/50 rounded-xl text-slate-900 dark:text-slate-200 placeholder-slate-500 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all font-mono"
                  autoFocus
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowDeleteDialog(false);
                    setDeleteConfirmation('');
                  }}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:cursor-not-allowed text-slate-900 dark:text-slate-200 rounded-xl font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAllData}
                  disabled={deleteConfirmation !== 'DELETE' || isDeleting}
                  className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-900/50 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete Everything
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
