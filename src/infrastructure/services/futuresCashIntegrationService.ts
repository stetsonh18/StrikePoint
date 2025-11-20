import { CashTransactionRepository } from '../repositories/cashTransaction.repository';
import { CashBalanceService } from './cashBalanceService';
import { FuturesContractSpecRepository } from '../repositories/futuresContractSpec.repository';
import type { Transaction, CashTransactionInsert } from '@/domain/types';
import { parseContractSymbol } from '@/domain/types/futures.types';
import { logger } from '@/shared/utils/logger';

/**
 * Futures Cash Integration Service
 * Handles cash balance updates for futures trading (margin reservation/release)
 *
 * Futures cash flow:
 * - Opening a position: Reserve margin (debit) + fees (debit)
 * - Closing a position: Release margin (credit) + P&L (credit/debit) - fees (debit)
 */
export class FuturesCashIntegrationService {
  /**
   * Record cash impact when opening a futures position
   * Opening = margin reservation (debit) + fees (debit)
   */
  static async recordFuturesOpen(
    transaction: Transaction
  ): Promise<void> {
    if (transaction.asset_type !== 'futures') {
      return;
    }

    // Get contract spec to determine margin requirement
    const contractSymbol = parseContractSymbol(transaction.instrument || '');
    if (!contractSymbol) {
      logger.error('Could not parse futures contract symbol', new Error(`Symbol: ${transaction.instrument}`));
      return;
    }

    const contractSpec = await FuturesContractSpecRepository.getBySymbol(contractSymbol.symbol, transaction.user_id);
    if (!contractSpec) {
      logger.error(`Contract spec not found for symbol: ${contractSymbol.symbol}`, new Error(`User: ${transaction.user_id}`));
      return;
    }

    const quantity = Math.abs(transaction.quantity || 0);
    const marginPerContract = contractSpec.initial_margin || 0;
    const totalMarginRequired = quantity * marginPerContract;
    const fees = transaction.fees || 0;

    // Create cash transaction for margin reservation
    if (totalMarginRequired > 0) {
      const marginTransaction: CashTransactionInsert = {
        user_id: transaction.user_id,
        transaction_code: 'FUTURES_MARGIN', // Margin reservation
        amount: -totalMarginRequired, // Negative = debit/reserve
        description: `Margin reserved: ${quantity} contracts of ${transaction.instrument} @ $${marginPerContract.toLocaleString()}`,
        notes: `Linked to transaction ${transaction.id}`,
        activity_date: transaction.activity_date,
        process_date: transaction.process_date,
        settle_date: transaction.settle_date,
        symbol: transaction.underlying_symbol || transaction.instrument || null,
        transaction_id: transaction.id,
        tags: ['futures', 'margin', 'open'],
      };

      await CashTransactionRepository.create(marginTransaction);
    }

    // Create cash transaction for fees
    if (fees > 0) {
      const feeTransaction: CashTransactionInsert = {
        user_id: transaction.user_id,
        transaction_code: 'FEE', // Fee
        amount: -fees, // Negative = debit
        description: `Futures trading fees: ${quantity} contracts of ${transaction.instrument}`,
        notes: `Linked to transaction ${transaction.id}`,
        activity_date: transaction.activity_date,
        process_date: transaction.process_date,
        settle_date: transaction.settle_date,
        symbol: transaction.underlying_symbol || transaction.instrument || null,
        transaction_id: transaction.id,
        tags: ['futures', 'fee', 'open'],
      };

      await CashTransactionRepository.create(feeTransaction);
    }

    // Update cash balance
    await CashBalanceService.recalculateBalance(transaction.user_id);

    logger.info(`Cash transactions created for futures open: margin=$${totalMarginRequired}, fees=$${fees}`);
  }

