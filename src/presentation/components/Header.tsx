import { Moon, Sun, Bell, Search } from 'lucide-react';
import { useTheme } from '../../application/hooks/useTheme';

export const Header = () => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <header className="h-16 bg-slate-950/50 backdrop-blur-xl border-b border-slate-800/50 flex items-center justify-between px-6 relative">
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-transparent pointer-events-none" />

      <div className="relative flex items-center gap-6 flex-1">
        <div className="flex-1 max-w-xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search trades, symbols..."
              className="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-slate-800/50 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all text-sm"
            />
          </div>
        </div>
      </div>

      <div className="relative flex items-center gap-2">
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-xl hover:bg-slate-800/50 text-slate-400 hover:text-emerald-400 transition-all group"
          aria-label="Toggle theme"
        >
          {isDark ? (
            <Sun className="w-5 h-5 group-hover:rotate-45 transition-transform duration-300" />
          ) : (
            <Moon className="w-5 h-5 group-hover:-rotate-12 transition-transform duration-300" />
          )}
        </button>

        <button
          className="relative p-2.5 rounded-xl hover:bg-slate-800/50 text-slate-400 hover:text-emerald-400 transition-all group"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent-500 rounded-full border-2 border-slate-950 animate-pulse" />
        </button>

        <div className="ml-2 h-8 w-px bg-slate-800/50" />

        <button className="flex items-center gap-3 pl-3 pr-4 py-2 rounded-xl hover:bg-slate-800/50 transition-all group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-xs font-bold text-slate-950 shadow-glow-sm">
            JD
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-sm font-medium text-slate-200 group-hover:text-emerald-400 transition-colors">
              John Doe
            </p>
            <p className="text-xs text-slate-500">Pro Trader</p>
          </div>
        </button>
      </div>
    </header>
  );
};
