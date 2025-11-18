import { TransactionRepository, PositionRepository } from '../repositories';
import { FuturesContractSpecRepository } from '../repositories/futuresContractSpec.repository';
import { logger } from '@/shared/utils/logger';
import type { Transaction, PositionInsert, Position } from '@/domain/types';
import { parseContractSymbol, FUTURES_MONTH_CODES } from '@/domain/types/futures.types';

/**
 * Position Matching Service
 * Matches opening and closing transactions using FIFO to create position records
 */
export class PositionMatchingService {
  /**
   * Process transactions for a user and create position records
   * Runs after import to match opening/closing transactions
   */
  static async matchTransactions(userId: string, importId?: string): Promise<{
    positionsCreated: number;
    positionsUpdated: number;
    unmatchedTransactions: number;
  }> {
    logger.debug('Starting position matching', { userId, importId });

    // Get all transactions that need matching (either from import or all unmatched)
    const transactions = importId
      ? await TransactionRepository.getByImportId(importId)
      : await TransactionRepository.getAll(userId);

    logger.debug('Transactions to process', { count: transactions.length, userId });

    let positionsCreated = 0;
    let positionsUpdated = 0;

    // Process OPTIONS: BTO/STO/BTC/STC
    const openingOptionTxs = transactions.filter(
      (t) => t.is_opening === true && !t.position_id && t.asset_type === 'option'
    );
    const closingOptionTxs = transactions.filter(
      (t) => t.is_opening === false && !t.position_id && t.asset_type === 'option'
    );

    logger.debug('Processing options transactions', { 
      opening: openingOptionTxs.length, 
      closing: closingOptionTxs.length 
    });

    for (const openingTx of openingOptionTxs) {
      try {
        await this.createPositionFromOpening(openingTx);
        positionsCreated++;
      } catch (error) {
        logger.error('Error creating option position', error, { transactionId: openingTx.id });
      }
    }

    for (const closingTx of closingOptionTxs) {
      try {
        const matched = await this.matchClosingTransaction(closingTx);
        if (matched) positionsUpdated++;
      } catch (error) {
        logger.error('Error matching option close', error, { transactionId: closingTx.id });
      }
    }

    // Process STOCKS: Buy/Sell
    const stockBuys = transactions.filter(
      (t) => t.transaction_code === 'Buy' && !t.position_id && t.asset_type === 'stock'
    );
    const stockSells = transactions.filter(
      (t) => t.transaction_code === 'Sell' && !t.position_id && t.asset_type === 'stock'
    );

    logger.debug('Processing stock transactions', { buys: stockBuys.length, sells: stockSells.length });

    for (const buyTx of stockBuys) {
      try {
        await this.createStockPosition(buyTx);
        positionsCreated++;
      } catch (error) {
        logger.error('Error creating stock position', error, { transactionId: buyTx.id });
      }
    }

    for (const sellTx of stockSells) {
      try {
        const matched = await this.matchStockSell(sellTx);
        if (matched) positionsUpdated++;
      } catch (error) {
        logger.error('Error matching stock sell', error, { transactionId: sellTx.id });
      }
    }

    // Process CRYPTO: Buy/Sell
    const cryptoBuys = transactions.filter(
      (t) => t.transaction_code === 'Buy' && !t.position_id && t.asset_type === 'crypto'
    );
    const cryptoSells = transactions.filter(
      (t) => t.transaction_code === 'Sell' && !t.position_id && t.asset_type === 'crypto'
    );

    logger.debug('Processing crypto transactions', { buys: cryptoBuys.length, sells: cryptoSells.length });

    for (const buyTx of cryptoBuys) {
      try {
        await this.createCryptoPosition(buyTx);
        positionsCreated++;
      } catch (error) {
        logger.error('Error creating crypto position', error, { transactionId: buyTx.id });
      }
    }

    for (const sellTx of cryptoSells) {
      try {
        const matched = await this.matchCryptoFuturesSell(sellTx, 'crypto');
        if (matched) positionsUpdated++;
      } catch (error) {
        logger.error('Error matching crypto sell', error, { transactionId: sellTx.id });
      }
    }

    // Process FUTURES: Buy/Sell
    const futuresBuys = transactions.filter(
      (t) => t.transaction_code === 'Buy' && !t.position_id && t.asset_type === 'futures'
    );
    const futuresSells = transactions.filter(
      (t) => t.transaction_code === 'Sell' && !t.position_id && t.asset_type === 'futures'
    );

    logger.debug('Processing futures transactions', { buys: futuresBuys.length, sells: futuresSells.length });

    for (const buyTx of futuresBuys) {
      try {
        await this.createFuturesPosition(buyTx);
        positionsCreated++;
      } catch (error) {
        logger.error('Error creating futures position', error, { transactionId: buyTx.id });
      }
    }

    for (const sellTx of futuresSells) {
      try {
        const matched = await this.matchCryptoFuturesSell(sellTx, 'futures');
        if (matched) positionsUpdated++;
      } catch (error) {
        logger.error('Error matching futures sell', error, { transactionId: sellTx.id });
      }
    }

    const unmatchedTransactions = transactions.filter((t) => !t.position_id).length;

    logger.info('Position matching complete', {
      positionsCreated,
      positionsUpdated,
      unmatchedTransactions,
      userId,
    });

    return {
      positionsCreated,
      positionsUpdated,
      unmatchedTransactions,
    };
  }