  /**
   * Record cash impact when closing a futures position
   * Closing = margin release (credit) + P&L (credit/debit) - fees (debit)
   *
   * Note: To calculate P&L, we need the entry price and quantity from the original position.
   * This should be passed in the transaction notes or we need to look it up.
   */
  static async recordFuturesClose(
    transaction: Transaction,
    entryPrice?: number,
    entryQuantity?: number
  ): Promise<void> {
    if (transaction.asset_type !== 'futures') {
      logger.warn(`recordFuturesClose called for non-futures transaction: ${transaction.asset_type}`);
      return;
    }

    // Get contract spec to determine margin and calculate P&L
    const contractSymbol = parseContractSymbol(transaction.instrument || '');
    if (!contractSymbol) {
      console.error('Could not parse futures contract symbol:', transaction.instrument);
      return;
    }

    const contractSpec = await FuturesContractSpecRepository.getBySymbol(contractSymbol.symbol, transaction.user_id);
    if (!contractSpec) {
      console.error('Contract spec not found for symbol:', contractSymbol.symbol, 'user:', transaction.user_id);
      return;
    }

    const quantity = Math.abs(transaction.quantity || 0);
    const exitPrice = transaction.price || 0;
    const marginPerContract = contractSpec.initial_margin || 0;
    const totalMarginReleased = quantity * marginPerContract;
    const fees = transaction.fees || 0;

    // Release margin
    if (totalMarginReleased > 0) {
      const marginReleaseTransaction: CashTransactionInsert = {
        user_id: transaction.user_id,
        transaction_code: 'FUTURES_MARGIN_RELEASE', // Margin release
        amount: totalMarginReleased, // Positive = credit/release
        description: `Margin released: ${quantity} contracts of ${transaction.instrument}`,
        notes: `Linked to transaction ${transaction.id}`,
        activity_date: transaction.activity_date,
        process_date: transaction.process_date,
        settle_date: transaction.settle_date,
        symbol: transaction.underlying_symbol || transaction.instrument || null,
        transaction_id: transaction.id,
        tags: ['futures', 'margin', 'close'],
      };

      await CashTransactionRepository.create(marginReleaseTransaction);
    }

    // Calculate P&L if we have entry price
    if (entryPrice !== undefined && entryQuantity !== undefined) {
      const multiplier = contractSpec.multiplier;
      const isLongPosition = transaction.is_long; // The original position direction

      // P&L calculation:
      // Long position: (exit_price - entry_price) * quantity * multiplier
      // Short position: (entry_price - exit_price) * quantity * multiplier
      const priceDiff = isLongPosition
        ? (exitPrice - entryPrice)
        : (entryPrice - exitPrice);

      const realizedPL = priceDiff * Math.abs(entryQuantity) * multiplier;

      // Create P&L cash transaction
      const plTransaction: CashTransactionInsert = {
        user_id: transaction.user_id,
        transaction_code: realizedPL >= 0 ? 'FUTURES_PROFIT' : 'FUTURES_LOSS',
        amount: realizedPL, // Positive = profit (credit), Negative = loss (debit)
        description: `Realized P&L: ${quantity} contracts of ${transaction.instrument} (${isLongPosition ? 'Long' : 'Short'})`,
        notes: `Entry: $${entryPrice}, Exit: $${exitPrice}, P&L: $${realizedPL.toFixed(2)}. Linked to transaction ${transaction.id}`,
        activity_date: transaction.activity_date,
        process_date: transaction.process_date,
        settle_date: transaction.settle_date,
        symbol: transaction.underlying_symbol || transaction.instrument || null,
        transaction_id: transaction.id,
        tags: ['futures', 'pnl', 'close'],
      };

      await CashTransactionRepository.create(plTransaction);

      logger.info(`Realized P&L for ${transaction.instrument}: $${realizedPL.toFixed(2)}`);
    }

    // Deduct fees
    if (fees > 0) {
      const feeTransaction: CashTransactionInsert = {
        user_id: transaction.user_id,
        transaction_code: 'FEE',
        amount: -fees, // Negative = debit
        description: `Futures trading fees: ${quantity} contracts of ${transaction.instrument}`,
        notes: `Linked to transaction ${transaction.id}`,
        activity_date: transaction.activity_date,
        process_date: transaction.process_date,
        settle_date: transaction.settle_date,
        symbol: transaction.underlying_symbol || transaction.instrument || null,
        transaction_id: transaction.id,
        tags: ['futures', 'fee', 'close'],
      };

      await CashTransactionRepository.create(feeTransaction);
    }

    // Update cash balance
    await CashBalanceService.recalculateBalance(transaction.user_id);

    logger.info(`Cash transactions created for futures close: margin released=$${totalMarginReleased}, fees=$${fees}`);
  }

  /**
   * Process a futures transaction and create corresponding cash transactions
   */
  static async processFuturesTransaction(
    transaction: Transaction,
    entryPrice?: number,
    entryQuantity?: number
  ): Promise<void> {
    if (transaction.asset_type !== 'futures') {
      logger.warn(`processFuturesTransaction called for non-futures transaction: ${transaction.asset_type}`);
      return;
    }

    const transactionCode = transaction.transaction_code?.trim();
    const isBuy = transactionCode === 'Buy' || transactionCode === 'BUY';
    const isSell = transactionCode === 'Sell' || transactionCode === 'SELL';

    // Determine if this is opening or closing based on quantity sign and position
    // For now, we'll assume:
    // - Buy with positive quantity = Opening long
    // - Sell with negative quantity = Opening short
    // - Sell with positive quantity (from position) = Closing long
    // - Buy with negative quantity (from position) = Closing short

    const quantity = transaction.quantity || 0;

    logger.info('Processing futures transaction', {
      id: transaction.id,
      code: transactionCode,
      quantity,
      isBuy,
      isSell,
      instrument: transaction.instrument,
    });

    // If entryPrice is provided, this is a closing transaction
    if (entryPrice !== undefined) {
      await this.recordFuturesClose(transaction, entryPrice, entryQuantity);
    } else {
      // This is an opening transaction
      await this.recordFuturesOpen(transaction);
    }
  }
}
