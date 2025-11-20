import { supabase } from '../api/supabase';
import { logger } from '@/shared/utils/logger';
import type { AIInsight, AIInsightFilters } from '@/domain/types';

export interface AIInsightInsert {
  user_id: string;
  type: AIInsight['type'];
  priority: AIInsight['priority'];
  title: string;
  description: string;
  analysis?: string;
  recommendations?: string[];
  related_symbols?: string[];
  related_positions?: string[];
  related_transactions?: string[];
  confidence?: number;
  actionable?: boolean;
  expires_at?: string;
  metadata?: Record<string, unknown>;
}

export interface AIInsightUpdate {
  title?: string;
  description?: string;
  analysis?: string;
  recommendations?: string[];
  is_read?: boolean;
  is_dismissed?: boolean;
  user_rating?: number;
  user_feedback?: string;
  read_at?: string;
  dismissed_at?: string;
}



export interface AIInsightStatistics {
  total: number;
  unread: number;
  actionable: number;
  by_priority: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  by_type: {
    risk_warning: number;
    opportunity: number;
    pattern: number;
    performance: number;
    strategy: number;
  };
}

/**
 * AI Insight Repository
 * Handles all database operations for ai_insights table
 */
export class AIInsightRepository {
  /**
   * Create a single AI insight
   */
  static async create(insight: AIInsightInsert): Promise<AIInsight> {
    const { data, error } = await supabase
      .from('ai_insights')
      .insert(insight)
      .select()
      .single();

    if (error) {
      logger.error('Error creating AI insight', error);
      throw new Error(`Failed to create AI insight: ${error.message}`);
    }

    return data;
  }

  /**
   * Create multiple AI insights in batch
   */
  static async createMany(insights: AIInsightInsert[]): Promise<AIInsight[]> {
    if (insights.length === 0) return [];

    const { data, error } = await supabase
      .from('ai_insights')
      .insert(insights)
      .select();

    if (error) {
      logger.error('Error creating AI insights', error);
      throw new Error(`Failed to create AI insights: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get a single AI insight by ID
   */
  static async getById(id: string): Promise<AIInsight | null> {
    const { data, error } = await supabase
      .from('ai_insights')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      logger.error('Error fetching AI insight', error);
      throw new Error(`Failed to fetch AI insight: ${error.message}`);
    }

    return data;
  }

  /**
   * Get all AI insights for a user with optional filters
   */
  static async getAll(
    userId: string,
    filters?: AIInsightFilters
  ): Promise<AIInsight[]> {
    let query = supabase
      .from('ai_insights')
      .select('*')
      .eq('user_id', userId);

    // Apply filters
    if (filters) {
      if (filters.type) {
        if (Array.isArray(filters.type)) {
          query = query.in('type', filters.type);
        } else {
          query = query.eq('type', filters.type);
        }
      }

      if (filters.priority) {
        if (Array.isArray(filters.priority)) {
          query = query.in('priority', filters.priority);
        } else {
          query = query.eq('priority', filters.priority);
        }
      }

      if (filters.is_read !== undefined) {
        query = query.eq('is_read', filters.is_read);
      }

      if (filters.is_dismissed !== undefined) {
        query = query.eq('is_dismissed', filters.is_dismissed);
      }

      if (filters.actionable !== undefined) {
        query = query.eq('actionable', filters.actionable);
      }

      if (filters.related_symbols && filters.related_symbols.length > 0) {
        query = query.overlaps('related_symbols', filters.related_symbols);
      }

      if (filters.generated_after) {
        query = query.gte('generated_at', filters.generated_after);
      }

      if (filters.generated_before) {
        query = query.lte('generated_at', filters.generated_before);
      }

      // Exclude expired insights by default
      if (!filters.include_expired) {
        query = query.or('expires_at.is.null,expires_at.gt.' + new Date().toISOString());
      }
    }

    // Default: sort by generated_at descending (newest first)
    query = query.order('generated_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      logger.error('Error fetching AI insights', error);
      throw new Error(`Failed to fetch AI insights: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Update an AI insight
   */
  static async update(
    id: string,
    updates: AIInsightUpdate
  ): Promise<AIInsight> {
    const { data, error } = await supabase
      .from('ai_insights')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('Error updating AI insight', error);
      throw new Error(`Failed to update AI insight: ${error.message}`);
    }

    return data;
  }

  /**
   * Mark an insight as read
   */
  static async markAsRead(id: string): Promise<AIInsight> {
    return this.update(id, {
      is_read: true,
      read_at: new Date().toISOString(),
    });
  }

  /**
   * Mark an insight as dismissed
   */
  static async dismiss(id: string): Promise<AIInsight> {
    return this.update(id, {
      is_dismissed: true,
      dismissed_at: new Date().toISOString(),
    });
  }

  /**
   * Add user rating and feedback
   */
  static async addFeedback(
    id: string,
    rating: number,
    feedback?: string
  ): Promise<AIInsight> {
    return this.update(id, {
      user_rating: rating,
      user_feedback: feedback,
    });
  }

  /**
   * Delete an AI insight
   */
  static async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('ai_insights')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('Error deleting AI insight', error);
      throw new Error(`Failed to delete AI insight: ${error.message}`);
    }
  }

  /**
   * Delete all insights for a user
   */
  static async deleteAllForUser(userId: string): Promise<void> {
    const { error } = await supabase
      .from('ai_insights')
      .delete()
      .eq('user_id', userId);

    if (error) {
      logger.error('Error deleting user AI insights', error);
      throw new Error(`Failed to delete user AI insights: ${error.message}`);
    }
  }

  /**
   * Get statistics for user's AI insights
   */
  static async getStatistics(
    userId: string
  ): Promise<AIInsightStatistics> {
    const { data, error } = await supabase
      .from('ai_insights')
      .select('type, priority, is_read, actionable')
      .eq('user_id', userId)
      .eq('is_dismissed', false)
      .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString());

    if (error) {
      logger.error('Error fetching AI insight statistics', error);
      throw new Error(`Failed to fetch AI insight statistics: ${error.message}`);
    }

    const insights = data || [];

    // Calculate statistics
    const stats: AIInsightStatistics = {
      total: insights.length,
      unread: insights.filter(i => !i.is_read).length,
      actionable: insights.filter(i => i.actionable).length,
      by_priority: {
        critical: insights.filter(i => i.priority === 'critical').length,
        high: insights.filter(i => i.priority === 'high').length,
        medium: insights.filter(i => i.priority === 'medium').length,
        low: insights.filter(i => i.priority === 'low').length,
      },
      by_type: {
        risk_warning: insights.filter(i => i.type === 'risk_warning').length,
        opportunity: insights.filter(i => i.type === 'opportunity').length,
        pattern: insights.filter(i => i.type === 'pattern').length,
        performance: insights.filter(i => i.type === 'performance').length,
        strategy: insights.filter(i => i.type === 'strategy').length,
      },
    };

    return stats;
  }

  /**
   * Clean up expired insights
   */
  static async cleanupExpired(userId: string): Promise<number> {
    const { data, error } = await supabase
      .from('ai_insights')
      .delete()
      .eq('user_id', userId)
      .not('expires_at', 'is', null)
      .lt('expires_at', new Date().toISOString())
      .eq('is_dismissed', true)
      .select('id');

    if (error) {
      logger.error('Error cleaning up expired insights', error);
      throw new Error(`Failed to clean up expired insights: ${error.message}`);
    }

    return data?.length || 0;
  }
}
