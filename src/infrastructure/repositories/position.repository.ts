import { supabase } from '../api/supabase';
import { parseError, logError } from '@/shared/utils/errorHandler';
import type {
  Position,
  PositionInsert,
  PositionUpdate,
  PositionFilters,
  PositionStatus,
  OpenPositionView,
} from '@/domain/types';

/**
 * Position Repository
 * Handles all database operations for positions table
 */
export class PositionRepository {
  /**
   * Create a new position
   */
  static async create(position: PositionInsert): Promise<Position> {
    const { data, error } = await supabase
      .from('positions')
      .insert(position)
      .select()
      .single();

    if (error) {
      const parsed = parseError(error);
      logError(error, { context: 'PositionRepository.create', position });
      throw new Error(`Failed to create position: ${parsed.message}`, { cause: error });
    }

    return data;
  }

  /**
   * Create multiple positions
   */
  static async createMany(positions: PositionInsert[]): Promise<Position[]> {
    if (positions.length === 0) return [];

    const { data, error } = await supabase
      .from('positions')
      .insert(positions)
      .select();

    if (error) {
      const parsed = parseError(error);
      logError(error, { context: 'PositionRepository.createMany', count: positions.length });
      throw new Error(`Failed to create positions: ${parsed.message}`, { cause: error });
    }

    return data || [];
  }

  /**
   * Get position by ID
   */
  static async getById(id: string): Promise<Position | null> {
    const { data, error } = await supabase
      .from('positions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      const parsed = parseError(error);
      logError(error, { context: 'PositionRepository.getById', id });
      throw new Error(`Failed to fetch position: ${parsed.message}`, { cause: error });
    }

    return data;
  }

  /**
   * Get all positions with filters
   */
  static async getAll(userId: string, filters?: PositionFilters): Promise<Position[]> {
    let query = supabase
      .from('positions')
      .select('*')
      .eq('user_id', userId)
      .order('opened_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.asset_type) {
      query = query.eq('asset_type', filters.asset_type);
    }

    if (filters?.symbol) {
      query = query.eq('symbol', filters.symbol);
    }

    if (filters?.strategy_id) {
      query = query.eq('strategy_id', filters.strategy_id);
    }

    if (filters?.expiration_date) {
      query = query.eq('expiration_date', filters.expiration_date);
    }

    const { data, error } = await query;

    if (error) {
      const parsed = parseError(error);
      logError(error, { context: 'PositionRepository.getAll', userId, filters });
      throw new Error(`Failed to fetch positions: ${parsed.message}`, { cause: error });
    }

    return data || [];
  }

  /**
   * Get open positions view with strategy information
   */
  static async getOpenPositions(userId: string): Promise<OpenPositionView[]> {
    const { data, error } = await supabase
      .from('v_open_positions')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      const parsed = parseError(error);
      logError(error, { context: 'PositionRepository.getOpenPositions', userId });
      throw new Error(`Failed to fetch open positions: ${parsed.message}`, { cause: error });
    }

