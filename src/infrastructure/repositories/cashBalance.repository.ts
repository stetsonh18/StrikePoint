import { supabase } from '../api/supabase';
import { parseError, logErrorWithContext } from '@/shared/utils/errorHandler';
import type { CashBalance, CashBalanceInsert, TransactionFilters } from '@/domain/types';
import { TransactionRepository } from './transaction.repository';

/**
 * Cash Balance Repository
 * Handles all database operations for cash_balances table
 */
export class CashBalanceRepository {
  /**
   * Create a cash balance snapshot
   */
  static async create(balance: CashBalanceInsert): Promise<CashBalance> {
    const { data, error } = await supabase
      .from('cash_balances')
      .insert(balance)
      .select()
      .single();

    if (error) {
      const parsed = parseError(error);
      logErrorWithContext(error, { context: 'CashBalanceRepository.create', balance });
      throw new Error(`Failed to create cash balance: ${parsed.message}`, { cause: error });
    }

    return data;
  }

  /**
   * Get current cash balance (most recent snapshot)
   */
  static async getCurrentBalance(userId: string): Promise<CashBalance | null> {
    const { data, error } = await supabase
      .from('cash_balances')
      .select('*')
      .eq('user_id', userId)
      .order('balance_date', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      const parsed = parseError(error);
      logErrorWithContext(error, { context: 'CashBalanceRepository.getCurrentBalance', userId });
      throw new Error(`Failed to fetch current balance: ${parsed.message}`, { cause: error });
    }

    return data;
  }

  /**
   * Get balance history for a date range
   */
  static async getBalanceHistory(
    userId: string,
    startDate?: string,
    endDate?: string
  ): Promise<CashBalance[]> {
    let query = supabase
      .from('cash_balances')
      .select('*')
      .eq('user_id', userId)
      .order('balance_date', { ascending: false });

    if (startDate) {
      query = query.gte('balance_date', startDate);
    }

    if (endDate) {
      query = query.lte('balance_date', endDate);
    }

    const { data, error } = await query;

    if (error) {
      const parsed = parseError(error);
      logErrorWithContext(error, { context: 'CashBalanceRepository.getBalanceHistory', userId, startDate, endDate });
      throw new Error(`Failed to fetch balance history: ${parsed.message}`, { cause: error });
    }

    return data || [];
  }

  /**
   * Get balance for a specific date
   */
  static async getBalanceByDate(
    userId: string,
    date: string
  ): Promise<CashBalance | null> {
    const { data, error } = await supabase
      .from('cash_balances')
      .select('*')
      .eq('user_id', userId)
      .eq('balance_date', date)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      const parsed = parseError(error);
      logErrorWithContext(error, { context: 'CashBalanceRepository.getBalanceByDate', userId, date });
      throw new Error(`Failed to fetch balance: ${parsed.message}`, { cause: error });
    }

    return data;
  }

  /**
   * Calculate balance from transactions up to a specific date
   * This aggregates all cash transactions to compute the balance
   */
  static async calculateBalanceFromTransactions(
    userId: string,
    asOfDate?: string
  ): Promise<CashBalance> {
    // Get all cash transactions up to the specified date
    const filters: TransactionFilters = {
      asset_type: 'cash',
    };

    if (asOfDate) {
      filters.end_date = asOfDate;
    }

    const transactions = await TransactionRepository.getAll(userId, filters);

    // Initialize balance
    let availableCash = 0;
    let pendingDeposits = 0;
    let pendingWithdrawals = 0;
    const marginUsed = 0; // This would need to be calculated from positions
    let totalCash = 0;

    // Process each transaction
    for (const tx of transactions) {
      const amount = tx.amount || 0;
      const settleDate = tx.settle_date;

      // Determine if transaction is settled
      const asOf = asOfDate ? new Date(asOfDate) : new Date();
      const isSettled = settleDate && new Date(settleDate) <= asOf;

      // Categorize transaction
      switch (tx.transaction_code) {
        // Deposits
        case 'ACH':
        case 'RTP':
        case 'DCF':
        case 'DEP':
          if (isSettled) {
            availableCash += amount;
            totalCash += amount;
          } else {
            pendingDeposits += amount;
            totalCash += amount;
          }
          break;

        // Withdrawals
        case 'WD':
          if (isSettled) {
            availableCash += amount; // amount is negative for withdrawals
            totalCash += amount;
          } else {
            pendingWithdrawals += Math.abs(amount);
            totalCash += amount;
          }
          break;

        // Interest and dividends (always settled)
        case 'INT':
        case 'CDIV':
        case 'SLIP':
          availableCash += amount;
          totalCash += amount;
          break;

        // Fees (always settled)
        case 'GOLD':
        case 'FEE':
          availableCash += amount; // amount is negative for fees
          totalCash += amount;
          break;

        // Credits
        case 'GMPC':
          availableCash += amount;
          totalCash += amount;
          break;

        // Option cash component
        case 'OCC':
          availableCash += amount;
          totalCash += amount;
          break;

        default:
          // For unknown cash transaction codes, assume settled
          availableCash += amount;
          totalCash += amount;
      }
    }

    // Calculate buying power (simplified - would need margin calculations)
    const buyingPower = availableCash; // In a real system, this would include margin

    const balanceDate = asOfDate || new Date().toISOString().split('T')[0];

    return {
      id: '', // Will be set when saved
      user_id: userId,
      balance_date: balanceDate,
      available_cash: availableCash,
      pending_deposits: pendingDeposits,
      pending_withdrawals: pendingWithdrawals,
      margin_used: marginUsed,
      buying_power: buyingPower,
      total_cash: totalCash,
      created_at: new Date().toISOString(),
    };
  }

  /**
   * Update or create balance for a specific date
   */
  static async updateBalance(
    userId: string,
    balance: CashBalanceInsert
  ): Promise<CashBalance> {
    // Check if balance exists for this date
    const existing = await this.getBalanceByDate(userId, balance.balance_date);

    if (existing) {
      // Update existing balance
      const { data, error } = await supabase
        .from('cash_balances')
        .update({
          available_cash: balance.available_cash,
          pending_deposits: balance.pending_deposits,
          pending_withdrawals: balance.pending_withdrawals,
          margin_used: balance.margin_used,
          buying_power: balance.buying_power,
          total_cash: balance.total_cash,
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        const parsed = parseError(error);
        logErrorWithContext(error, { context: 'CashBalanceRepository.updateBalance', userId, balance, existingId: existing.id });
        throw new Error(`Failed to update cash balance: ${parsed.message}`, { cause: error });
      }

      return data;
    } else {
      // Create new balance
      return this.create(balance);
    }
  }

  /**
   * Delete cash balance
   */
  static async delete(id: string): Promise<void> {
    const { error } = await supabase.from('cash_balances').delete().eq('id', id);

    if (error) {
      const parsed = parseError(error);
      logErrorWithContext(error, { context: 'CashBalanceRepository.delete', id });
      throw new Error(`Failed to delete cash balance: ${parsed.message}`, { cause: error });
    }
  }
}