  /**
   * Create a new position from an opening transaction
   */
  private static async createPositionFromOpening(tx: Transaction): Promise<Position> {
    // Extract entry time from notes if available
    // Format: "ENTRY_TIME:HH:MM"
    let openedAtTimestamp = new Date(tx.activity_date).toISOString();
    if (tx.notes) {
      const entryTimeMatch = tx.notes.match(/ENTRY_TIME:(\d{2}):(\d{2})/);
      if (entryTimeMatch) {
        const [, hours, minutes] = entryTimeMatch;
        const dateTime = new Date(tx.activity_date);
        dateTime.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
        openedAtTimestamp = dateTime.toISOString();
      }
    }
    
    const positionInsert: PositionInsert = {
      user_id: tx.user_id,
      strategy_id: null, // Will be set by strategy detection
      symbol: tx.underlying_symbol || tx.instrument || '',
      asset_type: tx.asset_type === 'option' || tx.asset_type === 'stock' || tx.asset_type === 'crypto' || tx.asset_type === 'futures' 
        ? tx.asset_type 
        : 'stock',
      option_type: tx.option_type || null,
      strike_price: tx.strike_price || null,
      expiration_date: tx.expiration_date || null,
      contract_month: null, // Will be parsed from description if futures
      multiplier: null, // Will be set based on asset type
      tick_size: null,
      tick_value: null,
      margin_requirement: null,
      side: tx.is_long ? 'long' : 'short',
      opening_quantity: Math.abs(tx.quantity || 0),
      current_quantity: Math.abs(tx.quantity || 0),
      average_opening_price: Math.abs(tx.price || 0),
      total_cost_basis: tx.amount, // Positive for credit received, negative for debit paid
      total_closing_amount: 0,
      realized_pl: 0,
      unrealized_pl: 0,
      status: 'open',
      opening_transaction_ids: [tx.id],
      closing_transaction_ids: [],
      opened_at: openedAtTimestamp,
      closed_at: null,
      notes: null,
      tags: [],
    };

    const position = await PositionRepository.create(positionInsert);

    // Link transaction to position
    await TransactionRepository.update(tx.id, { position_id: position.id });

    return position;
  }

