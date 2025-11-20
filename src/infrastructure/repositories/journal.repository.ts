import { supabase } from '../api/supabase';
import { parseError, logErrorWithContext } from '@/shared/utils/errorHandler';
import type { JournalEntry, JournalEntryType, EmotionType, JournalStats, JournalEntryFilters } from '@/domain/types';



export interface JournalEntryInsert {
  user_id: string;
  title: string;
  content: string;
  entry_type: JournalEntryType;
  entry_date: string;
  linked_position_ids?: string[];
  linked_transaction_ids?: string[];
  linked_symbols?: string[];
  emotions?: EmotionType[];
  market_condition?: string;
  strategy?: string;
  setup_quality?: number;
  execution_quality?: number;
  what_went_well?: string;
  what_went_wrong?: string;
  lessons_learned?: string;
  action_items?: string[];
  image_urls?: string[];
  chart_urls?: string[];
  tags?: string[];
  is_favorite?: boolean;
}

export interface JournalEntryUpdate {
  title?: string;
  content?: string;
  entry_type?: JournalEntryType;
  entry_date?: string;
  linked_position_ids?: string[];
  linked_transaction_ids?: string[];
  linked_symbols?: string[];
  emotions?: EmotionType[];
  market_condition?: string;
  strategy?: string;
  setup_quality?: number;
  execution_quality?: number;
  what_went_well?: string;
  what_went_wrong?: string;
  lessons_learned?: string;
  action_items?: string[];
  image_urls?: string[];
  chart_urls?: string[];
  tags?: string[];
  is_favorite?: boolean;
}

/**
 * Journal Entry Repository
 * Handles all database operations for journal_entries table
 */
export class JournalRepository {
  /**
   * Map database row to JournalEntry domain type
   */
  private static mapRowToEntry(row: any): JournalEntry {
    // Combine position and transaction IDs into linkedTradeIds for domain model
    const linkedTradeIds = [
      ...(row.linked_position_ids || []),
      ...(row.linked_transaction_ids || []),
    ];

    return {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      content: row.content,
      entryType: row.entry_type,
      entryDate: row.entry_date,
      linkedTradeIds: linkedTradeIds.length > 0 ? linkedTradeIds : undefined,
      linkedSymbols: row.linked_symbols || [],
      emotions: row.emotions || [],
      marketCondition: row.market_condition,
      strategy: row.strategy,
      setupQuality: row.setup_quality,
      executionQuality: row.execution_quality,
      whatWentWell: row.what_went_well,
      whatWentWrong: row.what_went_wrong,
      lessonsLearned: row.lessons_learned,
      actionItems: row.action_items || [],
      imageUrls: row.image_urls || [],
      chartUrls: row.chart_urls || [],
      tags: row.tags || [],
      isFavorite: row.is_favorite || false,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Get all journal entries for a user with optional filters
   */
  static async getAll(userId: string, filters?: JournalEntryFilters): Promise<JournalEntry[]> {
    let query = supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', userId)
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (filters?.startDate) {
      query = query.gte('entry_date', filters.startDate);
    }

    if (filters?.endDate) {
      query = query.lte('entry_date', filters.endDate);
    }

    if (filters?.entryType && filters.entryType !== 'all') {
      query = query.eq('entry_type', filters.entryType);
    }

    if (filters?.emotions && filters.emotions.length > 0) {
      query = query.contains('emotions', filters.emotions);
    }

    if (filters?.tags && filters.tags.length > 0) {
      query = query.overlaps('tags', filters.tags);
    }

    if (filters?.linkedSymbols && filters.linkedSymbols.length > 0) {
      query = query.overlaps('linked_symbols', filters.linkedSymbols);
    }

    if (filters?.isFavorite !== undefined) {
      query = query.eq('is_favorite', filters.isFavorite);
    }

    const { data, error } = await query;

    if (error) {
      const parsed = parseError(error);
      logErrorWithContext(error, { context: 'JournalRepository.getAll', userId, filters });
      throw new Error(`Failed to fetch journal entries: ${parsed.message}`, { cause: error });
    }

    return (data || []).map(this.mapRowToEntry);
  }

  /**
   * Get a journal entry by ID
   */
  static async getById(id: string): Promise<JournalEntry | null> {
    const { data, error } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      const parsed = parseError(error);
      logErrorWithContext(error, { context: 'JournalRepository.getById', id });
      throw new Error(`Failed to fetch journal entry: ${parsed.message}`, { cause: error });
    }

    return data ? this.mapRowToEntry(data) : null;
  }

  /**
   * Create a new journal entry
   */
  static async create(entry: JournalEntryInsert): Promise<JournalEntry> {
    const { data, error } = await supabase
      .from('journal_entries')
      .insert(entry)
      .select()
      .single();

    if (error) {
      const parsed = parseError(error);
      logErrorWithContext(error, { context: 'JournalRepository.create', entry });
      throw new Error(`Failed to create journal entry: ${parsed.message}`, { cause: error });
    }

    return this.mapRowToEntry(data);
  }

  /**
   * Update a journal entry
   */
  static async update(id: string, updates: JournalEntryUpdate): Promise<JournalEntry> {
    const { data, error } = await supabase
      .from('journal_entries')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      const parsed = parseError(error);
      logErrorWithContext(error, { context: 'JournalRepository.update', id, updates });
      throw new Error(`Failed to update journal entry: ${parsed.message}`, { cause: error });
    }

    return this.mapRowToEntry(data);
  }

