import { useState, useEffect } from 'react';
import { Bell, Search, LogOut, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../application/stores/auth.store';
import { useSidebarStore } from '../../application/stores/sidebar.store';
import { GlobalSearchModal } from './GlobalSearchModal';
import { ThemeToggle } from './ThemeToggle';
import { logger } from '@/shared/utils/logger';

export const Header = () => {
  const { user, signOut } = useAuthStore();
  const { toggleMobileMenu } = useSidebarStore();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      logger.error('Logout failed', error);
    }
  };

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return email?.slice(0, 2).toUpperCase() || 'U';
  };

  // Handle Cmd/Ctrl + K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearchModal(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header className="h-16 bg-white/50 dark:bg-slate-950/50 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800/50 flex items-center justify-between px-4 md:px-6 relative">
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 dark:from-emerald-500/5 via-transparent to-transparent pointer-events-none" />

      <div className="relative flex items-center gap-3 md:gap-6 flex-1">
        {/* Mobile menu button */}
        <button
          onClick={toggleMobileMenu}
          className="md:hidden p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:text-emerald-400 transition-all"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex-1 max-w-xl">
          <div className="relative">
            <label htmlFor="header-search" className="sr-only">
              Search trades and symbols
            </label>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" aria-hidden="true" />
            <input
              id="header-search"
              type="text"
              placeholder="Search... (Cmd/Ctrl + K)"
              aria-label="Search trades and symbols"
              className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/50 text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all text-sm cursor-pointer"
              onClick={() => setShowSearchModal(true)}
              readOnly
            />
          </div>
        </div>
      </div>

      <div className="relative flex items-center gap-1 md:gap-2">
        <ThemeToggle />
        
        <button
          className="relative p-2 md:p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:text-emerald-400 transition-all group"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent-500 rounded-full border-2 border-white dark:border-slate-950 animate-pulse" />
        </button>

        <div className="ml-1 md:ml-2 h-8 w-px bg-slate-200 dark:bg-slate-800/50" />

        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            aria-label="User menu"
            aria-expanded={showDropdown}
            aria-haspopup="true"
            className="flex items-center gap-2 md:gap-3 pl-2 md:pl-3 pr-2 md:pr-4 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all group"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-xs font-bold text-slate-950 shadow-glow-sm flex-shrink-0">
              {getInitials(user?.fullName, user?.email)}
            </div>
            <div className="text-left hidden lg:block">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-200 group-hover:text-emerald-400 transition-colors">
                {user?.fullName || user?.email?.split('@')[0] || 'User'}
              </p>
              <p className="text-xs text-slate-500">{user?.email}</p>
            </div>
          </button>

          {showDropdown && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowDropdown(false)}
              />
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-20 overflow-hidden max-w-[calc(100vw-2rem)]">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-red-400 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Global Search Modal */}
      <GlobalSearchModal isOpen={showSearchModal} onClose={() => setShowSearchModal(false)} />
    </header>
  );
};