  /**
   * Match a closing transaction with an existing open position (FIFO)
   */
  private static async matchClosingTransaction(tx: Transaction): Promise<boolean> {
    // Determine position side based on transaction code
    // For options: STC/BTC close positions, BTO opens long, STO opens short
    // STC (Sell to Close) closes a LONG position (opened with BTO)
    // BTC (Buy to Close) closes a SHORT position (opened with STO)
    let positionSide: 'long' | 'short';
    if (tx.asset_type === 'option') {
      const txCode = tx.transaction_code?.trim().toUpperCase();
      if (txCode === 'STC' || txCode === 'SELL TO CLOSE') {
        positionSide = 'long'; // STC closes a long position
      } else if (txCode === 'BTC' || txCode === 'BUY TO CLOSE') {
        positionSide = 'short'; // BTC closes a short position
      } else {
        // Fallback to is_long for other cases
        positionSide = tx.is_long ? 'long' : 'short';
      }
    } else {
      // For non-options, use is_long directly
      positionSide = tx.is_long ? 'long' : 'short';
    }

    // Find matching open position(s) using FIFO
    const openPositions = await PositionRepository.findOpenPosition(
      tx.user_id,
      tx.underlying_symbol || tx.instrument || '',
      tx.option_type,
      tx.strike_price,
      tx.expiration_date,
      positionSide,
      tx.asset_type === 'option' ? 'option' : undefined,
      null // contract_month for options
    );

    if (openPositions.length === 0) {
      logger.warn('No matching open position found for closing transaction', { transactionId: tx.id });
      return false;
    }

    // Use FIFO - take first (oldest) position
    const position = openPositions[0];
    const closingQuantity = Math.abs(tx.quantity || 0);

    // Calculate P/L for this close
    let realizedPL = 0;
    if (tx.is_long) {
      // Long position: P/L = (selling price - buying price) * quantity
      realizedPL = (Math.abs(tx.price || 0) - position.average_opening_price) * closingQuantity;
    } else {
      // Short position: P/L = (selling price - buying price) * quantity
      // For short, we sold first (received credit), bought back to close (paid debit)
      realizedPL = (position.average_opening_price - Math.abs(tx.price || 0)) * closingQuantity;
    }

    // Account for the fact that amount is already signed (negative for debit, positive for credit)
    // Total P/L = opening amount + closing amount
    const totalPL = position.total_cost_basis + tx.amount;

    // Close the position (partial or full)
    await PositionRepository.closePosition(
      position.id,
      closingQuantity,
      tx.id,
      tx.amount,
      totalPL // Use the actual total P/L from amounts
    );

    // Link transaction to position
    await TransactionRepository.update(tx.id, { position_id: position.id });

    return true;
  }

  /**
   * Create a crypto position from a Buy transaction
   */
  private static async createCryptoPosition(tx: Transaction): Promise<Position> {
    const positionInsert: PositionInsert = {
      user_id: tx.user_id,
      strategy_id: null,
      symbol: tx.underlying_symbol || tx.instrument || '',
      asset_type: 'crypto',
      option_type: null,
      strike_price: null,
      expiration_date: null,
      contract_month: null,
      multiplier: null,
      tick_size: null,
      tick_value: null,
      margin_requirement: null,
      side: 'long', // Crypto purchases are always long
      opening_quantity: Math.abs(tx.quantity || 0),
      current_quantity: Math.abs(tx.quantity || 0),
      average_opening_price: Math.abs(tx.price || 0),
      total_cost_basis: Math.abs(tx.amount), // Cost to buy the crypto
      total_closing_amount: 0,
      realized_pl: 0,
      unrealized_pl: 0,
      status: 'open',
      opening_transaction_ids: [tx.id],
      closing_transaction_ids: [],
      opened_at: new Date(tx.activity_date).toISOString(),
      closed_at: null,
      notes: null,
      tags: [],
    };

    const position = await PositionRepository.create(positionInsert);
    await TransactionRepository.update(tx.id, { position_id: position.id });

    return position;
  }

