import { supabase } from '../api/supabase';
import { logger } from '@/shared/utils/logger';
import { parseError, logError } from '@/shared/utils/errorHandler';
import { validateData, TransactionInsertSchema, TransactionUpdateSchema } from '@/shared/utils/validationSchemas';
import type {
  Transaction,
  TransactionInsert,
  TransactionUpdate,
  TransactionFilters,
  TransactionStatistics,
} from '@/domain/types';

/**
 * Transaction Repository
 * Handles all database operations for transactions table
 */
export class TransactionRepository {
  /**
   * Create a single transaction
   */
  static async create(transaction: TransactionInsert): Promise<Transaction> {
    // Validate input data
    const validatedTransaction = validateData(
      TransactionInsertSchema,
      transaction,
      'TransactionRepository.create'
    );

    const { data, error } = await supabase
      .from('transactions')
      .insert(validatedTransaction)
      .select()
      .single();

    if (error) {
      const parsed = parseError(error);
      logError(error, { context: 'TransactionRepository.create', transaction });
      throw new Error(`Failed to create transaction: ${parsed.message}`, { cause: error });
    }

    return data;
  }

  /**
   * Create multiple transactions in batch
   */
  static async createMany(transactions: TransactionInsert[]): Promise<Transaction[]> {
    if (transactions.length === 0) return [];

    // Validate all transactions
    const validatedTransactions = transactions.map((tx, index) =>
      validateData(
        TransactionInsertSchema,
        tx,
        `TransactionRepository.createMany[${index}]`
      )
    );

    const { data, error } = await supabase
      .from('transactions')
      .insert(validatedTransactions)
      .select();

    if (error) {
      const parsed = parseError(error);
      logError(error, { context: 'TransactionRepository.createMany', count: transactions.length });
      throw new Error(`Failed to create transactions: ${parsed.message}`, { cause: error });
    }

    return data || [];
  }

