import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/shared/theme/useTheme';

/**
 * Theme toggle button component
 * Allows users to switch between dark and light themes
 */
export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme, isDark } = useTheme();

  const handleClick = () => {
    toggleTheme();
  };

  return (
    <button
      onClick={handleClick}
      className="p-2 rounded-lg transition-all bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 hover:text-emerald-600 dark:bg-slate-800/50 dark:hover:bg-slate-800/70 dark:border-slate-700/50 dark:text-slate-400 dark:hover:text-emerald-400"
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
      title={`Switch to ${isDark ? 'light' : 'dark'} theme`}
    >
      {isDark ? (
        <Sun className="w-5 h-5" />
      ) : (
        <Moon className="w-5 h-5" />
      )}
    </button>
  );
};

