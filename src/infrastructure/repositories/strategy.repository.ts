import { supabase } from '../api/supabase';
import { parseError, logError } from '@/shared/utils/errorHandler';
import type {
  Strategy,
  StrategyInsert,
  StrategyUpdate,
  StrategyFilters,
  StrategyStatus,
  StrategySummaryView,
} from '@/domain/types';

/**
 * Strategy Repository
 * Handles all database operations for strategies table
 */
export class StrategyRepository {
  /**
   * Create a new strategy
   */
  static async create(strategy: StrategyInsert): Promise<Strategy> {
    const { data, error } = await supabase
      .from('strategies')
      .insert(strategy)
      .select()
      .single();

    if (error) {
      const parsed = parseError(error);
      logError(error, { context: 'StrategyRepository.create', strategy });
      throw new Error(`Failed to create strategy: ${parsed.message}`, { cause: error });
    }

    return data;
  }

  /**
   * Create multiple strategies
   */
  static async createMany(strategies: StrategyInsert[]): Promise<Strategy[]> {
    if (strategies.length === 0) return [];

    const { data, error } = await supabase
      .from('strategies')
      .insert(strategies)
      .select();

    if (error) {
      const parsed = parseError(error);
      logError(error, { context: 'StrategyRepository.createMany', count: strategies.length });
      throw new Error(`Failed to create strategies: ${parsed.message}`, { cause: error });
    }

    return data || [];
  }

  /**
   * Get strategy by ID
   */
  static async getById(id: string): Promise<Strategy | null> {
    const { data, error } = await supabase
      .from('strategies')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      const parsed = parseError(error);
      logError(error, { context: 'StrategyRepository.getById', id });
      throw new Error(`Failed to fetch strategy: ${parsed.message}`, { cause: error });
    }

