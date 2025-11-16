import { TransactionRepository } from '../repositories/transaction.repository';
import { PositionMatchingService } from './positionMatchingService';
import { StrategyDetectionService } from './strategyDetectionService';
import { CashBalanceService } from './cashBalanceService';
import { StockCashIntegrationService } from './stockCashIntegrationService';
import { CryptoCashIntegrationService } from './cryptoCashIntegrationService';
import { FuturesCashIntegrationService } from './futuresCashIntegrationService';
import type { TransactionInsert, Transaction } from '@/domain/types';

/**
 * Transaction Service
 * Handles manual transaction creation and processing
 */
export class TransactionService {
  /**
   * Create a manual transaction and process it
   * This will:
   * 1. Create the transaction (without import_id)
   * 2. Match it with existing positions (if applicable)
   * 3. Update cash balance (if cash transaction)
   * 4. Detect strategies (if option transaction)
   */
  static async createManualTransaction(
    transaction: Omit<TransactionInsert, 'import_id'>
  ): Promise<Transaction> {
    // Create transaction without import_id
    const createdTransaction = await TransactionRepository.create({
      ...transaction,
      import_id: null, // Manual transactions don't have import_id
    });

    // Process position matching for non-cash transactions
    if (transaction.asset_type !== 'cash') {
      // Create corresponding cash transaction for stock/crypto trades FIRST
      // This ensures cash is updated even if position matching fails
      if (transaction.asset_type === 'stock') {
        try {
          await StockCashIntegrationService.processStockTransaction(createdTransaction);
        } catch (error) {
          console.error('Error creating cash transaction for stock trade:', error);
          // Re-throw to ensure user knows about the issue
          throw new Error(`Failed to create cash transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      } else if (transaction.asset_type === 'crypto') {
        try {
          await CryptoCashIntegrationService.processCryptoTransaction(createdTransaction);
        } catch (error) {
          console.error('Error creating cash transaction for crypto trade:', error);
          // Re-throw to ensure user knows about the issue
          throw new Error(`Failed to create cash transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      } else if (transaction.asset_type === 'futures') {
        try {
          // For futures, we need to determine if this is opening or closing
          // For now, assume opening - the form should handle closing separately with entry data
          await FuturesCashIntegrationService.processFuturesTransaction(createdTransaction);
        } catch (error) {
          console.error('Error creating cash transaction for futures trade:', error);
          // Re-throw to ensure user knows about the issue
          throw new Error(`Failed to create cash transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Then process position matching
      try {
        await PositionMatchingService.matchTransactions(
          transaction.user_id,
          undefined // No import_id for manual transactions
        );

        // Process assignments and exercises
        await PositionMatchingService.processAssignmentsAndExercises(transaction.user_id);

        // Process expirations
        await PositionMatchingService.processExpirations(transaction.user_id);

        // Detect strategies for options
        if (transaction.asset_type === 'option') {
          await StrategyDetectionService.detectStrategies(transaction.user_id);
        }
      } catch (error) {
        console.error('Error processing position matching:', error);
        // Don't fail the transaction creation if matching fails, but cash transaction is already created
      }
    } else {
      // Update cash balance for cash transactions
      try {
        await CashBalanceService.updateBalanceFromTransaction(
          transaction.user_id,
          createdTransaction
        );
      } catch (error) {
        console.error('Error updating cash balance:', error);
        // Don't fail the transaction creation if balance update fails
      }
    }

    return createdTransaction;
  }

  /**
   * Create multiple manual transactions in batch
   * Optimized for multi-leg options strategies
   * @param transactions - Array of transactions to create
   * @param strategyId - Optional strategy ID to link all transactions to
   */
  static async createManualTransactions(
    transactions: Array<Omit<TransactionInsert, 'import_id'>>,
    strategyId?: string
  ): Promise<Transaction[]> {
    if (transactions.length === 0) {
      return [];
    }

    const userId = transactions[0].user_id;
    const assetType = transactions[0].asset_type;

    // Create all transactions in a single batch insert for better performance
    const createdTransactions: Transaction[] = [];
    
    try {
      // Import TransactionRepository
      const { TransactionRepository } = await import('../repositories/transaction.repository');
      
      // Create all transactions at once
      const transactionsToInsert = transactions.map(tx => ({
        ...tx,
        import_id: null,
        strategy_id: strategyId || null, // Link to strategy if provided
      }));

      const batchCreated = await TransactionRepository.createMany(transactionsToInsert);
      createdTransactions.push(...batchCreated);
    } catch (error) {
      console.error('Error creating batch transactions:', error);
      // Fallback to individual creation if batch fails
      for (const transaction of transactions) {
        try {
          const created = await this.createManualTransaction(transaction);
          createdTransactions.push(created);
        } catch (err) {
          console.error('Error creating individual transaction:', err);
        }
      }
    }

    // Process cash transactions for non-cash asset types
    if (assetType !== 'cash') {
      try {
        // Create corresponding cash transactions
        if (assetType === 'stock') {
          for (const stockTx of createdTransactions.filter(t => t.asset_type === 'stock')) {
            await StockCashIntegrationService.processStockTransaction(stockTx);
          }
        } else if (assetType === 'crypto') {
          for (const cryptoTx of createdTransactions.filter(t => t.asset_type === 'crypto')) {
            await CryptoCashIntegrationService.processCryptoTransaction(cryptoTx);
          }
        } else if (assetType === 'futures') {
          for (const futuresTx of createdTransactions.filter(t => t.asset_type === 'futures')) {
            await FuturesCashIntegrationService.processFuturesTransaction(futuresTx);
          }
        }
      } catch (error) {
        console.error('Error creating cash transactions:', error);
      }
    } else {
      // Update cash balance for cash transactions
      try {
        for (const cashTx of createdTransactions) {
          await CashBalanceService.updateBalanceFromTransaction(userId, cashTx);
        }
      } catch (error) {
        console.error('Error updating cash balance:', error);
      }
    }

    // Process position matching and strategy detection
    if (assetType !== 'cash') {
      try {
        // Run position matching once for all transactions
        await PositionMatchingService.matchTransactions(userId, undefined);
        await PositionMatchingService.processAssignmentsAndExercises(userId);
        await PositionMatchingService.processExpirations(userId);

        // Detect strategies for options (will link to existing strategy if strategyId provided)
        if (assetType === 'option') {
          await StrategyDetectionService.detectStrategies(userId);
        }
      } catch (error) {
        console.error('Error processing batch position matching:', error);
      }
    }

    return createdTransactions;
  }
}

