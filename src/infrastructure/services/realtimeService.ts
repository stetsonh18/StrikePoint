import { supabase } from '../api/supabase';
import { queryClient } from '../api/queryClient';
import { queryKeys } from '@/infrastructure/api/queryKeys';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { QueryKey } from '@tanstack/react-query';

/**
 * Realtime Service
 * Sets up Supabase Realtime subscriptions to automatically invalidate React Query cache
 * when database changes occur
 */
export class RealtimeService {
  private static channels: Map<string, RealtimeChannel> = new Map();

  /**
   * Set up realtime subscription for a table
   * Automatically invalidates React Query cache when changes occur
   */
  static subscribeToTable(
    table: string,
    userId: string,
    keysToInvalidate: QueryKey[]
  ): RealtimeChannel {
    const channelName = `${table}-${userId}`;

    // Unsubscribe from existing channel if present
    if (this.channels.has(channelName)) {
      this.channels.get(channelName)?.unsubscribe();
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table,
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log(`[Realtime] ${table} changed:`, payload.eventType, payload.new || payload.old);
          
          // Invalidate all related query keys
          keysToInvalidate.forEach((queryKey) => {
            queryClient.invalidateQueries({ queryKey, exact: false });
          });
        }
      )
      .subscribe();

    this.channels.set(channelName, channel);
    return channel;
  }

  /**
   * Set up all realtime subscriptions for a user
   */
  static setupSubscriptions(userId: string): void {
    if (!userId) return;

    // Subscribe to transactions
    this.subscribeToTable('transactions', userId, [
      queryKeys.transactions.all,
      queryKeys.transactions.statistics(userId),
      queryKeys.portfolio.value(userId),
      queryKeys.portfolio.history(userId),
      queryKeys.portfolio.netCashFlow(userId),
      queryKeys.portfolio.initialInvestment(userId),
      queryKeys.analytics.all,
      queryKeys.analytics.winRate(userId),
    ]);

    // Subscribe to positions
    this.subscribeToTable('positions', userId, [
      queryKeys.positions.all,
      queryKeys.positions.statistics(userId),
      queryKeys.positions.open(userId),
      queryKeys.positions.expiring(userId),
      queryKeys.portfolio.value(userId),
      queryKeys.portfolio.history(userId),
      queryKeys.analytics.all,
      queryKeys.analytics.winRate(userId),
    ]);

    // Subscribe to cash transactions
    this.subscribeToTable('cash_transactions', userId, [
      queryKeys.cash.transactions.all,
      queryKeys.cash.transactions.list(userId),
      queryKeys.cash.balance(userId),
      queryKeys.portfolio.value(userId),
      queryKeys.portfolio.netCashFlow(userId),
      queryKeys.portfolio.initialInvestment(userId),
    ]);

    // Subscribe to cash balances
    this.subscribeToTable('cash_balances', userId, [
      queryKeys.cash.balance(userId),
      queryKeys.portfolio.value(userId),
    ]);

    // Subscribe to strategies
    this.subscribeToTable('strategies', userId, [
      queryKeys.strategies.all,
      queryKeys.strategies.list(userId),
      queryKeys.strategies.open(userId),
      queryKeys.analytics.all,
      queryKeys.analytics.strategyPerformance(userId),
    ]);

    // Subscribe to journal entries
    this.subscribeToTable('journal_entries', userId, [
      queryKeys.journal.all,
      queryKeys.journal.stats(userId),
    ]);

    // Subscribe to AI insights
    this.subscribeToTable('ai_insights', userId, [
      queryKeys.aiInsights.all,
      queryKeys.aiInsights.statistics(userId),
    ]);

    // Subscribe to user preferences
    this.subscribeToTable('user_preferences', userId, [
      queryKeys.userPreferences.detail(userId),
    ]);

    console.log('[Realtime] Subscriptions set up for user:', userId);
  }

  /**
   * Clean up all subscriptions for a user
   */
  static cleanupSubscriptions(userId: string): void {
    if (!userId) return;

    const channelNames = [
      `transactions-${userId}`,
      `positions-${userId}`,
      `cash_transactions-${userId}`,
      `cash_balances-${userId}`,
      `strategies-${userId}`,
      `journal_entries-${userId}`,
      `ai_insights-${userId}`,
      `user_preferences-${userId}`,
    ];

    channelNames.forEach((name) => {
      const channel = this.channels.get(name);
      if (channel) {
        channel.unsubscribe();
        this.channels.delete(name);
      }
    });

    console.log('[Realtime] Subscriptions cleaned up for user:', userId);
  }

  /**
   * Clean up all subscriptions
   */
  static cleanupAll(): void {
    this.channels.forEach((channel) => {
      channel.unsubscribe();
    });
    this.channels.clear();
    console.log('[Realtime] All subscriptions cleaned up');
  }
}