  /**
   * Create a futures position from a Buy transaction
   */
  private static async createFuturesPosition(tx: Transaction): Promise<Position> {
    // Parse contract month from instrument field (e.g., "ESH25" -> "H25" or "MAR25")
    let contractMonth: string | null = null;
    let baseSymbol = tx.underlying_symbol || '';
    
    // Try to parse from instrument field first (e.g., "ESH25")
    if (tx.instrument) {
      const parsed = parseContractSymbol(tx.instrument);
      if (parsed) {
        baseSymbol = parsed.symbol;
        // Format contract month as "MAR25" (month name + year)
        const monthName = FUTURES_MONTH_CODES[parsed.monthCode];
        const year = parsed.year.length === 2 ? `20${parsed.year}` : parsed.year;
        contractMonth = monthName ? `${monthName.toUpperCase().slice(0, 3)}${year.slice(-2)}` : `${parsed.monthCode}${parsed.year}`;
      }
    }
    
    // Fallback: try to parse from description if instrument parsing failed
    if (!contractMonth && tx.description) {
      const monthMatch = tx.description.match(/\b([A-Z]{3}\d{2,4})\b/);
      if (monthMatch) {
        contractMonth = monthMatch[1];
      }
    }

    // Look up contract spec to get multiplier, tick_size, tick_value, initial_margin
    let multiplier: number | null = null;
    let tickSize: number | null = null;
    let tickValue: number | null = null;
    let marginRequirement: number | null = null;
    
    if (baseSymbol) {
      try {
        const contractSpec = await FuturesContractSpecRepository.getBySymbol(baseSymbol);
        if (contractSpec) {
          multiplier = contractSpec.multiplier;
          tickSize = contractSpec.tick_size;
          tickValue = contractSpec.tick_value;
          marginRequirement = contractSpec.initial_margin;
        }
      } catch (error) {
        logger.warn('Failed to fetch contract spec', error, { baseSymbol });
        // Continue with null values - defaults will be used in transformer
      }
    }

    const positionInsert: PositionInsert = {
      user_id: tx.user_id,
      strategy_id: null,
      symbol: baseSymbol || tx.instrument || '',
      asset_type: 'futures',
      option_type: null,
      strike_price: null,
      expiration_date: tx.expiration_date || null,
      contract_month: contractMonth,
      multiplier,
      tick_size: tickSize,
      tick_value: tickValue,
      margin_requirement: marginRequirement,
      side: tx.is_long !== null ? (tx.is_long ? 'long' : 'short') : 'long',
      opening_quantity: Math.abs(tx.quantity || 0),
      current_quantity: Math.abs(tx.quantity || 0),
      average_opening_price: Math.abs(tx.price || 0),
      total_cost_basis: tx.amount,
      total_closing_amount: 0,
      realized_pl: 0,
      unrealized_pl: 0,
      status: 'open',
      opening_transaction_ids: [tx.id],
      closing_transaction_ids: [],
      opened_at: new Date(tx.activity_date).toISOString(),
      closed_at: null,
      notes: null,
      tags: [],
    };

    const position = await PositionRepository.create(positionInsert);
    await TransactionRepository.update(tx.id, { position_id: position.id });

    return position;
  }

  /**
   * Match a crypto or futures Sell transaction with an existing position (FIFO)
   */
  private static async matchCryptoFuturesSell(
    tx: Transaction,
    assetType: 'crypto' | 'futures'
  ): Promise<boolean> {
    // Parse contract month for futures and extract base symbol
    let contractMonth: string | null = null;
    let baseSymbol = tx.underlying_symbol || '';
    
    if (assetType === 'futures') {
      // Try to parse from instrument field first (e.g., "ESH25")
      if (tx.instrument) {
        const parsed = parseContractSymbol(tx.instrument);
        if (parsed) {
          baseSymbol = parsed.symbol;
          // Format contract month as "MAR25" (month name + year)
          const monthName = FUTURES_MONTH_CODES[parsed.monthCode];
          const year = parsed.year.length === 2 ? `20${parsed.year}` : parsed.year;
          contractMonth = monthName ? `${monthName.toUpperCase().slice(0, 3)}${year.slice(-2)}` : `${parsed.monthCode}${parsed.year}`;
        }
      }
      
      // Fallback: try to parse from description if instrument parsing failed
      if (!contractMonth && tx.description) {
        const monthMatch = tx.description.match(/\b([A-Z]{3}\d{2,4})\b/);
        if (monthMatch) {
          contractMonth = monthMatch[1];
        }
      }
    }

    // Find matching long positions using FIFO
    const openPositions = await PositionRepository.findOpenPosition(
      tx.user_id,
      baseSymbol || tx.instrument || '',
      null, // No option type
      null, // No strike
      tx.expiration_date || null,
      'long', // Sells match long positions
      assetType,
      contractMonth
    );

    if (openPositions.length === 0) {
      logger.warn('No matching position found for sell transaction', { transactionId: tx.id, assetType });
      return false;
    }

    // Use FIFO - take first (oldest) position
    const position = openPositions[0];
    const sellingQuantity = Math.abs(tx.quantity || 0);

    // Calculate P/L for futures: (selling price - buying price) * quantity * multiplier
    const multiplier = position.multiplier || 1;
    const sellingPrice = tx.price || 0;
    const buyingPrice = position.average_opening_price || 0;
    const priceDiff = sellingPrice - buyingPrice;
    const totalPL = priceDiff * sellingQuantity * multiplier;

    // Close the position (partial or full)
    await PositionRepository.closePosition(
      position.id,
      sellingQuantity,
      tx.id,
      tx.amount,
      totalPL
    );

    // Link transaction to position
    await TransactionRepository.update(tx.id, { position_id: position.id });

    return true;
  }

