import { CashTransactionRepository } from '../repositories/cashTransaction.repository';
import { CashBalanceService } from './cashBalanceService';
import type { Transaction, CashTransactionInsert } from '@/domain/types';

/**
 * Options Cash Integration Service
 * Handles cash balance updates when options are bought or sold
 */
export class OptionsCashIntegrationService {
  /**
   * Create cash transaction for an options purchase (BTO - Buy to Open)
   * Options purchase = cash debit (negative amount)
   */
  static async recordOptionsPurchase(
    transaction: Transaction
  ): Promise<void> {
    if (transaction.asset_type !== 'option') {
      return;
    }

    if (!transaction.id) {
      throw new Error('Transaction ID is required to create cash transaction. Transaction must be saved to database first.');
    }

    // For options: amount = premium * quantity (usually 100 shares per contract)
    // BTO should have negative amount (debit)
    const totalCost = Math.abs(transaction.amount) + transaction.fees;

    const optionDescription = `${transaction.underlying_symbol} ${transaction.expiration_date} ${transaction.strike_price} ${transaction.option_type?.toUpperCase()}`;

    const cashTransaction: CashTransactionInsert = {
      user_id: transaction.user_id,
      transaction_code: 'OPTION_BUY',
      amount: -totalCost, // Negative = debit/withdrawal
      description: `Options purchase (BTO): ${Math.abs(transaction.quantity || 0)} contracts of ${optionDescription} @ $${transaction.price}`,
      notes: `Linked to transaction ${transaction.id}`,
      activity_date: transaction.activity_date,
      process_date: transaction.process_date,
      settle_date: transaction.settle_date,
      symbol: transaction.underlying_symbol || null,
      transaction_id: transaction.id,
      tags: ['option', 'purchase', 'BTO'],
    };

    // Create cash transaction
    const createdCashTx = await CashTransactionRepository.create(cashTransaction);

    // Update cash balance
    await CashBalanceService.recalculateBalance(transaction.user_id);

    console.log(`Cash transaction created for options purchase: ${createdCashTx.id}`);
  }

  /**
   * Create cash transaction for an options sale to open (STO - Sell to Open)
   * Options sale to open = cash credit (positive amount)
   */
  static async recordOptionsSaleToOpen(
    transaction: Transaction
  ): Promise<void> {
    if (transaction.asset_type !== 'option') {
      console.warn('recordOptionsSaleToOpen called for non-option transaction:', transaction.asset_type);
      return;
    }

    if (!transaction.id) {
      throw new Error('Transaction ID is required to create cash transaction. Transaction must be saved to database first.');
    }

    // For STO: receive premium (credit), minus fees
    const grossProceeds = Math.abs(transaction.amount || 0);
    const fees = transaction.fees || 0;
    const netProceeds = grossProceeds - fees;

    if (netProceeds <= 0) {
      console.warn('Options STO has zero or negative net proceeds:', {
        transactionId: transaction.id,
        grossProceeds,
        fees,
        netProceeds,
      });
    }

    const optionDescription = `${transaction.underlying_symbol} ${transaction.expiration_date} ${transaction.strike_price} ${transaction.option_type?.toUpperCase()}`;

    const cashTransaction: CashTransactionInsert = {
      user_id: transaction.user_id,
      transaction_code: 'OPTION_SELL',
      amount: netProceeds, // Positive = credit/deposit
      description: `Options sale (STO): ${Math.abs(transaction.quantity || 0)} contracts of ${optionDescription} @ $${transaction.price || 0}`,
      notes: `Linked to transaction ${transaction.id}`,
      activity_date: transaction.activity_date,
      process_date: transaction.process_date,
      settle_date: transaction.settle_date,
      symbol: transaction.underlying_symbol || null,
      transaction_id: transaction.id,
      tags: ['option', 'sale', 'STO'],
    };

    console.log('Creating cash transaction for options STO:', {
      transactionId: transaction.id,
      netProceeds,
      cashTransaction,
    });

    // Create cash transaction
    const createdCashTx = await CashTransactionRepository.create(cashTransaction);

    // Update cash balance
    await CashBalanceService.recalculateBalance(transaction.user_id);

    console.log(`Cash transaction created for options STO: ${createdCashTx.id}, amount: $${netProceeds.toFixed(2)}`);
  }

