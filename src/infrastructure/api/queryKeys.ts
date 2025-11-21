/**
 * Centralized Query Key Factory
 * 
 * Provides type-safe query keys for TanStack Query.
 * This ensures consistency across the application and makes
 * query invalidation easier and more maintainable.
 */

import type {
  PositionFilters,
  TransactionFilters,
  StrategyFilters,
  JournalEntryFilters,
  AIInsightFilters,
  StrategyPlanFilters,
} from '@/domain/types';
import type { AssetType } from '@/domain/types/asset.types';

/**
 * Factory function for creating query keys
 * Follows TanStack Query best practices for hierarchical keys
 */
export const queryKeys = {
  /**
   * Position-related query keys
   */
  positions: {
    all: ['positions'] as const,
    lists: () => [...queryKeys.positions.all, 'list'] as const,
    list: (userId: string, filters?: PositionFilters) =>
      [...queryKeys.positions.lists(), userId, filters] as const,
    details: () => [...queryKeys.positions.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.positions.details(), id] as const,
    open: (userId: string) => [...queryKeys.positions.all, 'open', userId] as const,
    expiring: (userId: string, daysAhead?: number) =>
      [...queryKeys.positions.all, 'expiring', userId, daysAhead] as const,
    statistics: (userId: string, startDate?: string, endDate?: string) =>
      ['position-statistics', userId, startDate, endDate] as const,
  },

  /**
   * Transaction-related query keys
   */
  transactions: {
    all: ['transactions'] as const,
    lists: () => [...queryKeys.transactions.all, 'list'] as const,
    list: (userId: string, filters?: TransactionFilters) =>
      [...queryKeys.transactions.lists(), userId, filters] as const,
    details: () => [...queryKeys.transactions.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.transactions.details(), id] as const,
    statistics: (userId: string, startDate?: string, endDate?: string) =>
      ['transaction-statistics', userId, startDate, endDate] as const,
  },

  /**
   * Strategy-related query keys
   */
  strategies: {
    all: ['strategies'] as const,
    lists: () => [...queryKeys.strategies.all, 'list'] as const,
    list: (userId: string, filters?: StrategyFilters) =>
      [...queryKeys.strategies.lists(), userId, filters] as const,
    details: () => [...queryKeys.strategies.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.strategies.details(), id] as const,
    open: (userId: string) => [...queryKeys.strategies.all, 'open', userId] as const,
  },

  /**
   * Journal entry-related query keys
   */
  journal: {
    all: ['journal-entries'] as const,
    lists: () => [...queryKeys.journal.all, 'list'] as const,
    list: (userId: string, filters?: JournalEntryFilters) =>
      [...queryKeys.journal.lists(), userId, filters] as const,
    details: () => [...queryKeys.journal.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.journal.details(), id] as const,
    stats: (userId: string, startDate?: string, endDate?: string) =>
      ['journal-stats', userId, startDate, endDate] as const,
  },

  /**
   * AI Insight-related query keys
   */
  aiInsights: {
    all: ['ai-insights'] as const,
    lists: () => [...queryKeys.aiInsights.all, 'list'] as const,
    list: (userId: string, filters?: AIInsightFilters) =>
      [...queryKeys.aiInsights.lists(), userId, filters] as const,
    details: () => [...queryKeys.aiInsights.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.aiInsights.details(), id] as const,
    statistics: (userId: string) => [...queryKeys.aiInsights.all, 'statistics', userId] as const,
  },

  /**
   * Strategy plan query keys
   */
  strategyPlans: {
    all: ['strategy-plans'] as const,
    list: (userId: string, filters?: StrategyPlanFilters) =>
      [...queryKeys.strategyPlans.all, 'list', userId, filters] as const,
    detail: (planId: string) => [...queryKeys.strategyPlans.all, 'detail', planId] as const,
    alignmentHistory: (planId: string) => [...queryKeys.strategyPlans.all, 'alignment-history', planId] as const,
  },

  /**
   * Market data query keys
   */
  marketData: {
    stockQuotes: {
      all: ['stock-quotes'] as const,
      list: (symbols: string[]) => {
        const sortedSymbols = [...symbols].sort();
        return [...queryKeys.marketData.stockQuotes.all, sortedSymbols] as const;
      },
      detail: (symbol: string) => ['stock-quote', symbol] as const,
    },
    optionQuotes: {
      all: ['option-quotes'] as const,
      list: (symbols: string[]) => {
        const sortedSymbols = [...symbols].sort();
        return [...queryKeys.marketData.optionQuotes.all, sortedSymbols] as const;
      },
      detail: (symbol: string) => ['option-quote', symbol] as const,
    },
    optionsChain: (underlyingSymbol: string, expiration?: string, strike?: number, side?: 'call' | 'put') =>
      ['options-chain', underlyingSymbol, expiration, strike, side] as const,
    cryptoQuotes: {
      all: ['crypto-quotes'] as const,
      list: (coinIds: string[]) => {
        const sortedIds = [...coinIds].sort();
        return [...queryKeys.marketData.cryptoQuotes.all, sortedIds] as const;
      },
      detail: (coinId: string) => ['crypto-quote', coinId] as const,
    },
    news: (userId: string) => ['market-news', userId] as const,
  },

  /**
   * Symbol search query keys
   */
  symbolSearch: {
    stock: (query: string) => ['stock-symbol-search', query] as const,
    options: (query: string) => ['options-symbol-search', query] as const,
    crypto: (query: string) => ['crypto-symbol-search', query] as const,
    tradier: (query: string) => ['tradier-symbol-search', query] as const,
  },

  /**
   * Portfolio and analytics query keys
   */
  portfolio: {
    value: (userId: string) => ['portfolio-value', userId] as const,
    history: (userId: string, timePeriod?: string) => ['portfolio-history', userId, timePeriod] as const,
    netCashFlow: (userId: string) => ['net-cash-flow', userId] as const,
    initialInvestment: (userId: string) => ['initial-investment', userId] as const,
  },

  /**
   * Analytics and performance query keys
   */
  analytics: {
    all: ['analytics'] as const,
    winRate: (userId: string, assetType?: AssetType) =>
      ['win-rate-metrics', userId, assetType] as const,
    dailyPerformance: (userId: string, portfolioValue?: number, unrealizedPL?: number) =>
      ['daily-performance', userId, portfolioValue, unrealizedPL] as const,
    weeklyPerformance: (userId: string, portfolioValue?: number, unrealizedPL?: number) =>
      ['weekly-performance', userId, portfolioValue, unrealizedPL] as const,
    monthlyPerformance: (userId: string, assetType?: AssetType, months?: number) =>
      ['monthly-performance', userId, assetType, months] as const,
    monthlyDashboard: (userId: string, portfolioValue?: number, unrealizedPL?: number) =>
      ['monthly-performance-dashboard', userId, portfolioValue, unrealizedPL] as const,
    yearlyPerformance: (userId: string, portfolioValue?: number, unrealizedPL?: number) =>
      ['yearly-performance', userId, portfolioValue, unrealizedPL] as const,
    symbolPerformance: (userId: string, assetType?: AssetType, days?: number) =>
      ['symbol-performance', userId, assetType, days] as const,
    strategyPerformance: (userId: string) => ['strategy-performance', userId] as const,
    entryTimePerformance: (userId: string, assetType: 'option' | 'futures') =>
      ['entry-time-performance', userId, assetType] as const,
    plOverTime: (userId: string, assetType?: AssetType, days?: number) =>
      ['pl-over-time', userId, assetType, days] as const,
    last7DaysPL: (userId: string, assetType?: AssetType) =>
      ['last-7-days-pl', userId, assetType] as const,
    dailyPerformanceCalendar: (userId: string, assetType?: AssetType) =>
      ['daily-performance-calendar', userId, assetType] as const,
    positionsByDate: (userId: string, date: string, assetType?: AssetType) =>
      ['positions-by-date', userId, date, assetType] as const,
  },

  /**
   * Cash-related query keys
   */
  cash: {
    transactions: {
      all: ['cash-transactions'] as const,
      lists: () => [...queryKeys.cash.transactions.all, 'list'] as const,
      list: (userId: string) => [...queryKeys.cash.transactions.lists(), userId] as const,
    },
    balance: (userId: string) => ['cash-balance', userId] as const,
  },

  /**
   * Futures contract specs query keys
   */
  futuresContractSpecs: {
    all: ['futures-contract-specs'] as const,
    lists: () => [...queryKeys.futuresContractSpecs.all, 'list'] as const,
    list: () => [...queryKeys.futuresContractSpecs.lists()] as const,
    active: () => [...queryKeys.futuresContractSpecs.all, 'active'] as const,
  },

  /**
   * User preferences query keys
   */
  userPreferences: {
    all: ['user-preferences'] as const,
    detail: (userId: string) => [...queryKeys.userPreferences.all, userId] as const,
  },
} as const;