  /**
   * Create a stock position from a Buy transaction
   * OR add to existing position if one already exists (for averaging)
   */
  private static async createStockPosition(tx: Transaction): Promise<Position> {
    const symbol = tx.underlying_symbol || tx.instrument || '';
    const buyQuantity = Math.abs(tx.quantity || 0);
    const buyPrice = Math.abs(tx.price || 0);
    const buyCost = Math.abs(tx.amount); // Total cost including fees

    // Check if there's an existing open position for this stock
    const existingPositions = await PositionRepository.findOpenPosition(
      tx.user_id,
      symbol,
      null, // No option type for stocks
      null, // No strike for stocks
      null, // No expiration for stocks
      'long', // Stock purchases are always long
      'stock' // Asset type
    );

    // If position exists, add to it (averaging)
    if (existingPositions.length > 0) {
      const position = existingPositions[0];

      // Calculate new average price
      // Formula: ((old_qty * old_avg_price) + (new_qty * new_price)) / (old_qty + new_qty)
      const oldTotalCost = position.opening_quantity * position.average_opening_price;
      const newTotalCost = oldTotalCost + (buyQuantity * buyPrice);
      const newTotalQuantity = position.opening_quantity + buyQuantity;
      const newAveragePrice = newTotalCost / newTotalQuantity;

      // Update the position
      const updatedPosition = await PositionRepository.update(position.id, {
        opening_quantity: newTotalQuantity,
        current_quantity: position.current_quantity + buyQuantity,
        average_opening_price: newAveragePrice,
        total_cost_basis: position.total_cost_basis + buyCost,
        opening_transaction_ids: [
          ...(position.opening_transaction_ids || []),
          tx.id,
        ],
      });

      // Link transaction to position
      await TransactionRepository.update(tx.id, { position_id: position.id });

      logger.debug('Added to existing position', { symbol, avgPrice: newAveragePrice, quantity: newTotalQuantity });
      return updatedPosition;
    }

    // No existing position, create new one
    const positionInsert: PositionInsert = {
      user_id: tx.user_id,
      strategy_id: null,
      symbol,
      asset_type: 'stock',
      option_type: null,
      strike_price: null,
      expiration_date: null,
      contract_month: null,
      multiplier: null,
      tick_size: null,
      tick_value: null,
      margin_requirement: null,
      side: 'long', // Stock purchases are always long
      opening_quantity: buyQuantity,
      current_quantity: buyQuantity,
      average_opening_price: buyPrice,
      total_cost_basis: buyCost, // Cost to buy the stock
      total_closing_amount: 0,
      realized_pl: 0,
      unrealized_pl: 0,
      status: 'open',
      opening_transaction_ids: [tx.id],
      closing_transaction_ids: [],
      opened_at: new Date(tx.activity_date).toISOString(),
      closed_at: null,
      notes: null,
      tags: [],
    };

    const position = await PositionRepository.create(positionInsert);
    await TransactionRepository.update(tx.id, { position_id: position.id });

    logger.debug('Created new stock position', { symbol, price: buyPrice, quantity: buyQuantity });
    return position;
  }