  /**
   * Create cash transaction for closing an options position (BTC/STC)
   * BTC (Buy to Close) = cash debit (negative)
   * STC (Sell to Close) = cash credit (positive)
   */
  static async recordOptionsClose(
    transaction: Transaction
  ): Promise<void> {
    if (transaction.asset_type !== 'option') {
      console.warn('recordOptionsClose called for non-option transaction:', transaction.asset_type);
      return;
    }

    if (!transaction.id) {
      throw new Error('Transaction ID is required to create cash transaction. Transaction must be saved to database first.');
    }

    const transactionCode = transaction.transaction_code?.trim();
    const isBTC = transactionCode === 'BTC' || transactionCode === 'Buy to Close';
    const isSTC = transactionCode === 'STC' || transactionCode === 'Sell to Close';

    const optionDescription = `${transaction.underlying_symbol} ${transaction.expiration_date} ${transaction.strike_price} ${transaction.option_type?.toUpperCase()}`;

    let amount: number;
    let code: string;
    let description: string;
    let tags: string[];

    if (isBTC) {
      // BTC: paying to close a short position = debit
      amount = -(Math.abs(transaction.amount) + transaction.fees);
      code = 'OPTION_BUY_CLOSE';
      description = `Options close (BTC): ${Math.abs(transaction.quantity || 0)} contracts of ${optionDescription} @ $${transaction.price}`;
      tags = ['option', 'close', 'BTC'];
    } else if (isSTC) {
      // STC: selling to close a long position = credit
      const grossProceeds = Math.abs(transaction.amount || 0);
      const fees = transaction.fees || 0;
      amount = grossProceeds - fees;
      code = 'OPTION_SELL_CLOSE';
      description = `Options close (STC): ${Math.abs(transaction.quantity || 0)} contracts of ${optionDescription} @ $${transaction.price}`;
      tags = ['option', 'close', 'STC'];
    } else {
      console.warn('Unknown closing transaction code:', transactionCode);
      return;
    }

    const cashTransaction: CashTransactionInsert = {
      user_id: transaction.user_id,
      transaction_code: code,
      amount: amount,
      description: description,
      notes: `Linked to transaction ${transaction.id}`,
      activity_date: transaction.activity_date,
      process_date: transaction.process_date,
      settle_date: transaction.settle_date,
      symbol: transaction.underlying_symbol || null,
      transaction_id: transaction.id,
      tags: tags,
    };

    console.log('Creating cash transaction for options close:', {
      transactionId: transaction.id,
      code: transactionCode,
      amount,
      cashTransaction,
    });

    // Create cash transaction
    const createdCashTx = await CashTransactionRepository.create(cashTransaction);

    // Update cash balance
    await CashBalanceService.recalculateBalance(transaction.user_id);

    console.log(`Cash transaction created for options close: ${createdCashTx.id}, amount: $${amount.toFixed(2)}`);
  }

  /**
   * Process a single options transaction and create corresponding cash transaction
   */
  static async processOptionsTransaction(
    transaction: Transaction
  ): Promise<void> {
    if (transaction.asset_type !== 'option') {
      console.warn('processOptionsTransaction called for non-option transaction:', transaction.asset_type);
      return;
    }

    const transactionCode = transaction.transaction_code?.trim();
    const isBTO = transactionCode === 'BTO' || transactionCode === 'Buy to Open';
    const isSTO = transactionCode === 'STO' || transactionCode === 'Sell to Open';
    const isBTC = transactionCode === 'BTC' || transactionCode === 'Buy to Close';
    const isSTC = transactionCode === 'STC' || transactionCode === 'Sell to Close';

    console.log('Processing options transaction:', {
      id: transaction.id,
      code: transactionCode,
      isBTO,
      isSTO,
      isBTC,
      isSTC,
      amount: transaction.amount,
      quantity: transaction.quantity,
      price: transaction.price,
    });

    if (isBTO) {
      await this.recordOptionsPurchase(transaction);
    } else if (isSTO) {
      await this.recordOptionsSaleToOpen(transaction);
    } else if (isBTC || isSTC) {
      await this.recordOptionsClose(transaction);
    } else {
      console.warn(
        `Unknown options transaction code: "${transactionCode}". Expected: BTO, STO, BTC, or STC. Transaction ID: ${transaction.id}`
      );
      throw new Error(
        `Cannot process options transaction: unknown transaction code "${transactionCode}". Expected BTO, STO, BTC, or STC.`
      );
    }
  }

  /**
   * Process multiple options transactions (multi-leg strategy)
   * Creates a single cash transaction for the sum of all legs
   */
  static async processMultiLegOptionsTransactions(
    transactions: Transaction[],
    userId: string
  ): Promise<void> {
    if (transactions.length === 0) {
      return;
    }

    // Filter to only options transactions
    const optionsTransactions = transactions.filter(t => t.asset_type === 'option');

    if (optionsTransactions.length === 0) {
      return;
    }

    // Calculate the sum of all leg amounts (premiums + fees)
    let totalAmount = 0;
    let totalFees = 0;
    const underlyingSymbol = optionsTransactions[0].underlying_symbol;
    const activityDate = optionsTransactions[0].activity_date;
    const processDate = optionsTransactions[0].process_date;
    const settleDate = optionsTransactions[0].settle_date;

    for (const transaction of optionsTransactions) {
      totalAmount += transaction.amount || 0;
      totalFees += transaction.fees || 0;
    }

    // Net amount after fees
    const netAmount = totalAmount - totalFees;

    // Determine if this is a net debit or credit spread
    const isDebit = netAmount < 0;
    const code = isDebit ? 'OPTION_MULTILEG_DEBIT' : 'OPTION_MULTILEG_CREDIT';
    const typeDescription = isDebit ? 'Debit' : 'Credit';

    const cashTransaction: CashTransactionInsert = {
      user_id: userId,
      transaction_code: code,
      amount: netAmount,
      description: `Multi-leg options strategy (${typeDescription}): ${optionsTransactions.length} legs on ${underlyingSymbol}`,
      notes: `Linked to ${optionsTransactions.length} option transactions`,
      activity_date: activityDate,
      process_date: processDate,
      settle_date: settleDate,
      symbol: underlyingSymbol || null,
      transaction_id: null, // NULL for multi-leg since one cash transaction links to multiple transactions
      tags: ['option', 'multi-leg', 'strategy'],
    };

    console.log('Creating cash transaction for multi-leg options strategy:', {
      legCount: optionsTransactions.length,
      totalAmount,
      totalFees,
      netAmount,
      isDebit,
      cashTransaction,
    });

    // Create cash transaction
    const createdCashTx = await CashTransactionRepository.create(cashTransaction);

    // Update cash balance
    await CashBalanceService.recalculateBalance(userId);

    console.log(`Cash transaction created for multi-leg options: ${createdCashTx.id}, amount: $${netAmount.toFixed(2)}`);
  }
}