  /**
   * Delete a journal entry
   */
  static async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('journal_entries')
      .delete()
      .eq('id', id);

    if (error) {
      const parsed = parseError(error);
      logErrorWithContext(error, { context: 'JournalRepository.delete', id });
      throw new Error(`Failed to delete journal entry: ${parsed.message}`, { cause: error });
    }
  }

  /**
   * Get journal statistics for a user
   */
  static async getStats(userId: string, startDate?: string, endDate?: string): Promise<JournalStats> {
    let query = supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', userId);

    if (startDate) {
      query = query.gte('entry_date', startDate);
    }

    if (endDate) {
      query = query.lte('entry_date', endDate);
    }

    const { data, error } = await query;

    if (error) {
      const parsed = parseError(error);
      logErrorWithContext(error, { context: 'JournalRepository.getStatistics', userId, startDate, endDate });
      throw new Error(`Failed to fetch journal stats: ${parsed.message}`, { cause: error });
    }

    const entries = (data || []).map(this.mapRowToEntry);
    const now = new Date();
    const thisMonth = entries.filter((entry) => {
      const entryDate = new Date(entry.entryDate);
      return (
        entryDate.getMonth() === now.getMonth() &&
        entryDate.getFullYear() === now.getFullYear()
      );
    });

    const thisWeek = entries.filter((entry) => {
      const entryDate = new Date(entry.entryDate);
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return entryDate >= weekAgo;
    });

    // Calculate emotion frequency
    const emotionCounts: Record<EmotionType, number> = {
      confident: 0,
      anxious: 0,
      excited: 0,
      fearful: 0,
      neutral: 0,
      frustrated: 0,
      greedy: 0,
      disciplined: 0,
    };

    entries.forEach((entry) => {
      entry.emotions?.forEach((emotion) => {
        if (emotion in emotionCounts) {
          emotionCounts[emotion as EmotionType]++;
        }
      });
    });

    const mostCommonEmotion = Object.entries(emotionCounts)
      .sort(([, a], [, b]) => b - a)
      .find(([, count]) => count > 0)?.[0] as EmotionType | undefined;

    // Calculate average quality ratings
    const entriesWithSetup = entries.filter((e) => e.setupQuality !== undefined && e.setupQuality !== null);
    const avgSetupQuality =
      entriesWithSetup.length > 0
        ? entriesWithSetup.reduce((sum, e) => sum + (e.setupQuality || 0), 0) / entriesWithSetup.length
        : undefined;

    const entriesWithExecution = entries.filter(
      (e) => e.executionQuality !== undefined && e.executionQuality !== null
    );
    const avgExecutionQuality =
      entriesWithExecution.length > 0
        ? entriesWithExecution.reduce((sum, e) => sum + (e.executionQuality || 0), 0) /
        entriesWithExecution.length
        : undefined;

    // Count linked trades
    const totalLinkedTrades = entries.reduce(
      (sum, entry) => sum + (entry.linkedTradeIds?.length || 0),
      0
    );

    return {
      totalEntries: entries.length,
      entriesThisMonth: thisMonth.length,
      entriesThisWeek: thisWeek.length,
      mostCommonEmotion,
      averageSetupQuality: avgSetupQuality,
      averageExecutionQuality: avgExecutionQuality,
      totalLinkedTrades,
    };
  }
}