    return (data || []) as OpenPositionView[];
  }

  /**
   * Find open position matching contract details (for FIFO matching)
   * Supports stocks, options, crypto, and futures
   */
  static async findOpenPosition(
    userId: string,
    symbol: string,
    optionType: 'call' | 'put' | null,
    strikePrice: number | null,
    expirationDate: string | null,
    side: 'long' | 'short',
    assetType?: 'stock' | 'option' | 'crypto' | 'futures',
    contractMonth?: string | null
  ): Promise<Position[]> {
    let query = supabase
      .from('positions')
      .select('*')
      .eq('user_id', userId)
      .eq('symbol', symbol)
      .eq('side', side)
      .eq('status', 'open')
      .gt('current_quantity', 0)
      .order('opened_at', { ascending: true }); // FIFO

    // Filter by asset type if provided
    if (assetType) {
      query = query.eq('asset_type', assetType);
    }

    // For options: match option-specific fields
    if (optionType) {
      query = query.eq('option_type', optionType);
    } else {
      query = query.is('option_type', null);
    }

    if (strikePrice !== null) {
      query = query.eq('strike_price', strikePrice);
    } else {
      query = query.is('strike_price', null);
    }

    if (expirationDate) {
      query = query.eq('expiration_date', expirationDate);
    } else {
      query = query.is('expiration_date', null);
    }

    // For futures: match contract month if provided
    if (contractMonth) {
      query = query.eq('contract_month', contractMonth);
    } else if (assetType === 'futures') {
      // For futures without contract month, don't filter by it
      query = query.is('contract_month', null);
    }

    const { data, error } = await query;

    if (error) {
      const parsed = parseError(error);
      logError(error, { 
        context: 'PositionRepository.findOpenPosition', 
        userId, 
        symbol, 
        optionType, 
        strikePrice, 
        expirationDate, 
        side, 
        assetType, 
        contractMonth 
      });
      throw new Error(`Failed to find open position: ${parsed.message}`, { cause: error });
    }

    return data || [];
  }

  /**
   * Update position
   */
  static async update(id: string, updates: PositionUpdate): Promise<Position> {
    const { data, error } = await supabase
      .from('positions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      const parsed = parseError(error);
      logError(error, { context: 'PositionRepository.update', id, updates });
      throw new Error(`Failed to update position: ${parsed.message}`, { cause: error });
    }

    return data;
  }

  /**
   * Close position (partial or full)
   */
  static async closePosition(
    id: string,
    closingQuantity: number,
    closingTransactionId: string,
    closingAmount: number,
    realizedPL: number
  ): Promise<Position> {
    const position = await this.getById(id);
    if (!position) throw new Error('Position not found');

    const newQuantity = position.current_quantity - closingQuantity;
    const newStatus: PositionStatus = newQuantity <= 0 ? 'closed' : 'open';
    const newClosingAmount = position.total_closing_amount + closingAmount;
    const newRealizedPL = position.realized_pl + realizedPL;

    // Calculate the proportional cost basis for the shares that were closed
    const closedCostBasis = (position.total_cost_basis / position.current_quantity) * closingQuantity;
    const remainingCostBasis = position.total_cost_basis - closedCostBasis;

    const updates: PositionUpdate = {
      current_quantity: newQuantity,
      total_closing_amount: newClosingAmount,
      realized_pl: newRealizedPL,
      total_cost_basis: remainingCostBasis, // Update cost basis for remaining shares
      status: newStatus,
      closing_transaction_ids: [
        ...(position.closing_transaction_ids || []),
        closingTransactionId,
      ],
    };

    if (newStatus === 'closed') {
      updates.closed_at = new Date().toISOString();
      updates.unrealized_pl = 0; // No unrealized P/L when position is fully closed
    }

    return this.update(id, updates);
  }

  /**
   * Update status (for assignments, exercises, expirations)
   */
  static async updateStatus(id: string, status: PositionStatus): Promise<Position> {
    const updates: PositionUpdate = { status };

    if (status === 'closed' || status === 'assigned' || status === 'exercised' || status === 'expired') {
      updates.closed_at = new Date().toISOString();
    }

    return this.update(id, updates);
  }

  /**
   * Get positions by strategy ID
   */
  static async getByStrategyId(strategyId: string): Promise<Position[]> {
    const { data, error } = await supabase
      .from('positions')
      .select('*')
      .eq('strategy_id', strategyId)
      .order('opened_at', { ascending: true });

    if (error) {
      const parsed = parseError(error);
      logError(error, { context: 'PositionRepository.getByStrategyId', strategyId });
      throw new Error(`Failed to fetch positions: ${parsed.message}`, { cause: error });
    }

    return data || [];
  }

  /**
   * Delete position
   */
  static async delete(id: string): Promise<void> {
    const { error } = await supabase.from('positions').delete().eq('id', id);

    if (error) {
      const parsed = parseError(error);
      logError(error, { context: 'PositionRepository.delete', id });
      throw new Error(`Failed to delete position: ${parsed.message}`, { cause: error });
    }
  }

  /**
   * Get position statistics
   */
  static async getStatistics(userId: string, startDate?: string, endDate?: string) {
    let query = supabase
      .from('positions')
      .select('status, realized_pl, unrealized_pl, opened_at, closed_at')
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
      logError(error, { context: 'PositionRepository.getStatistics', userId, startDate, endDate });
      throw new Error(`Failed to fetch statistics: ${parsed.message}`, { cause: error });
    }

    const positions = data || [];

    // Count positions with realized P/L (including partial closes)
    // A position can have realized P/L even if it's still open (partial close)
    const positionsWithRealizedPL = positions.filter((p) => p.realized_pl && p.realized_pl !== 0);
    const winningPositions = positionsWithRealizedPL.filter((p) => p.realized_pl > 0);
    const losingPositions = positionsWithRealizedPL.filter((p) => p.realized_pl < 0);

    const stats = {
      total: positions.length,
      open: positions.filter((p) => p.status === 'open').length,
      closed: positions.filter((p) => p.status === 'closed').length,
      totalRealizedPL: positions.reduce((sum, p) => sum + Number(p.realized_pl || 0), 0),
      totalUnrealizedPL: positions
        .filter((p) => p.status === 'open')
        .reduce((sum, p) => sum + Number(p.unrealized_pl || 0), 0),
      // Count wins/losses based on realized P/L, not just closed positions
      wins: winningPositions.length,
      losses: losingPositions.length,
      avgWin: winningPositions.length > 0
        ? winningPositions.reduce((sum, p) => sum + Number(p.realized_pl), 0) / winningPositions.length
        : 0,
      avgLoss: losingPositions.length > 0
        ? losingPositions.reduce((sum, p) => sum + Number(p.realized_pl), 0) / losingPositions.length
        : 0,
    };

    return stats;
  }

  /**
   * Get positions expiring soon
   */
  static async getExpiringSoon(userId: string, daysAhead: number = 7): Promise<Position[]> {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + daysAhead);

    const { data, error } = await supabase
      .from('positions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'open')
      .eq('asset_type', 'option')
      .gte('expiration_date', today.toISOString().split('T')[0])
      .lte('expiration_date', futureDate.toISOString().split('T')[0])
      .order('expiration_date', { ascending: true });

    if (error) {
      const parsed = parseError(error);
      logError(error, { context: 'PositionRepository.getExpiringSoon', userId, daysAhead });
      throw new Error(`Failed to fetch expiring positions: ${parsed.message}`, { cause: error });
    }

    return data || [];
  }
}
