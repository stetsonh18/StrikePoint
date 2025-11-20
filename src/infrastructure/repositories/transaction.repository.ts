import { supabase } from '../api/supabase';
import { logger } from '@/shared/utils/logger';
import { parseError, logErrorWithContext } from '@/shared/utils/errorHandler';
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
      logErrorWithContext(error, { context: 'TransactionRepository.create', transaction });
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
      logErrorWithContext(error, { context: 'TransactionRepository.createMany', count: transactions.length });
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
      logErrorWithContext(error, { context: 'TransactionRepository.getById', id });
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
      logErrorWithContext(error, { context: 'TransactionRepository.getAll', userId, filters });
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
      logErrorWithContext(error, { context: 'TransactionRepository.getByImportId', importId });
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
      logErrorWithContext(error, { context: 'TransactionRepository.getOptionsForDetection', userId, startDate, endDate });
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
      logErrorWithContext(error, {
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
      logErrorWithContext(error, { context: 'TransactionRepository.update', id, updates });
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
      logErrorWithContext(error, { context: 'TransactionRepository.updateMany', ids, updates });
      throw new Error(`Failed to update transactions: ${parsed.message}`, { cause: error });
    }

    return data || [];
  }

  /**
   * Delete transaction
   * For multi-leg strategies: If the transaction is part of a strategy, deletes ALL transactions
   * in that strategy (both option transactions and their associated cash transactions)
   * Also deletes:
   * - Associated cash transactions (via CASCADE on transaction_id FK)
   * - Journal entries that reference this transaction
   * - Removes this transaction from positions' opening_transaction_ids and closing_transaction_ids arrays
   * 
   * @returns Information about what was deleted (for UI feedback)
   */
  static async delete(id: string): Promise<{ deletedCount: number; wasStrategy: boolean }> {
    // First, get the transaction to find the user_id and strategy_id
    const transaction = await this.getById(id);
    if (!transaction) {
      throw new Error(`Transaction not found: ${id}`);
    }

    // If this transaction is part of a multi-leg strategy, delete all transactions in that strategy
    if (transaction.strategy_id) {
      logger.info(`Transaction ${id} is part of strategy ${transaction.strategy_id}, deleting all strategy transactions`);

      // Find all transactions with the same strategy_id
      const { data: strategyTransactions, error: strategyError } = await supabase
        .from('transactions')
        .select('id')
        .eq('strategy_id', transaction.strategy_id)
        .eq('user_id', transaction.user_id);

      if (strategyError) {
        logger.warn('Error fetching strategy transactions for cascade delete', { error: strategyError, strategyId: transaction.strategy_id });
        // Continue with single transaction delete if fetch fails
      } else if (strategyTransactions && strategyTransactions.length > 0) {
        // Delete all transactions in the strategy (cash transactions will cascade via FK)
        const transactionIds = strategyTransactions.map(t => t.id);

        // Process each transaction to clean up positions and journal entries
        for (const txId of transactionIds) {
          await this.cleanupTransactionReferences(txId, transaction.user_id);
        }

        // Delete all strategy transactions at once
        const { error: deleteError } = await supabase
          .from('transactions')
          .delete()
          .in('id', transactionIds);

        if (deleteError) {
          const parsed = parseError(deleteError);
          logErrorWithContext(deleteError, { context: 'TransactionRepository.delete (strategy cascade)', strategyId: transaction.strategy_id });
          throw new Error(`Failed to delete strategy transactions: ${parsed.message}`, { cause: deleteError });
        }

        logger.info(`Deleted ${transactionIds.length} transactions for strategy ${transaction.strategy_id}`);

        // Optionally delete the strategy if it has no more transactions
        // Check if there are any remaining transactions for this strategy
        const { count } = await supabase
          .from('transactions')
          .select('id', { count: 'exact', head: true })
          .eq('strategy_id', transaction.strategy_id);

        if (count === 0) {
          // Delete the strategy if no transactions remain
          const { error: strategyDeleteError } = await supabase
            .from('strategies')
            .delete()
            .eq('id', transaction.strategy_id);

          if (strategyDeleteError) {
            logger.warn('Error deleting strategy after transaction deletion', {
              error: strategyDeleteError,
              strategyId: transaction.strategy_id,
            });
            // Don't throw - strategy deletion is optional
          } else {
            logger.info(`Deleted strategy ${transaction.strategy_id} after all transactions were removed`);
          }
        }

        return { deletedCount: transactionIds.length, wasStrategy: true }; // Exit early since we've deleted all strategy transactions
      }
    }

    // For single transaction deletion, clean up references
    await this.cleanupTransactionReferences(id, transaction.user_id);

    // Delete the transaction (cash transactions will cascade delete via FK)
    const { error } = await supabase.from('transactions').delete().eq('id', id);

    if (error) {
      const parsed = parseError(error);
      logErrorWithContext(error, { context: 'TransactionRepository.delete', id });
      throw new Error(`Failed to delete transaction: ${parsed.message}`, { cause: error });
    }

    return { deletedCount: 1, wasStrategy: false };
  }

  /**
   * Helper method to clean up references when deleting a transaction
   * Removes transaction from positions' arrays and deletes related journal entries
   */
  private static async cleanupTransactionReferences(id: string, userId: string): Promise<void> {
    // Remove this transaction from positions' arrays
    // Fetch all positions for this user and filter in code
    const { data: allPositions, error: positionsError } = await supabase
      .from('positions')
      .select('id, opening_transaction_ids, closing_transaction_ids, status')
      .eq('user_id', userId);

    if (positionsError) {
      logger.warn('Error fetching positions for transaction deletion', { error: positionsError, transactionId: id });
      // Continue with deletion even if position fetch fails
    } else if (allPositions && allPositions.length > 0) {
      // Filter positions that contain this transaction ID in their arrays
      const positionsToUpdate = allPositions.filter(
        (pos) =>
          (pos.opening_transaction_ids && pos.opening_transaction_ids.includes(id)) ||
          (pos.closing_transaction_ids && pos.closing_transaction_ids.includes(id))
      );

      // Update each position to remove this transaction ID from arrays
      for (const position of positionsToUpdate) {
        const openingIds = (position.opening_transaction_ids || []).filter((tid: string) => tid !== id);
        const closingIds = (position.closing_transaction_ids || []).filter((tid: string) => tid !== id);

        // If position has no more opening or closing transactions, delete it
        if (openingIds.length === 0 && closingIds.length === 0) {
          const { error: deleteError } = await supabase
            .from('positions')
            .delete()
            .eq('id', position.id);

          if (deleteError) {
            logger.warn('Error deleting orphaned position during transaction deletion', {
              error: deleteError,
              positionId: position.id,
              transactionId: id,
            });
          } else {
            logger.info(`Deleted orphaned position ${position.id} after transaction ${id} deletion`);
          }
        } else {
          // Update position arrays
          const { error: updateError } = await supabase
            .from('positions')
            .update({
              opening_transaction_ids: openingIds,
              closing_transaction_ids: closingIds,
            })
            .eq('id', position.id);

          if (updateError) {
            logger.warn('Error updating position arrays during transaction deletion', {
              error: updateError,
              positionId: position.id,
              transactionId: id,
            });
          }
        }
      }
    }

    // Delete journal entries that reference this transaction
    // Fetch all journal entries for this user and filter in code
    const { data: allJournalEntries, error: journalError } = await supabase
      .from('journal_entries')
      .select('id, linked_transaction_ids')
      .eq('user_id', userId);

    if (journalError) {
      logger.warn('Error fetching journal entries for transaction deletion', { error: journalError, transactionId: id });
      // Continue with deletion even if journal fetch fails
    } else if (allJournalEntries && allJournalEntries.length > 0) {
      // Filter journal entries that contain this transaction ID in their linked_transaction_ids array
      const journalEntriesToDelete = allJournalEntries.filter(
        (entry) => entry.linked_transaction_ids && entry.linked_transaction_ids.includes(id)
      );

      if (journalEntriesToDelete.length > 0) {
        const journalIds = journalEntriesToDelete.map(entry => entry.id);
        const { error: deleteJournalError } = await supabase
          .from('journal_entries')
          .delete()
          .in('id', journalIds);

        if (deleteJournalError) {
          logger.warn('Error deleting journal entries during transaction deletion', {
            error: deleteJournalError,
            transactionId: id,
          });
          // Continue with transaction deletion even if journal deletion fails
        }
      }
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
      logErrorWithContext(error, { context: 'TransactionRepository.findDuplicates', userId, transactionCount: transactions.length });
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
      logErrorWithContext(error, { context: 'TransactionRepository.getStatistics', userId, startDate, endDate });
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
