import { Save, User, Shield, Bell } from 'lucide-react';

export const Settings = () => {
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

      <div className="max-w-3xl space-y-6">
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
                defaultValue="John Doe"
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
                defaultValue="john@example.com"
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800/50 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
              />
            </div>
          </div>
        </div>

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
              <select className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800/50 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all">
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - British Pound</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Timezone
              </label>
              <select className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800/50 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all">
                <option value="UTC">UTC - Coordinated Universal Time</option>
                <option value="America/New_York">EST - Eastern Time</option>
                <option value="America/Los_Angeles">PST - Pacific Time</option>
              </select>
            </div>
          </div>
        </div>

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
                className="w-5 h-5 text-emerald-500 bg-slate-900 border-slate-700 rounded focus:ring-2 focus:ring-emerald-500/50 transition-all"
                defaultChecked
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

        <button className="group flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl font-semibold transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:scale-105">
          <Save className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" />
          Save Changes
        </button>
      </div>
    </div>
  );
};