    return data;
  }

  /**
   * Get all strategies with filters
   */
  static async getAll(userId: string, filters?: StrategyFilters): Promise<Strategy[]> {
    let query = supabase
      .from('strategies')
      .select('*')
      .eq('user_id', userId)
      .order('opened_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.strategy_type) {
      query = query.eq('strategy_type', filters.strategy_type);
    }

    if (filters?.underlying_symbol) {
      query = query.eq('underlying_symbol', filters.underlying_symbol);
    }

    if (filters?.direction) {
      query = query.eq('direction', filters.direction);
    }

    const { data, error } = await query;

    if (error) {
      const parsed = parseError(error);
      logError(error, { context: 'StrategyRepository.getAll', userId, filters });
      throw new Error(`Failed to fetch strategies: ${parsed.message}`, { cause: error });
    }

    return data || [];
  }

  /**
   * Get strategy summary view
   */
  static async getSummaries(userId: string, filters?: StrategyFilters): Promise<StrategySummaryView[]> {
    let query = supabase
      .from('v_strategy_summary')
      .select('*')
      .eq('user_id', userId);

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.strategy_type) {
      query = query.eq('strategy_type', filters.strategy_type);
    }

    if (filters?.underlying_symbol) {
      query = query.eq('underlying_symbol', filters.underlying_symbol);
    }

    const { data, error } = await query;

    if (error) {
      const parsed = parseError(error);
      logError(error, { context: 'StrategyRepository.getSummaries', userId, filters });
      throw new Error(`Failed to fetch strategy summaries: ${parsed.message}`, { cause: error });
    }

    return (data || []) as StrategySummaryView[];
  }

  /**
   * Get open strategies
   */
  static async getOpen(userId: string): Promise<Strategy[]> {
    return this.getAll(userId, { status: 'open' });
  }

  /**
   * Update strategy
   */
  static async update(id: string, updates: StrategyUpdate): Promise<Strategy> {
    const { data, error } = await supabase
      .from('strategies')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      const parsed = parseError(error);
      logError(error, { context: 'StrategyRepository.update', id, updates });
      throw new Error(`Failed to update strategy: ${parsed.message}`, { cause: error });
    }

    return data;
  }

  /**
   * Update status
   */
  static async updateStatus(id: string, status: StrategyStatus): Promise<Strategy> {
    const updates: StrategyUpdate = { status };

    if (status === 'closed' || status === 'assigned' || status === 'expired') {
      updates.closed_at = new Date().toISOString();
    }

    return this.update(id, updates);
  }

  /**
   * Close strategy (calculate final P/L)
   */
  static async closeStrategy(
    id: string,
    closingProceeds: number,
    realizedPL: number
  ): Promise<Strategy> {
    const strategy = await this.getById(id);
    if (!strategy) throw new Error('Strategy not found');

    const updates: StrategyUpdate = {
      status: 'closed',
      total_closing_proceeds: closingProceeds,
      realized_pl: realizedPL,
      closed_at: new Date().toISOString(),
    };

    return this.update(id, updates);
  }

  /**
   * Mark strategy as adjustment/roll
   */
  static async markAsAdjustment(
    id: string,
    originalStrategyId: string
  ): Promise<Strategy> {
    return this.update(id, {
      is_adjustment: true,
      original_strategy_id: originalStrategyId,
    });
  }

  /**
   * Link closed strategy to new adjusted strategy
   */
  static async linkAdjustment(
    closedStrategyId: string,
    newStrategyId: string
  ): Promise<Strategy> {
    return this.update(closedStrategyId, {
      adjusted_from_strategy_id: newStrategyId,
    });
  }

  /**
   * Get adjustment history for a strategy
   */
  static async getAdjustmentHistory(strategyId: string): Promise<Strategy[]> {
    // Get all strategies in the adjustment chain
    const { data, error } = await supabase
      .from('strategies')
      .select('*')
      .or(`original_strategy_id.eq.${strategyId},adjusted_from_strategy_id.eq.${strategyId}`)
      .order('opened_at', { ascending: true });

    if (error) {
      const parsed = parseError(error);
      logError(error, { context: 'StrategyRepository.getAdjustmentHistory', strategyId });
      throw new Error(`Failed to fetch adjustment history: ${parsed.message}`, { cause: error });
    }

    return data || [];
  }

  /**
   * Delete strategy
   */
  static async delete(id: string): Promise<void> {
    const { error } = await supabase.from('strategies').delete().eq('id', id);

    if (error) {
      const parsed = parseError(error);
      logError(error, { context: 'StrategyRepository.delete', id });
      throw new Error(`Failed to delete strategy: ${parsed.message}`, { cause: error });
    }
  }

  /**
   * Get strategy statistics
   */
  static async getStatistics(userId: string, startDate?: string, endDate?: string) {
    let query = supabase
      .from('strategies')
      .select('strategy_type, status, realized_pl, unrealized_pl, direction, opened_at')
      .eq('user_id', userId);

    if (startDate) {
      query = query.gte('opened_at', startDate);
    }

    if (endDate) {
      query = query.lte('opened_at', endDate);
    }

    const { data, error } = await query;

    if (error) {
      const parsed = parseError(error);
      logError(error, { context: 'StrategyRepository.getStatistics', userId, startDate, endDate });
      throw new Error(`Failed to fetch statistics: ${parsed.message}`, { cause: error });
    }

    const strategies = data || [];

    const stats = {
      total: strategies.length,
      open: strategies.filter((s) => s.status === 'open').length,
      closed: strategies.filter((s) => s.status === 'closed').length,
      totalRealizedPL: strategies.reduce((sum, s) => sum + (s.realized_pl || 0), 0),
      totalUnrealizedPL: strategies
        .filter((s) => s.status === 'open')
        .reduce((sum, s) => sum + (s.unrealized_pl || 0), 0),
      byType: {} as Record<string, number>,
      byDirection: {
        bullish: strategies.filter((s) => s.direction === 'bullish').length,
        bearish: strategies.filter((s) => s.direction === 'bearish').length,
        neutral: strategies.filter((s) => s.direction === 'neutral').length,
      },
      wins: strategies.filter((s) => s.status === 'closed' && s.realized_pl > 0).length,
      losses: strategies.filter((s) => s.status === 'closed' && s.realized_pl < 0).length,
    };

    // Count by type
    strategies.forEach((s) => {
      stats.byType[s.strategy_type] = (stats.byType[s.strategy_type] || 0) + 1;
    });

    return stats;
  }

  /**
   * Get strategies expiring soon
   */
  static async getExpiringSoon(userId: string, daysAhead: number = 7): Promise<Strategy[]> {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + daysAhead);

    const { data, error } = await supabase
      .from('strategies')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'open')
      .not('expiration_date', 'is', null)
      .gte('expiration_date', today.toISOString().split('T')[0])
      .lte('expiration_date', futureDate.toISOString().split('T')[0])
      .order('expiration_date', { ascending: true });

    if (error) {
      const parsed = parseError(error);
      logError(error, { context: 'StrategyRepository.getExpiringSoon', userId, daysAhead });
      throw new Error(`Failed to fetch expiring strategies: ${parsed.message}`, { cause: error });
    }

    return data || [];
  }

  /**
   * Search strategies by underlying symbol
   */
  static async searchBySymbol(userId: string, symbol: string): Promise<Strategy[]> {
    const { data, error } = await supabase
      .from('strategies')
      .select('*')
      .eq('user_id', userId)
      .ilike('underlying_symbol', `%${symbol}%`)
      .order('opened_at', { ascending: false });

    if (error) {
      const parsed = parseError(error);
      logError(error, { context: 'StrategyRepository.searchBySymbol', userId, symbol });
      throw new Error(`Failed to search strategies: ${parsed.message}`, { cause: error });
    }

    return data || [];
  }
}
