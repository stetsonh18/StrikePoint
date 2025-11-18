import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  action: () => void;
  description: string;
}

/**
 * Hook for managing global keyboard shortcuts
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[], enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const ctrlMatch = shortcut.ctrlKey ? e.ctrlKey : !e.ctrlKey;
        const metaMatch = shortcut.metaKey ? e.metaKey : !e.metaKey;
        const shiftMatch = shortcut.shiftKey !== undefined ? (shortcut.shiftKey === e.shiftKey) : true;
        const altMatch = shortcut.altKey !== undefined ? (shortcut.altKey === e.altKey) : true;
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();

        if (ctrlMatch && metaMatch && shiftMatch && altMatch && keyMatch) {
          // Don't trigger if user is typing in an input
          const target = e.target as HTMLElement;
          if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
            continue;
          }

          e.preventDefault();
          shortcut.action();
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, enabled]);
}

/**
 * Hook for navigation keyboard shortcuts
 */
export function useNavigationShortcuts(enabled: boolean = true) {
  const navigate = useNavigate();

  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'g',
      ctrlKey: true,
      action: () => navigate('/'),
      description: 'Go to Dashboard',
    },
    {
      key: 'a',
      ctrlKey: true,
      action: () => navigate('/analytics'),
      description: 'Go to Analytics',
    },
    {
      key: 's',
      ctrlKey: true,
      action: () => navigate('/stocks'),
      description: 'Go to Stocks',
    },
    {
      key: 'o',
      ctrlKey: true,
      action: () => navigate('/options'),
      description: 'Go to Options',
    },
    {
      key: 'c',
      ctrlKey: true,
      action: () => navigate('/crypto'),
      description: 'Go to Crypto',
    },
    {
      key: 'f',
      ctrlKey: true,
      action: () => navigate('/futures'),
      description: 'Go to Futures',
    },
    {
      key: 'j',
      ctrlKey: true,
      action: () => navigate('/journal'),
      description: 'Go to Journal',
    },
    {
      key: 'n',
      ctrlKey: true,
      action: () => navigate('/news'),
      description: 'Go to News',
    },
    {
      key: ',',
      ctrlKey: true,
      action: () => navigate('/settings'),
      description: 'Go to Settings',
    },
  ];

  useKeyboardShortcuts(shortcuts, enabled);
}

