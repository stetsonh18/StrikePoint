import { PortfolioSnapshotRepository, type CreatePortfolioSnapshotDto } from '@/infrastructure/repositories/portfolioSnapshot.repository';
import { PositionRepository } from '@/infrastructure/repositories/position.repository';
import { CashTransactionRepository } from '@/infrastructure/repositories/cashTransaction.repository';
import { getStockQuotes } from '@/infrastructure/services/marketDataService';
import { getCryptoQuotes } from '@/infrastructure/services/cryptoMarketDataService';
import { getOptionQuotes } from '@/infrastructure/services/optionsMarketDataService';
import type { Position } from '@/domain/types';

/**
 * Service for generating and managing portfolio snapshots
 */
export class PortfolioSnapshotService {
  /**
   * Generate a portfolio snapshot for a user
   * @param userId - User ID
   * @param snapshotDate - Optional date (defaults to today)
   */
  static async generateSnapshot(userId: string, snapshotDate?: string): Promise<void> {
    const date = snapshotDate || new Date().toISOString().split('T')[0];

    // Check if snapshot already exists for this date
    const existing = await PortfolioSnapshotRepository.getByDate(userId, date);
    if (existing) {
      // Update existing snapshot
      await this.updateSnapshot(userId, date);
      return;
    }

    // Get all positions
    const allPositions = await PositionRepository.getAll(userId);
    const openPositions = allPositions.filter((p) => p.status === 'open');
    const closedPositions = allPositions.filter((p) => p.status === 'closed');

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
    
    // Fetch quotes in parallel
    const [stockQuotes, cryptoQuotesData] = await Promise.all([
      stockSymbols.length > 0 ? getStockQuotes(stockSymbols) : Promise.resolve({}),
      cryptoCoinIds.length > 0 ? getCryptoQuotes(cryptoCoinIds) : Promise.resolve({}),
    ]);
    
    // Create a symbol-to-quote mapping for crypto
    const cryptoQuotes: Record<string, any> = {};
    Object.values(cryptoQuotesData).forEach((quote: any) => {
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
      } else if (assetType === 'option') {
        // For options, use stored unrealized_pl (real-time option quotes are complex)
        const storedUnrealizedPL = position.unrealized_pl || 0;
        const multiplier = position.multiplier || 100;
        const avgPrice = position.average_opening_price || 0;
        // Market value = cost basis + unrealized P&L
        marketValue = costBasis + storedUnrealizedPL;
        unrealizedPL = storedUnrealizedPL;
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
    const totalRealizedPL = closedPositions.reduce((sum, p) => sum + (p.realized_pl || 0), 0);

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
    await PortfolioSnapshotRepository.upsert(snapshotDto);
  }

  /**
   * Update an existing snapshot (recalculate metrics)
   */
  static async updateSnapshot(userId: string, snapshotDate: string): Promise<void> {
    await this.generateSnapshot(userId, snapshotDate);
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

