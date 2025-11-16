import { CashTransactionRepository } from '../repositories/cashTransaction.repository';
import { CashBalanceService } from './cashBalanceService';
import type { Transaction, CashTransactionInsert } from '@/domain/types';

/**
 * Crypto Cash Integration Service
 * Handles cash balance updates when cryptocurrencies are bought or sold
 */
export class CryptoCashIntegrationService {
  /**
   * Create cash transaction for a crypto purchase
   * Crypto purchase = cash debit (negative amount)
   */
  static async recordCryptoPurchase(
    transaction: Transaction
  ): Promise<void> {
    if (transaction.asset_type !== 'crypto') {
      return;
    }

    // Calculate total cost: (price * quantity) + fees
    const totalCost = Math.abs(transaction.amount) + transaction.fees;

    const cashTransaction: CashTransactionInsert = {
      user_id: transaction.user_id,
      transaction_code: 'CRYPTO_BUY', // Crypto purchase
      amount: -totalCost, // Negative = debit/withdrawal
      description: `Crypto purchase: ${transaction.quantity} ${transaction.underlying_symbol || transaction.instrument} @ $${transaction.price}`,
      notes: `Linked to transaction ${transaction.id}`,
      activity_date: transaction.activity_date,
      process_date: transaction.process_date,
      settle_date: transaction.settle_date,
      symbol: transaction.underlying_symbol || transaction.instrument || null,
      tags: ['crypto', 'purchase'],
    };

    // Create cash transaction
    const createdCashTx = await CashTransactionRepository.create(cashTransaction);

    // Update cash balance
    await CashBalanceService.recalculateBalance(transaction.user_id);

    console.log(`Cash transaction created for crypto purchase: ${createdCashTx.id}`);
  }

  /**
   * Create cash transaction for a crypto sale
   * Crypto sale = cash credit (positive amount)
   */
  static async recordCryptoSale(
    transaction: Transaction
  ): Promise<void> {
    if (transaction.asset_type !== 'crypto') {
      console.warn('recordCryptoSale called for non-crypto transaction:', transaction.asset_type);
      return;
    }

    // Calculate net proceeds: (price * quantity) - fees
    // For a sell, transaction.amount should already be positive
    const grossProceeds = Math.abs(transaction.amount || 0);
    const fees = transaction.fees || 0;
    const netProceeds = grossProceeds - fees;

    if (netProceeds <= 0) {
      console.warn('Crypto sale has zero or negative net proceeds:', {
        transactionId: transaction.id,
        grossProceeds,
        fees,
        netProceeds,
      });
    }

    const cashTransaction: CashTransactionInsert = {
      user_id: transaction.user_id,
      transaction_code: 'CRYPTO_SELL', // Crypto sale
      amount: netProceeds, // Positive = credit/deposit
      description: `Crypto sale: ${Math.abs(transaction.quantity || 0)} ${transaction.underlying_symbol || transaction.instrument} @ $${transaction.price || 0}`,
      notes: `Linked to transaction ${transaction.id}`,
      activity_date: transaction.activity_date,
      process_date: transaction.process_date,
      settle_date: transaction.settle_date,
      symbol: transaction.underlying_symbol || transaction.instrument || null,
      tags: ['crypto', 'sale'],
    };

    console.log('Creating cash transaction for crypto sale:', {
      transactionId: transaction.id,
      netProceeds,
      cashTransaction,
    });

    // Create cash transaction
    const createdCashTx = await CashTransactionRepository.create(cashTransaction);

    // Update cash balance
    await CashBalanceService.recalculateBalance(transaction.user_id);

    console.log(`Cash transaction created for crypto sale: ${createdCashTx.id}, amount: $${netProceeds.toFixed(2)}`);
  }

  /**
   * Process a crypto transaction and create corresponding cash transaction
   */
  static async processCryptoTransaction(
    transaction: Transaction
  ): Promise<void> {
    if (transaction.asset_type !== 'crypto') {
      console.warn('processCryptoTransaction called for non-crypto transaction:', transaction.asset_type);
      return;
    }

    const transactionCode = transaction.transaction_code?.trim();
    const isBuy = transactionCode === 'Buy' ||
                  transactionCode === 'BUY' ||
                  transactionCode === 'BOT';
    const isSell = transactionCode === 'Sell' ||
                   transactionCode === 'SELL' ||
                   transactionCode === 'SLD';

    console.log('Processing crypto transaction:', {
      id: transaction.id,
      code: transactionCode,
      isBuy,
      isSell,
      amount: transaction.amount,
      quantity: transaction.quantity,
      price: transaction.price,
    });

    if (isBuy) {
      await this.recordCryptoPurchase(transaction);
    } else if (isSell) {
      await this.recordCryptoSale(transaction);
    } else {
      console.warn(
        `Unknown crypto transaction code: "${transactionCode}". Expected: Buy, Sell, BUY, SELL, BOT, or SLD. Transaction ID: ${transaction.id}`
      );
      throw new Error(
        `Cannot process crypto transaction: unknown transaction code "${transactionCode}". Expected Buy or Sell.`
      );
    }
  }
}
