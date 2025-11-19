import { supabase } from '../api/supabase';
import { queryClient } from '../api/queryClient';
import type { RealtimeChannel } from '@supabase/supabase-js';

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
    queryKeys: string[][]
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
          queryKeys.forEach((queryKey) => {
            queryClient.invalidateQueries({ queryKey });
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
      ['transactions'],
      ['transaction-statistics', userId],
      // Also invalidate portfolio and analytics queries that depend on transactions
      ['portfolio-value', userId],
      ['portfolio-history', userId],
      ['net-cash-flow', userId],
      ['initial-investment', userId],
      ['analytics'],
      ['win-rate-metrics'], // Invalidate win rate metrics when transactions change
    ]);

    // Subscribe to positions
    this.subscribeToTable('positions', userId, [
      ['positions'],
      ['position-statistics', userId],
      ['positions', 'open', userId],
      ['positions', 'expiring', userId],
      // Also invalidate portfolio and analytics queries that depend on positions
      ['portfolio-value', userId],
      ['portfolio-history', userId],
      ['analytics'],
      ['win-rate-metrics'], // Invalidate win rate metrics when positions change
    ]);

    // Subscribe to cash transactions
    this.subscribeToTable('cash_transactions', userId, [
      ['cash-transactions'],
      ['cash_transactions', userId],
      ['cash-balance', userId],
      // Also invalidate portfolio queries that depend on cash transactions
      ['portfolio-value', userId],
      ['net-cash-flow', userId],
      ['initial-investment', userId],
    ]);

    // Subscribe to cash balances
    this.subscribeToTable('cash_balances', userId, [
      ['cash-balance', userId],
      // Also invalidate portfolio queries
      ['portfolio-value', userId],
    ]);

    // Subscribe to strategies
    this.subscribeToTable('strategies', userId, [
      ['strategies'],
      ['strategy-summaries', userId],
      ['strategy-statistics', userId],
      ['strategies', 'open', userId],
      // Also invalidate analytics queries that depend on strategies
      ['analytics'],
      ['strategy-performance', userId],
      ['win-rate-metrics'], // Invalidate win rate metrics when strategies change
    ]);

    // Subscribe to journal entries
    this.subscribeToTable('journal_entries', userId, [
      ['journal-entries'],
      ['journal-stats', userId],
    ]);

    // Subscribe to AI insights
    this.subscribeToTable('ai_insights', userId, [
      ['ai-insights'],
      ['ai-insights', 'statistics', userId],
    ]);

    // Subscribe to user preferences
    this.subscribeToTable('user_preferences', userId, [
      ['user-preferences', userId],
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

