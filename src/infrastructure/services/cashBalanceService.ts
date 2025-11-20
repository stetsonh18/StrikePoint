import { CashBalanceRepository } from '../repositories/cashBalance.repository';
import type { Transaction, CashBalance } from '@/domain/types';

/**
 * Cash Balance Service
 * Handles cash balance calculations and updates from transactions
 */
export class CashBalanceService {
  /**
   * Update cash balance from a transaction
   * This should be called after a cash transaction is created
   */
  static async updateBalanceFromTransaction(
    userId: string,
    transaction: Transaction
  ): Promise<void> {
    if (transaction.asset_type !== 'cash') {
      return; // Only process cash transactions
    }

    // Get current balance or calculate from transactions
    const currentBalance = await CashBalanceRepository.getCurrentBalance(userId);
    const balanceDate = transaction.activity_date;

    // If we already have a balance for this date, update it
    // Otherwise, calculate from all transactions up to this date
    let balance: CashBalance;

    if (currentBalance && currentBalance.balance_date === balanceDate) {
      // Update existing balance
      balance = currentBalance;
    } else {
      // Calculate new balance from all transactions
      balance = await CashBalanceRepository.calculateBalanceFromTransactions(
        userId,
        balanceDate
      );
    }

    // Update the balance snapshot for this date
    await CashBalanceRepository.updateBalance(userId, {
      user_id: userId,
      balance_date: balanceDate,
      available_cash: balance.available_cash,
      pending_deposits: balance.pending_deposits,
      pending_withdrawals: balance.pending_withdrawals,
      margin_used: balance.margin_used,
      buying_power: balance.buying_power,
      total_cash: balance.total_cash,
    });
  }

  /**
   * Recalculate balance from all transactions up to a specific date
   */
  static async recalculateBalance(
    userId: string,
    asOfDate?: string
  ): Promise<CashBalance> {
    const balance = await CashBalanceRepository.calculateBalanceFromTransactions(
      userId,
      asOfDate
    );

    // Save the calculated balance
    await CashBalanceRepository.updateBalance(userId, {
      user_id: userId,
      balance_date: balance.balance_date,
      available_cash: balance.available_cash,
      pending_deposits: balance.pending_deposits,
      pending_withdrawals: balance.pending_withdrawals,
      margin_used: balance.margin_used,
      buying_power: balance.buying_power,
      total_cash: balance.total_cash,
    });

    return balance;
  }

  /**
   * Get current balance, calculating if necessary
   */
  static async getCurrentBalance(userId: string): Promise<CashBalance> {
    let balance = await CashBalanceRepository.getCurrentBalance(userId);

    if (!balance) {
      // No balance exists, calculate from all transactions
      balance = await this.recalculateBalance(userId);
    }

    return balance;
  }

  /**
   * Process all cash transaction codes and update balance
   * Handles: ACH, RTP, DCF, INT, CDIV, SLIP, GOLD, GMPC, OCC, WIRE, DEP, WD
   */
  static async processCashTransaction(
    userId: string,
    transaction: Transaction
  ): Promise<void> {
    // Only process cash transactions
    if (transaction.asset_type !== 'cash') {
      return;
    }

    // Update balance based on transaction
    await this.updateBalanceFromTransaction(userId, transaction);
  }

  /**
   * Initialize balance for a user (called after first import)
   * Calculates balance from all existing transactions
   */
  static async initializeBalance(userId: string): Promise<CashBalance> {
    return this.recalculateBalance(userId);
  }
}

