import {
  LayoutDashboard,
  TrendingUp,
  BarChart3,
  Settings,
  DollarSign,
  LineChart,
  Sparkles,
  Bitcoin,
  BookOpen,
  Brain,
  Newspaper,
  Target,
} from 'lucide-react';

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
    name: 'Cash',
    path: '/cash',
    icon: DollarSign,
  },
  {
    name: 'Stocks',
    path: '/stocks',
    icon: LineChart,
  },
  {
    name: 'Options',
    path: '/options',
    icon: Sparkles,
  },
  {
    name: 'Crypto',
    path: '/crypto',
    icon: Bitcoin,
  },
  {
    name: 'Futures',
    path: '/futures',
    icon: TrendingUp,
  },
  {
    name: 'Journal',
    path: '/journal',
    icon: BookOpen,
  },
  {
    name: 'Analytics',
    path: '/analytics',
    icon: BarChart3,
  },
  {
    name: 'AI Insights',
    path: '/insights',
    icon: Brain,
  },
  {
    name: 'Strategy',
    path: '/strategy',
    icon: Target,
  },
  {
    name: 'News',
    path: '/news',
    icon: Newspaper,
  },
  {
    name: 'Settings',
    path: '/settings',
    icon: Settings,
  },
];
