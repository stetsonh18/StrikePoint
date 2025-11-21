import { useState, useEffect, useCallback } from 'react';
import type { ThemeMode } from './theme.config';

const THEME_STORAGE_KEY = 'strikepoint-theme';
const DEFAULT_THEME: ThemeMode = 'dark';
const THEME_EVENT = 'strikepoint-theme-change';

const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

const getStoredTheme = (): ThemeMode | null => {
  if (!isBrowser) return null;
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
  if (stored === 'dark' || stored === 'light') {
    return stored;
  }
  return null;
};

const applyThemeToDom = (theme: ThemeMode) => {
  if (!isBrowser) return;
  const root = document.documentElement;
  
  if (theme === 'light') {
    root.classList.remove('dark');
    root.setAttribute('data-theme', 'light');
  } else {
    root.classList.add('dark');
    root.setAttribute('data-theme', 'dark');
  }
};

const broadcastThemeChange = (theme: ThemeMode) => {
  if (!isBrowser) return;
  window.dispatchEvent(new CustomEvent<ThemeMode>(THEME_EVENT, { detail: theme }));
};

/**
 * Custom hook for theme management
 * Handles theme switching, persistence, and DOM updates
 */
export function useTheme() {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const stored = getStoredTheme();
    if (stored) {
      return stored;
    }

    if (isBrowser && window.matchMedia) {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      return prefersDark ? 'dark' : 'light';
    }

    return DEFAULT_THEME;
  });

  // Apply theme to DOM
  useEffect(() => {
    applyThemeToDom(theme);
    if (isBrowser) {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    }
  }, [theme]);

  // Sync theme across components/tabs
  useEffect(() => {
    if (!isBrowser) return;

    const handleThemeEvent = (event: Event) => {
      const detail = (event as CustomEvent<ThemeMode>).detail;
      if (!detail) return;
      setTheme((prev) => (prev === detail ? prev : detail));
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY) return;
      if (event.newValue !== 'dark' && event.newValue !== 'light') return;
      setTheme((prev) => (prev === event.newValue ? prev : (event.newValue as ThemeMode)));
    };

    window.addEventListener(THEME_EVENT, handleThemeEvent as EventListener);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(THEME_EVENT, handleThemeEvent as EventListener);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // Listen for system theme changes
  useEffect(() => {
    if (!isBrowser || !window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      // Only auto-switch if user hasn't manually set a preference
      const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (!stored) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
    // Fallback for older browsers
    else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      broadcastThemeChange(next);
      return next;
    });
  }, []);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setTheme((prev) => {
      if (prev === mode) {
        return prev;
      }
      broadcastThemeChange(mode);
      return mode;
    });
  }, []);

  return {
    theme,
    toggleTheme,
    setTheme: setThemeMode,
    isDark: theme === 'dark',
    isLight: theme === 'light',
  };
}

