import { supabase } from '../api/supabase';
import { parseError, logErrorWithContext } from '@/shared/utils/errorHandler';
import { CashTransactionRepository } from './cashTransaction.repository';
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
      logErrorWithContext(error, { context: 'PositionRepository.create', position });
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
      logErrorWithContext(error, { context: 'PositionRepository.createMany', count: positions.length });
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
      logErrorWithContext(error, { context: 'PositionRepository.getById', id });
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
      logErrorWithContext(error, { context: 'PositionRepository.getAll', userId, filters });
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
      logErrorWithContext(error, { context: 'PositionRepository.getOpenPositions', userId });
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
      logErrorWithContext(error, {
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
      logErrorWithContext(error, { context: 'PositionRepository.update', id, updates });
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
      logErrorWithContext(error, { context: 'PositionRepository.getByStrategyId', strategyId });
      throw new Error(`Failed to fetch positions: ${parsed.message}`, { cause: error });
    }

    return data || [];
  }

  /**
   * Delete position
   * Also deletes:
   * - Associated transactions (via CASCADE on position_id FK)
   * - Associated cash transactions (via CASCADE on transaction_id FK from transactions)
   * - Journal entries that reference this position
   */
  static async delete(id: string): Promise<void> {
    // First, get the position to find the user_id
    const position = await this.getById(id);
    if (!position) {
      throw new Error(`Position not found: ${id}`);
    }

    // Delete journal entries that reference this position
    // Journal entries have linked_position_ids array that may contain this position ID
    // Fetch all journal entries for this user and filter in code
    const { data: allJournalEntries, error: journalError } = await supabase
      .from('journal_entries')
      .select('id, linked_position_ids')
      .eq('user_id', position.user_id);

    if (journalError) {
      logErrorWithContext(journalError, { context: 'PositionRepository.delete - fetching journal entries', id });
      // Continue with deletion even if journal fetch fails
    } else if (allJournalEntries && allJournalEntries.length > 0) {
      // Filter journal entries that contain this position ID in their linked_position_ids array
      const journalEntriesToDelete = allJournalEntries.filter(
        (entry) => entry.linked_position_ids && entry.linked_position_ids.includes(id)
      );

      if (journalEntriesToDelete.length > 0) {
        const journalIds = journalEntriesToDelete.map(entry => entry.id);
        const { error: deleteJournalError } = await supabase
          .from('journal_entries')
          .delete()
          .in('id', journalIds);

        if (deleteJournalError) {
          logErrorWithContext(deleteJournalError, { context: 'PositionRepository.delete - deleting journal entries', id });
          // Continue with position deletion even if journal deletion fails
        }
      }
    }

    // Capture transactions linked to this position so we can delete their cash counterparts
    let transactionIds: string[] = [];
    const { data: positionTransactions, error: positionTransactionsError } = await supabase
      .from('transactions')
      .select('id')
      .eq('position_id', id);

    if (positionTransactionsError) {
      logErrorWithContext(positionTransactionsError, { context: 'PositionRepository.delete - fetching transactions', id });
    } else if (positionTransactions?.length) {
      transactionIds = positionTransactions
        .map((tx) => tx.id)
        .filter((txId): txId is string => Boolean(txId));
    }

    if (transactionIds.length > 0) {
      try {
        await CashTransactionRepository.deleteByTransactionIds(transactionIds);
      } catch (cashDeleteError) {
        logErrorWithContext(cashDeleteError, {
          context: 'PositionRepository.delete - deleting cash transactions',
          id,
          transactionIds,
        });
        // Continue even if cash transactions can't be deleted to avoid blocking the position removal
      }
    }

    // Delete the position (transactions will cascade delete via FK)
    const { error } = await supabase.from('positions').delete().eq('id', id);

    if (error) {
      const parsed = parseError(error);
      logErrorWithContext(error, { context: 'PositionRepository.delete', id });
      throw new Error(`Failed to delete position: ${parsed.message}`, { cause: error });
    }
  }

  /**
   * Get position statistics
   * Note: For multi-leg strategies, wins/losses should be counted at the strategy level, not individual positions
   * This method only counts individual positions (not part of a strategy) for win/loss statistics
   */
  static async getStatistics(userId: string, startDate?: string, endDate?: string) {
    let query = supabase
      .from('positions')
      .select('status, realized_pl, unrealized_pl, opened_at, closed_at, strategy_id')
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
      logErrorWithContext(error, { context: 'PositionRepository.getStatistics', userId, startDate, endDate });
      throw new Error(`Failed to fetch statistics: ${parsed.message}`, { cause: error });
    }

    const positions = data || [];

    // Count individual positions with realized P/L (excluding positions that are part of a strategy)
    // Positions that are part of a strategy should be counted via the strategy, not individually
    // A position can have realized P/L even if it's still open (partial close)
    const individualPositionsWithRealizedPL = positions.filter(
      (p) => !p.strategy_id && p.realized_pl && p.realized_pl !== 0
    );
    const winningPositions = individualPositionsWithRealizedPL.filter((p) => p.realized_pl > 0);
    const losingPositions = individualPositionsWithRealizedPL.filter((p) => p.realized_pl < 0);

    const stats = {
      total: positions.length,
      open: positions.filter((p) => p.status === 'open').length,
      closed: positions.filter((p) => p.status === 'closed').length,
      totalRealizedPL: positions.reduce((sum, p) => sum + Number(p.realized_pl || 0), 0),
      totalUnrealizedPL: positions
        .filter((p) => p.status === 'open')
        .reduce((sum, p) => sum + Number(p.unrealized_pl || 0), 0),
      // Count wins/losses based on realized P/L for individual positions only
      // Strategy positions are counted separately at the strategy level
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
      logErrorWithContext(error, { context: 'PositionRepository.getExpiringSoon', userId, daysAhead });
      throw new Error(`Failed to fetch expiring positions: ${parsed.message}`, { cause: error });
    }

    return data || [];
  }

  /**
   * Get realized P&L for positions closed within a date range
   */
  static async getRealizedPLByDateRange(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<Pick<Position, 'id' | 'realized_pl' | 'closed_at'>[]> {
    const { data, error } = await supabase
      .from('positions')
      .select('id, realized_pl, closed_at')
      .eq('user_id', userId)
      .eq('status', 'closed')
      .gte('closed_at', startDate)
      .lte('closed_at', endDate);

    if (error) {
      const parsed = parseError(error);
      logErrorWithContext(error, { context: 'PositionRepository.getRealizedPLByDateRange', userId, startDate, endDate });
      throw new Error(`Failed to fetch realized P&L: ${parsed.message}`, { cause: error });
    }

    return data || [];
  }
}