  /**
   * Match a stock Sell transaction with an existing long stock position (FIFO)
   */
  private static async matchStockSell(tx: Transaction): Promise<boolean> {
    const symbol = tx.underlying_symbol || tx.instrument || '';
    const sellingQuantity = Math.abs(tx.quantity || 0);

    // Find matching long stock positions using FIFO
    const openPositions = await PositionRepository.findOpenPosition(
      tx.user_id,
      symbol,
      null, // No option type for stocks
      null, // No strike for stocks
      null, // No expiration for stocks
      'long', // Stock sells match long positions
      'stock' // Asset type
    );

    if (openPositions.length === 0) {
      logger.warn('No open position found for sell', { symbol, sellingQuantity });
      throw new Error(`No position found for ${symbol}. You must own shares before selling.`);
    }

    // Calculate total available quantity across all open positions
    const totalAvailableQuantity = openPositions.reduce(
      (sum, pos) => sum + pos.current_quantity,
      0
    );

    // Validate: prevent overselling
    if (sellingQuantity > totalAvailableQuantity) {
      logger.warn('Attempting to oversell shares', { symbol, sellingQuantity, totalAvailableQuantity });
      throw new Error(
        `Cannot sell ${sellingQuantity} shares of ${symbol}. You only own ${totalAvailableQuantity} shares.`
      );
    }

    // Use FIFO - take first (oldest) position
    const position = openPositions[0];
    const sellingPrice = Math.abs(tx.price || 0);

    // Calculate P/L: (selling price - average cost) * quantity
    const costBasis = position.average_opening_price * sellingQuantity;
    const proceeds = sellingPrice * sellingQuantity;
    const totalPL = proceeds - costBasis;

    // Close the position (partial or full)
    await PositionRepository.closePosition(
      position.id,
      sellingQuantity,
      tx.id,
      tx.amount,
      totalPL
    );

    // Link transaction to position
    await TransactionRepository.update(tx.id, { position_id: position.id });

    logger.debug('Sold shares', { symbol, quantity: sellingQuantity, price: sellingPrice, pnl: totalPL });

    return true;
  }

  /**
   * Process option assignments and exercises
   */
  static async processAssignmentsAndExercises(userId: string): Promise<void> {
    // Get transactions marked as assignments or exercises
    const transactions = await TransactionRepository.getAll(userId);

    const assignmentTxs = transactions.filter(
      (t) => t.transaction_code === 'OASGN' && !t.position_id
    );
    const exerciseTxs = transactions.filter(
      (t) => t.transaction_code === 'OEXCS' && !t.position_id
    );

    // Process assignments - find the short option position and mark as assigned
    for (const tx of assignmentTxs) {
      const positions = await PositionRepository.findOpenPosition(
        tx.user_id,
        tx.underlying_symbol || tx.instrument || '',
        tx.option_type,
        tx.strike_price,
        tx.expiration_date,
        'short', // Assignments happen on short positions
        'option' // Asset type
      );

      if (positions.length > 0) {
        await PositionRepository.updateStatus(positions[0].id, 'assigned');
        await TransactionRepository.update(tx.id, { position_id: positions[0].id });
      }
    }

    // Process exercises - find the long option position and mark as exercised
    for (const tx of exerciseTxs) {
      const positions = await PositionRepository.findOpenPosition(
        tx.user_id,
        tx.underlying_symbol || tx.instrument || '',
        tx.option_type,
        tx.strike_price,
        tx.expiration_date,
        'long', // Exercises happen on long positions
        'option' // Asset type
      );

      if (positions.length > 0) {
        await PositionRepository.updateStatus(positions[0].id, 'exercised');
        await TransactionRepository.update(tx.id, { position_id: positions[0].id });
      }
    }
  }

  /**
   * Process option expirations
   */
  static async processExpirations(userId: string): Promise<void> {
    // Find positions with expiration dates in the past that are still marked as open
    const today = new Date().toISOString().split('T')[0];
    const allPositions = await PositionRepository.getAll(userId, {
      status: 'open',
      asset_type: 'option',
    });

    const expiredPositions = allPositions.filter(
      (p) => p.expiration_date && p.expiration_date < today
    );

    for (const position of expiredPositions) {
      await PositionRepository.updateStatus(position.id, 'expired');
    }

    logger.info('Marked positions as expired', { count: expiredPositions.length, userId });
  }
}
