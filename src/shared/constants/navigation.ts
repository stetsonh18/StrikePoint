import { LayoutDashboard, TrendingUp, BarChart3, Settings } from 'lucide-react';

export interface NavigationItem {
  name: string;
  path: string;
  icon: typeof LayoutDashboard;
}

export const NAVIGATION_ITEMS: NavigationItem[] = [
  {
    name: 'Dashboard',
    path: '/',
    icon: LayoutDashboard,
  },
  {
    name: 'Trades',
    path: '/trades',
    icon: TrendingUp,
  },
  {
    name: 'Analytics',
    path: '/analytics',
    icon: BarChart3,
  },
  {
    name: 'Settings',
    path: '/settings',
    icon: Settings,
  },
];
