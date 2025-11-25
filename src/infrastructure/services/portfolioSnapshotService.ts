import { PortfolioSnapshotRepository, type CreatePortfolioSnapshotDto } from '@/infrastructure/repositories/portfolioSnapshot.repository';
import { PositionRepository } from '@/infrastructure/repositories/position.repository';
import { CashTransactionRepository } from '@/infrastructure/repositories/cashTransaction.repository';
import { getStockQuotes, type StockQuote } from '@/infrastructure/services/marketDataService';
import { getCryptoQuotes, type CryptoQuote } from '@/infrastructure/services/cryptoMarketDataService';
import { getOptionQuotes, getOptionsChain } from '@/infrastructure/services/optionsMarketDataService';
import { buildTradierOptionSymbol } from '@/shared/utils/positionTransformers';
import type { Position, OptionQuote, OptionsChain } from '@/domain/types';

/**
 * Service for generating and managing portfolio snapshots
 */
export class PortfolioSnapshotService {
  /**
   * Generate a portfolio snapshot for a user
   * @param userId - User ID
   * @param snapshotDate - Optional date (defaults to today)
   * @param skipExistingCheck - Internal flag to skip existing check (used by updateSnapshot)
   */
  static async generateSnapshot(userId: string, snapshotDate?: string, skipExistingCheck: boolean = false): Promise<void> {
    const date = snapshotDate || new Date().toISOString().split('T')[0];
    console.log(`[PortfolioSnapshotService] Generating snapshot for user ${userId} on date ${date}`);

    try {
      // Check if snapshot already exists for this date (unless we're updating)
      if (!skipExistingCheck) {
        const existing = await PortfolioSnapshotRepository.getByDate(userId, date);
        if (existing) {
          console.log(`[PortfolioSnapshotService] Snapshot exists for ${date}, updating...`);
          // Update existing snapshot
          await this.updateSnapshot(userId, date);
          return;
        }
      }

      // Get all positions
      const allPositions = await PositionRepository.getAll(userId);
      const openPositions = allPositions.filter((p) => p.status === 'open');
      const finalizedStatuses = ['closed', 'expired', 'assigned', 'exercised'];
      const closedPositions = allPositions.filter((p) => finalizedStatuses.includes(p.status));
      console.log(`[PortfolioSnapshotService] Found ${allPositions.length} total positions (${openPositions.length} open, ${closedPositions.length} closed/expired)`);

      // Calculate net cash flow from cash transactions
      const cashTransactions = await CashTransactionRepository.getByUserId(userId);
      const excludedCodes = ['FUTURES_MARGIN', 'FUTURES_MARGIN_RELEASE'];
      const netCashFlow = cashTransactions
        .filter((tx) => !excludedCodes.includes(tx.transaction_code || ''))
        .reduce((sum, tx) => sum + (tx.amount || 0), 0);

      // Calculate total market value and unrealized P&L from open positions
      // Fetch current quotes to calculate accurate unrealized P&L
      let totalMarketValue = 0;
      let totalUnrealizedPL = 0;
      const positionsBreakdown = {
        stocks: { count: 0, value: 0 },
        options: { count: 0, value: 0 },
        crypto: { count: 0, value: 0 },
        futures: { count: 0, value: 0 },
      };

      // Collect symbols for quote fetching
      const stockSymbols = openPositions
        .filter(p => p.asset_type === 'stock' && p.symbol)
        .map(p => p.symbol!);
      
      // Map crypto symbols to coin IDs (common mappings)
      const cryptoIdMap: Record<string, string> = {
      'BTC': 'bitcoin',
      'ETH': 'ethereum',
      'USDT': 'tether',
      'BNB': 'binancecoin',
      'SOL': 'solana',
      'XRP': 'ripple',
      'ADA': 'cardano',
      'DOGE': 'dogecoin',
      'DOT': 'polkadot',
        'MATIC': 'matic-network',
      };
      
      const cryptoCoinIds = openPositions
        .filter(p => p.asset_type === 'crypto' && p.symbol && cryptoIdMap[p.symbol.toUpperCase()])
        .map(p => cryptoIdMap[p.symbol!.toUpperCase()]);
      
      const optionSymbols = Array.from(
      new Set(
        openPositions
          .filter(
            (p) =>
              p.asset_type === 'option' &&
              p.symbol &&
              p.expiration_date &&
              p.strike_price &&
              p.option_type
          )
          .map((p) => {
            try {
              return buildTradierOptionSymbol(
                p.symbol!,
                p.expiration_date!,
                p.option_type as 'call' | 'put',
                p.strike_price!
              );
            } catch {
              return null;
            }
          })
            .filter((symbol): symbol is string => Boolean(symbol))
          )
        );

      // Get unique underlying symbols for options chain fallback
      const optionUnderlyingSymbols = Array.from(
        new Set(
          openPositions
            .filter((p) => p.asset_type === 'option' && p.symbol)
            .map((p) => p.symbol!)
        )
      ).slice(0, 5); // Limit to 5 to avoid too many API calls

      // Fetch quotes and options chains in parallel
      // Use Promise.allSettled for chains to avoid failing if one chain fetch fails
      const stockQuotesPromise: Promise<Record<string, StockQuote>> =
        stockSymbols.length > 0
          ? getStockQuotes(stockSymbols).catch(() => ({} as Record<string, StockQuote>))
          : Promise.resolve<Record<string, StockQuote>>({});

      const cryptoQuotesPromise: Promise<Record<string, CryptoQuote>> =
        cryptoCoinIds.length > 0
          ? getCryptoQuotes(cryptoCoinIds).catch(() => ({} as Record<string, CryptoQuote>))
          : Promise.resolve<Record<string, CryptoQuote>>({});

      const optionQuotesPromise: Promise<Record<string, OptionQuote>> =
        optionSymbols.length > 0
          ? getOptionQuotes(optionSymbols).catch(() => ({} as Record<string, OptionQuote>))
          : Promise.resolve<Record<string, OptionQuote>>({});

      const optionsChainPromises = optionUnderlyingSymbols.map((symbol) =>
        getOptionsChain(symbol).catch((error) => {
          console.error(`[PortfolioSnapshotService] Error fetching options chain for ${symbol}:`, error);
          return null;
        })
      );

      const [stockQuotes, cryptoQuotesData, optionQuotes, ...chainResults] = await Promise.all([
        stockQuotesPromise,
        cryptoQuotesPromise,
        optionQuotesPromise,
        ...optionsChainPromises,
      ]);

      // Build chainsByUnderlying map for fallback
      const chainsByUnderlying: Record<string, OptionsChain> = {};
      optionUnderlyingSymbols.forEach((symbol, index) => {
        const chainData = chainResults[index];
        if (chainData) {
          chainsByUnderlying[symbol] = chainData;
        }
      });
      
      // Create a symbol-to-quote mapping for crypto
      const cryptoQuotes: Record<string, CryptoQuote> = {};
      Object.values(cryptoQuotesData).forEach((quote) => {
        if (quote.symbol) {
          cryptoQuotes[quote.symbol.toUpperCase()] = quote;
        }
      });

      openPositions.forEach((position: Position) => {
      const assetType = position.asset_type || 'unknown';
      const costBasis = Math.abs(position.total_cost_basis || 0);
      
      // Update count
      if (assetType === 'stock') positionsBreakdown.stocks.count++;
      else if (assetType === 'option') positionsBreakdown.options.count++;
      else if (assetType === 'crypto') positionsBreakdown.crypto.count++;
      else if (assetType === 'futures') positionsBreakdown.futures.count++;

      let marketValue = 0;
      let unrealizedPL = 0;

      // Calculate market value and unrealized P&L based on asset type
      if (assetType === 'stock' && position.symbol) {
        const quote = stockQuotes[position.symbol];
        if (quote && position.current_quantity && quote.price > 0) {
          marketValue = quote.price * position.current_quantity;
          unrealizedPL = marketValue - costBasis;
        } else {
          // Fallback to stored unrealized_pl or calculate from average price
          const storedUnrealizedPL = position.unrealized_pl || 0;
          marketValue = costBasis + storedUnrealizedPL;
          unrealizedPL = storedUnrealizedPL;
        }
        positionsBreakdown.stocks.value += marketValue;
      } else if (assetType === 'crypto' && position.symbol) {
        const quote = cryptoQuotes[position.symbol.toUpperCase()];
        if (quote && position.current_quantity && quote.current_price > 0) {
          marketValue = quote.current_price * position.current_quantity;
          unrealizedPL = marketValue - costBasis;
        } else {
          // Fallback to stored unrealized_pl
          const storedUnrealizedPL = position.unrealized_pl || 0;
          marketValue = costBasis + storedUnrealizedPL;
          unrealizedPL = storedUnrealizedPL;
        }
        positionsBreakdown.crypto.value += marketValue;
      } else if (assetType === 'option' && position.symbol && position.expiration_date && position.strike_price && position.option_type) {
        let quote: OptionQuote | null = null;
        let tradierSymbol: string | null = null;

        try {
          tradierSymbol = buildTradierOptionSymbol(
            position.symbol,
            position.expiration_date,
            position.option_type as 'call' | 'put',
            position.strike_price
          );
          quote = optionQuotes[tradierSymbol] || null;
        } catch (e) {
          console.error('Error building Tradier option symbol:', e, position);
        }

        // Fallback to options chain if direct quote is not available
        if (!quote) {
          const chainData = chainsByUnderlying[position.symbol];
          if (chainData && position.expiration_date) {
            const expirationChain = chainData.chain?.[position.expiration_date];
            if (expirationChain) {
              const chainEntry = expirationChain.find(
                (entry) =>
                  entry.strike === position.strike_price &&
                  entry.option_type === position.option_type
              );

              if (chainEntry) {
                quote = {
                  symbol: chainEntry.symbol || tradierSymbol || `${position.symbol}-${position.expiration_date}-${position.strike_price}-${position.option_type}`,
                  underlying: chainEntry.underlying || position.symbol,
                  expiration: chainEntry.expiration || position.expiration_date,
                  strike: chainEntry.strike,
                  option_type: chainEntry.option_type,
                  bid: chainEntry.bid,
                  ask: chainEntry.ask,
                  last: chainEntry.last,
                };
              }
            }
          }
        }

        if (quote && position.current_quantity) {
          const multiplier = position.multiplier || 100;
          const currentPrice =
            quote.last ||
            (quote.bid && quote.ask ? (quote.bid + quote.ask) / 2 : position.average_opening_price || 0);
          const rawMarketValue = position.current_quantity * multiplier * currentPrice;
          const isLong = position.side === 'long';

          // Calculate unrealized P&L
          unrealizedPL = isLong ? rawMarketValue - costBasis : costBasis - rawMarketValue;

          // For portfolio value: long options are assets (+), short options are liabilities (-)
          marketValue = isLong ? rawMarketValue : -rawMarketValue;
        } else {
          // Fallback when no quote available
          const storedUnrealizedPL = position.unrealized_pl || 0;
          const isLong = position.side === 'long';

          // For long: marketValue = costBasis + P&L (asset value)
          // For short: marketValue = -(costBasis - P&L) = -costBasis + P&L (liability)
          marketValue = isLong ? costBasis + storedUnrealizedPL : -costBasis + storedUnrealizedPL;
          unrealizedPL = storedUnrealizedPL;
        }

        positionsBreakdown.options.value += marketValue;
      } else if (assetType === 'futures') {
        // For futures: Only add unrealized P&L (margin-based)
        const storedUnrealizedPL = position.unrealized_pl || 0;
        marketValue = storedUnrealizedPL;
        unrealizedPL = storedUnrealizedPL;
        positionsBreakdown.futures.value += marketValue;
      } else {
        // Fallback for unknown asset types
        const storedUnrealizedPL = position.unrealized_pl || 0;
        marketValue = costBasis + storedUnrealizedPL;
        unrealizedPL = storedUnrealizedPL;
      }

        totalMarketValue += marketValue;
        totalUnrealizedPL += unrealizedPL;
      });

      // Calculate total realized P&L from closed positions
      // For expired short options with realized_pl=0, use total_cost_basis (fix for historical bug)
      const totalRealizedPL = closedPositions.reduce((sum, p) => {
        let realizedPL = p.realized_pl || 0;

        // Fix for expired short options that were closed with buggy calculation
        if (p.status === 'expired' && p.side === 'short' && realizedPL === 0 && p.total_cost_basis && p.total_cost_basis !== 0) {
          realizedPL = Math.abs(p.total_cost_basis);
        }

        return sum + realizedPL;
      }, 0);

      // Calculate portfolio value
      const portfolioValue = netCashFlow + totalMarketValue;

      // Create snapshot DTO
      const snapshotDto: CreatePortfolioSnapshotDto = {
      user_id: userId,
      snapshot_date: date,
      portfolio_value: portfolioValue,
      net_cash_flow: netCashFlow,
      total_market_value: totalMarketValue,
      total_realized_pl: totalRealizedPL,
      total_unrealized_pl: totalUnrealizedPL,
      open_positions_count: openPositions.length,
      total_positions_count: allPositions.length,
      positions_breakdown: positionsBreakdown,
    };

      // Save snapshot (upsert to handle same-day updates)
      console.log(`[PortfolioSnapshotService] Saving snapshot:`, {
        portfolio_value: snapshotDto.portfolio_value,
        total_market_value: snapshotDto.total_market_value,
        total_unrealized_pl: snapshotDto.total_unrealized_pl,
        open_positions_count: snapshotDto.open_positions_count,
      });
      
      await PortfolioSnapshotRepository.upsert(snapshotDto);
      console.log(`[PortfolioSnapshotService] Successfully saved snapshot for ${date}`);
    } catch (error) {
      console.error('[PortfolioSnapshotService] Error generating snapshot:', error);
      throw new Error(`Failed to generate portfolio snapshot: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Update an existing snapshot (recalculate metrics)
   */
  static async updateSnapshot(userId: string, snapshotDate: string): Promise<void> {
    // Call generateSnapshot with skipExistingCheck=true to avoid infinite loop
    await this.generateSnapshot(userId, snapshotDate, true);
  }

  /**
   * Calculate daily P&L change compared to previous day
   * This is handled by the database trigger, but can be called manually if needed
   */
  static async calculateDailyPLChange(userId: string, snapshotDate: string): Promise<{
    dailyPLChange: number;
    dailyPLPercent: number;
  }> {
    const currentSnapshot = await PortfolioSnapshotRepository.getByDate(userId, snapshotDate);
    if (!currentSnapshot) {
      throw new Error(`Snapshot not found for date ${snapshotDate}`);
    }

    // Get previous day's snapshot
    const prevDate = new Date(snapshotDate);
    prevDate.setDate(prevDate.getDate() - 1);
    const prevDateString = prevDate.toISOString().split('T')[0];
    
    const prevSnapshot = await PortfolioSnapshotRepository.getByDate(userId, prevDateString);

    if (!prevSnapshot) {
      return { dailyPLChange: 0, dailyPLPercent: 0 };
    }

    const dailyPLChange = currentSnapshot.portfolio_value - prevSnapshot.portfolio_value;
    const dailyPLPercent = prevSnapshot.portfolio_value !== 0
      ? ((dailyPLChange / Math.abs(prevSnapshot.portfolio_value)) * 100)
      : 0;

    return { dailyPLChange, dailyPLPercent };
  }
}