  /**
   * Get transaction by ID
   */
  static async getById(id: string): Promise<Transaction | null> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      const parsed = parseError(error);
      logError(error, { context: 'TransactionRepository.getById', id });
      throw new Error(`Failed to fetch transaction: ${parsed.message}`, { cause: error });
    }

    return data;
  }

  /**
   * Get all transactions for a user with optional filters
   */
  static async getAll(userId: string, filters?: TransactionFilters): Promise<Transaction[]> {
    let query = supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('activity_date', { ascending: false });

    // Apply filters
    if (filters?.asset_type) {
      query = query.eq('asset_type', filters.asset_type);
    }

    if (filters?.underlying_symbol) {
      query = query.eq('underlying_symbol', filters.underlying_symbol);
    }

    if (filters?.transaction_code) {
      query = query.eq('transaction_code', filters.transaction_code);
    }

    if (filters?.start_date) {
      query = query.gte('activity_date', filters.start_date);
    }

    if (filters?.end_date) {
      query = query.lte('activity_date', filters.end_date);
    }

    if (filters?.import_id) {
      query = query.eq('import_id', filters.import_id);
    }

    const { data, error } = await query;

    if (error) {
      const parsed = parseError(error);
      logError(error, { context: 'TransactionRepository.getAll', userId, filters });
      throw new Error(`Failed to fetch transactions: ${parsed.message}`, { cause: error });
    }

    return data || [];
  }

  /**
   * Get transactions by import ID
   */
  static async getByImportId(importId: string): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('import_id', importId)
      .order('activity_date', { ascending: false });

    if (error) {
      const parsed = parseError(error);
      logError(error, { context: 'TransactionRepository.getByImportId', importId });
      throw new Error(`Failed to fetch transactions: ${parsed.message}`, { cause: error });
    }

    return data || [];
  }

  /**
   * Get option transactions for pattern detection
   * Groups same-day transactions by underlying symbol
   */
  static async getOptionsForDetection(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('asset_type', 'option')
      .in('transaction_code', ['BTO', 'STO', 'BTC', 'STC'])
      .gte('activity_date', startDate)
      .lte('activity_date', endDate)
      .order('activity_date', { ascending: true })
      .order('underlying_symbol', { ascending: true });

    if (error) {
      const parsed = parseError(error);
      logError(error, { context: 'TransactionRepository.getOptionsForDetection', userId, startDate, endDate });
      throw new Error(`Failed to fetch options: ${parsed.message}`, { cause: error });
    }

    return data || [];
  }

  /**
   * Find opening transactions for matching (FIFO)
   */
  static async findOpeningTransactions(
    userId: string,
    underlyingSymbol: string,
    expirationDate: string,
    strikePrice: number,
    optionType: 'call' | 'put',
    isLong: boolean
  ): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('underlying_symbol', underlyingSymbol)
      .eq('expiration_date', expirationDate)
      .eq('strike_price', strikePrice)
      .eq('option_type', optionType)
      .eq('is_long', isLong)
      .eq('is_opening', true)
      .is('position_id', null) // Unmatched transactions
      .order('activity_date', { ascending: true });

    if (error) {
      const parsed = parseError(error);
      logError(error, { 
        context: 'TransactionRepository.findOpeningTransactions', 
        userId, 
        underlyingSymbol, 
        expirationDate, 
        strikePrice, 
        optionType, 
        isLong 
      });
      throw new Error(`Failed to find opening transactions: ${parsed.message}`, { cause: error });
    }

    return data || [];
  }

  /**
   * Update transaction
   */
  static async update(id: string, updates: TransactionUpdate): Promise<Transaction> {
    // Validate update data
    const validatedUpdates = validateData(
      TransactionUpdateSchema,
      updates,
      'TransactionRepository.update'
    );

    const { data, error } = await supabase
      .from('transactions')
      .update(validatedUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      const parsed = parseError(error);
      logError(error, { context: 'TransactionRepository.update', id, updates });
      throw new Error(`Failed to update transaction: ${parsed.message}`, { cause: error });
    }

    return data;
  }

  /**
   * Update multiple transactions (e.g., link to position/strategy)
   */
  static async updateMany(
    ids: string[],
    updates: TransactionUpdate
  ): Promise<Transaction[]> {
    if (ids.length === 0) return [];

    // Validate update data
    const validatedUpdates = validateData(
      TransactionUpdateSchema,
      updates,
      'TransactionRepository.updateMany'
    );

    const { data, error } = await supabase
      .from('transactions')
      .update(validatedUpdates)
      .in('id', ids)
      .select();

    if (error) {
      const parsed = parseError(error);
      logError(error, { context: 'TransactionRepository.updateMany', ids, updates });
      throw new Error(`Failed to update transactions: ${parsed.message}`, { cause: error });
    }

    return data || [];
  }

  /**
   * Delete transaction
   */
  static async delete(id: string): Promise<void> {
    const { error } = await supabase.from('transactions').delete().eq('id', id);

    if (error) {
      const parsed = parseError(error);
      logError(error, { context: 'TransactionRepository.delete', id });
      throw new Error(`Failed to delete transaction: ${parsed.message}`, { cause: error });
    }
  }

  /**
   * Check for duplicate transactions
   * Matches on: activity_date, underlying_symbol, transaction_code, quantity, amount
   */
  static async findDuplicates(
    userId: string,
    transactions: TransactionInsert[]
  ): Promise<Transaction[]> {
    if (transactions.length === 0) return [];

    // Build a query that finds potential duplicates
    // This is a simplified check - you might want more sophisticated logic
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .in(
        'activity_date',
        transactions.map((t) => t.activity_date)
      );

    if (error) {
      logError(error, { context: 'TransactionRepository.findDuplicates', userId, transactionCount: transactions.length });
      return [];
    }

    // Filter for exact matches
    const duplicates = (data || []).filter((existing) => {
      return transactions.some(
        (newTx) =>
          existing.activity_date === newTx.activity_date &&
          existing.underlying_symbol === newTx.underlying_symbol &&
          existing.transaction_code === newTx.transaction_code &&
          existing.quantity === newTx.quantity &&
          existing.amount === newTx.amount
      );
    });

    return duplicates;
  }

  /**
   * Get transaction statistics
   */
  static async getStatistics(userId: string, startDate?: string, endDate?: string): Promise<TransactionStatistics> {
    let query = supabase
      .from('transactions')
      .select('asset_type, transaction_code, amount, activity_date')
      .eq('user_id', userId);

    if (startDate) {
      query = query.gte('activity_date', startDate);
    }

    if (endDate) {
      query = query.lte('activity_date', endDate);
    }

    const { data, error } = await query;

    if (error) {
      const parsed = parseError(error);
      logError(error, { context: 'TransactionRepository.getStatistics', userId, startDate, endDate });
      throw new Error(`Failed to fetch statistics: ${parsed.message}`, { cause: error });
    }

    // Calculate statistics
    const stats = {
      total: data?.length || 0,
      byAssetType: {} as Record<string, number>,
      totalAmount: 0,
      dateRange: {
        start: startDate || null,
        end: endDate || null,
      },
    };

    data?.forEach((tx) => {
      stats.byAssetType[tx.asset_type] = (stats.byAssetType[tx.asset_type] || 0) + 1;
      stats.totalAmount += tx.amount || 0;
    });

    return stats;
  }
}
