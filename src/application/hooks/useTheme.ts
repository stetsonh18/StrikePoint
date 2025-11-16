import { useEffect } from 'react';

/**
 * Applies dark theme to the document root.
 * This ensures the dark theme is always active.
 */
export const useTheme = () => {
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.add('dark');
    root.setAttribute('data-theme', 'dark');
  }, []);
};
