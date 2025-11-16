import { CashTransactionRepository } from '../repositories/cashTransaction.repository';
import { CashBalanceService } from './cashBalanceService';
import type { Transaction, CashTransactionInsert } from '@/domain/types';

/**
 * Stock Cash Integration Service
 * Handles cash balance updates when stocks are bought or sold
 */
export class StockCashIntegrationService {
  /**
   * Create cash transaction for a stock purchase
   * Stock purchase = cash debit (negative amount)
   */
  static async recordStockPurchase(
    transaction: Transaction
  ): Promise<void> {
    if (transaction.asset_type !== 'stock') {
      return;
    }

    // Calculate total cost: (price * quantity) + fees
    const totalCost = Math.abs(transaction.amount) + transaction.fees;

    const cashTransaction: CashTransactionInsert = {
      user_id: transaction.user_id,
      transaction_code: 'STOCK_BUY', // Stock purchase - will create this code if needed
      amount: -totalCost, // Negative = debit/withdrawal
      description: `Stock purchase: ${transaction.quantity} shares of ${transaction.underlying_symbol || transaction.instrument} @ $${transaction.price}`,
      notes: `Linked to transaction ${transaction.id}`,
      activity_date: transaction.activity_date,
      process_date: transaction.process_date,
      settle_date: transaction.settle_date,
      symbol: transaction.underlying_symbol || transaction.instrument || null,
      tags: ['stock', 'purchase'],
    };

    // Create cash transaction
    const createdCashTx = await CashTransactionRepository.create(cashTransaction);

    // Update cash balance
    await CashBalanceService.recalculateBalance(transaction.user_id);

    console.log(`Cash transaction created for stock purchase: ${createdCashTx.id}`);
  }

  /**
   * Create cash transaction for a stock sale
   * Stock sale = cash credit (positive amount)
   */
  static async recordStockSale(
    transaction: Transaction
  ): Promise<void> {
    if (transaction.asset_type !== 'stock') {
      console.warn('recordStockSale called for non-stock transaction:', transaction.asset_type);
      return;
    }

    // Calculate net proceeds: (price * quantity) - fees
    // For a sell, transaction.amount should already be positive
    const grossProceeds = Math.abs(transaction.amount || 0);
    const fees = transaction.fees || 0;
    const netProceeds = grossProceeds - fees;

    if (netProceeds <= 0) {
      console.warn('Stock sale has zero or negative net proceeds:', {
        transactionId: transaction.id,
        grossProceeds,
        fees,
        netProceeds,
      });
    }

    const cashTransaction: CashTransactionInsert = {
      user_id: transaction.user_id,
      transaction_code: 'STOCK_SELL', // Stock sale - will create this code if needed
      amount: netProceeds, // Positive = credit/deposit
      description: `Stock sale: ${Math.abs(transaction.quantity || 0)} shares of ${transaction.underlying_symbol || transaction.instrument} @ $${transaction.price || 0}`,
      notes: `Linked to transaction ${transaction.id}`,
      activity_date: transaction.activity_date,
      process_date: transaction.process_date,
      settle_date: transaction.settle_date,
      symbol: transaction.underlying_symbol || transaction.instrument || null,
      tags: ['stock', 'sale'],
    };

    console.log('Creating cash transaction for stock sale:', {
      transactionId: transaction.id,
      netProceeds,
      cashTransaction,
    });

    // Create cash transaction
    const createdCashTx = await CashTransactionRepository.create(cashTransaction);

    // Update cash balance
    await CashBalanceService.recalculateBalance(transaction.user_id);

    console.log(`Cash transaction created for stock sale: ${createdCashTx.id}, amount: $${netProceeds.toFixed(2)}`);
  }

  /**
   * Process a stock transaction and create corresponding cash transaction
   */
  static async processStockTransaction(
    transaction: Transaction
  ): Promise<void> {
    if (transaction.asset_type !== 'stock') {
      console.warn('processStockTransaction called for non-stock transaction:', transaction.asset_type);
      return;
    }

    const transactionCode = transaction.transaction_code?.trim();
    const isBuy = transactionCode === 'Buy' ||
                  transactionCode === 'BUY' ||
                  transactionCode === 'BOT';
    const isSell = transactionCode === 'Sell' ||
                   transactionCode === 'SELL' ||
                   transactionCode === 'SLD';

    console.log('Processing stock transaction:', {
      id: transaction.id,
      code: transactionCode,
      isBuy,
      isSell,
      amount: transaction.amount,
      quantity: transaction.quantity,
      price: transaction.price,
    });

    if (isBuy) {
      await this.recordStockPurchase(transaction);
    } else if (isSell) {
      await this.recordStockSale(transaction);
    } else {
      console.warn(
        `Unknown stock transaction code: "${transactionCode}". Expected: Buy, Sell, BUY, SELL, BOT, or SLD. Transaction ID: ${transaction.id}`
      );
      throw new Error(
        `Cannot process stock transaction: unknown transaction code "${transactionCode}". Expected Buy or Sell.`
      );
    }
  }
}
