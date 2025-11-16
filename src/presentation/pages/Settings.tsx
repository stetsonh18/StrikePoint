import React, { useState, useEffect } from 'react';
import { Save, User, Shield, Bell, Settings as SettingsIcon, TrendingDown } from 'lucide-react';
import { useAuthStore } from '@/application/stores/auth.store';
import { useUserPreferences, useUpdateUserPreferences } from '@/application/hooks/useUserPreferences';
import { FuturesContractManager } from '../components/FuturesContractManager';
import { supabase } from '@/infrastructure/api/supabase';
import { useToast } from '@/shared/hooks/useToast';

export const Settings = () => {
  const user = useAuthStore((state) => state.user);
  const userId = user?.id || '';
  const toast = useToast();
  
  const [activeTab, setActiveTab] = useState<'general' | 'futures'>('general');
  
  // Form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [timezone, setTimezone] = useState('America/New_York');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [desktopNotifications, setDesktopNotifications] = useState(false);
  
  // Load user preferences
  const { data: preferences, isLoading: preferencesLoading } = useUserPreferences(userId);
  const updatePreferences = useUpdateUserPreferences(userId);
  
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
          console.error('Error updating profile:', profileError);
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
      console.error('Error saving settings:', error);
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
  
  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
          Settings
        </h1>
        <p className="text-slate-500 mt-2 text-lg">
          Manage your account and preferences
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-800/50 overflow-hidden">
        <div className="flex border-b border-slate-800/50">
          <button
            onClick={() => setActiveTab('general')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-all ${
              activeTab === 'general'
                ? 'text-emerald-400 border-b-2 border-emerald-500 bg-emerald-500/5'
                : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/30'
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
                ? 'text-emerald-400 border-b-2 border-emerald-500 bg-emerald-500/5'
                : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/30'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <TrendingDown size={18} />
              <span>Futures Contracts</span>
            </div>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'general' ? (
            <div className="max-w-3xl space-y-6">
              {/* Profile Information */}
              <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-800/50 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10">
                    <User className="w-5 h-5 text-emerald-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-100">
                    Profile Information
                  </h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      placeholder="John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800/50 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      placeholder="john@example.com"
                      value={email}
                      disabled
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800/50 rounded-xl text-slate-400 cursor-not-allowed"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Email cannot be changed from settings
                    </p>
                  </div>
                </div>
              </div>

              {/* Trading Preferences */}
              <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-800/50 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10">
                    <Shield className="w-5 h-5 text-emerald-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-100">
                    Trading Preferences
                  </h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">
                      Default Currency
                    </label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all [&>option]:bg-slate-800 [&>option]:text-slate-300"
                    >
                      <option value="USD">USD - US Dollar</option>
                      <option value="EUR">EUR - Euro</option>
                      <option value="GBP">GBP - British Pound</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">
                      Timezone
                    </label>
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all [&>option]:bg-slate-800 [&>option]:text-slate-300"
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
              <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-800/50 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10">
                    <Bell className="w-5 h-5 text-emerald-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-100">
                    Notifications
                  </h3>
                </div>
                <div className="space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer group p-3 rounded-xl hover:bg-slate-800/30 transition-all">
                    <input
                      type="checkbox"
                      checked={emailNotifications}
                      onChange={(e) => setEmailNotifications(e.target.checked)}
                      className="w-5 h-5 text-emerald-500 bg-slate-900 border-slate-700 rounded focus:ring-2 focus:ring-emerald-500/50 transition-all"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-slate-200 block">
                        Email notifications for trade updates
                      </span>
                      <span className="text-xs text-slate-500">Get notified when your trades are executed</span>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group p-3 rounded-xl hover:bg-slate-800/30 transition-all">
                    <input
                      type="checkbox"
                      checked={desktopNotifications}
                      onChange={(e) => setDesktopNotifications(e.target.checked)}
                      className="w-5 h-5 text-emerald-500 bg-slate-900 border-slate-700 rounded focus:ring-2 focus:ring-emerald-500/50 transition-all"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-slate-200 block">
                        Desktop notifications
                      </span>
                      <span className="text-xs text-slate-500">Receive push notifications on your device</span>
                    </div>
                  </label>
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
          ) : (
            <div>
              <FuturesContractManager />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
