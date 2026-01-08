import { PositionRepository } from '@/infrastructure/repositories/position.repository';
import { StrategyRepository } from '@/infrastructure/repositories/strategy.repository';
import { PortfolioSnapshotRepository } from '@/infrastructure/repositories/portfolioSnapshot.repository';
import { CashTransactionRepository } from '@/infrastructure/repositories/cashTransaction.repository';
import { TransactionRepository } from '@/infrastructure/repositories/transaction.repository';
import type { Position, Strategy } from '@/domain/types';
import type { AssetType } from '@/domain/types/asset.types';

export interface WinRateMetrics {
  winRate: number; // Percentage
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  averageGain: number;
  averageLoss: number;
  profitFactor: number; // Total gains / total losses
  totalGains: number;
  totalLosses: number;
  // Extended metrics
  largestWin: number;
  largestLoss: number;
  expectancy: number; // (Win Rate × Avg Win) - (Loss Rate × Avg Loss)
  averageHoldingPeriodDays: number; // Average days positions are held
  // New metrics
  realizedPL: number; // Total realized P&L from closed positions
  unrealizedPL: number; // Total unrealized P&L from open positions
  averagePLPerTrade: number; // Average P&L per trade (realized)
  roi: number; // Return on Investment percentage
  currentBalance: number; // Current portfolio balance
  totalFees: number; // Total trading fees
}

export interface SymbolPerformance {
  symbol: string;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalPL: number;
  averagePL: number;
  largestWin: number;
  largestLoss: number;
}

export interface MonthlyPerformance {
  month: string; // Format: "YYYY-MM"
  monthLabel: string; // Format: "Jan 2025"
  totalPL: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
}

type TradeStatus = 'open' | 'closed' | 'partial';

interface NormalizedTrade {
  id: string;
  userId: string;
  assetType: AssetType;
  symbol: string;
  strategyId: string | null;
  strategyType?: string | null;
  direction: string | null;
  openedAt: string | null;
  closedAt: string | null;
  updatedAt: string | null;
  expirationDate: string | null;
  realizedPL: number;
  unrealizedPL: number;
  status: TradeStatus;
  legs: Position[];
}

/**
 * Service for calculating performance metrics from closed positions
 */
export class PerformanceMetricsService {
  /**
   * Normalize positions into trade objects so multi-leg strategies count as single trades.
   */
  private static async getNormalizedTrades(userId: string): Promise<NormalizedTrade[]> {
    const [positions, strategies] = await Promise.all([
      PositionRepository.getAll(userId),
      StrategyRepository.getAll(userId),
    ]);

    const strategyMap = new Map(strategies.map((strategy) => [strategy.id, strategy]));
    const positionsByStrategyId = new Map<string, Position[]>();
    const positionIdMap = new Map<string, Position>(positions.map(p => [p.id, p]));
    const usedPositionIds = new Set<string>();

    // For each strategy, collect ALL positions from strategy.legs
    // This ensures multi-leg strategies are grouped as single trades
    strategies.forEach((strategy) => {
      if (!strategy.legs || strategy.legs.length === 0) {
        return;
      }
      
      const strategyPositions: Position[] = [];
      const addedPositionIds = new Set<string>();
      
      strategy.legs.forEach((leg) => {
        if (leg.position_id) {
          const position = positionIdMap.get(leg.position_id);
          if (position && !addedPositionIds.has(position.id)) {
            strategyPositions.push(position);
            addedPositionIds.add(position.id);
            usedPositionIds.add(position.id);
          }
        }
      });
      
      if (strategyPositions.length > 0) {
        positionsByStrategyId.set(strategy.id, strategyPositions);
      }
    });

    const trades: NormalizedTrade[] = [];

    // Create trades for each strategy using positions from strategy.legs
    positionsByStrategyId.forEach((groupPositions, strategyId) => {
      trades.push(this.buildNormalizedTrade(groupPositions, strategyMap.get(strategyId)));
    });

    // Create standalone trades for positions not part of any strategy
    const standalonePositions = positions.filter((position) => !usedPositionIds.has(position.id));
    standalonePositions.forEach((position) => {
      trades.push(this.buildNormalizedTrade([position]));
    });

    return trades;
  }

  private static buildNormalizedTrade(positions: Position[], strategy?: Strategy): NormalizedTrade {
    const primaryPosition = positions[0];
    const assetType = this.getPrimaryAssetType(positions);
    const symbol = strategy?.underlying_symbol || primaryPosition.symbol || 'Unknown';
    const openedAt = strategy?.opened_at || this.getEarliestDate(positions.map((p) => p.opened_at));
    const closedAt = strategy?.closed_at || this.getLatestDate(positions.map((p) => p.closed_at));
    const updatedAt = strategy?.updated_at || this.getLatestDate(positions.map((p) => p.updated_at));
    const expirationDate =
      strategy?.expiration_date || positions.find((p) => p.expiration_date)?.expiration_date || null;
    // For strategies, use the strategy's realized_pl (it's the correct combined value)
    // For individual positions, sum their realized_pl
    const realizedPL = strategy?.realized_pl !== undefined && strategy.realized_pl !== null
      ? strategy.realized_pl
      : positions.reduce((sum, position) => sum + (position.realized_pl || 0), 0);
    const unrealizedPL = positions.reduce((sum, position) => sum + (position.unrealized_pl || 0), 0);
    const status = this.inferTradeStatus(positions, strategy);
    const direction = strategy?.direction || primaryPosition.side || null;

    return {
      id: strategy?.id || primaryPosition.id,
      userId: primaryPosition.user_id,
      assetType,
      symbol,
      strategyId: strategy?.id || primaryPosition.strategy_id || null,
      strategyType: strategy?.strategy_type || null,
      direction,
      openedAt,
      closedAt,
      updatedAt,
      expirationDate,
      realizedPL,
      unrealizedPL,
      status,
      legs: positions,
    };
  }

  private static getPrimaryAssetType(positions: Position[]): AssetType {
    const preference: AssetType[] = ['option', 'futures', 'stock', 'crypto', 'cash'];
    for (const assetType of preference) {
      if (positions.some((position) => position.asset_type === assetType)) {
        return assetType;
      }
    }
    return positions[0].asset_type as AssetType;
  }

  private static getEarliestDate(values: Array<string | null>): string | null {
    const valid = values.filter((value): value is string => Boolean(value));
    if (valid.length === 0) {
      return null;
    }
    return valid.reduce((earliest, current) =>
      new Date(current) < new Date(earliest) ? current : earliest
    );
  }

  private static getLatestDate(values: Array<string | null>): string | null {
    const valid = values.filter((value): value is string => Boolean(value));
    if (valid.length === 0) {
      return null;
    }
    return valid.reduce((latest, current) =>
      new Date(current) > new Date(latest) ? current : latest
    );
  }

  private static inferTradeStatus(positions: Position[], strategy?: Strategy): TradeStatus {
    const strategyStatus = strategy?.status;
    if (strategyStatus && ['closed', 'assigned', 'expired'].includes(strategyStatus)) {
      return 'closed';
    }
    if (strategyStatus === 'partially_closed') {
      return 'partial';
    }

    const allClosed = positions.every((position) => position.status === 'closed');
    if (allClosed) {
      return 'closed';
    }
    const someClosed = positions.some((position) => position.status === 'closed');
    if (someClosed) {
      return 'partial';
    }
    return 'open';
  }

  private static isRealizedTrade(trade: NormalizedTrade): boolean {
    // Include all statuses that represent finalized positions
    const realizedStatuses = ['closed', 'expired', 'assigned', 'exercised'];
    return realizedStatuses.includes(trade.status) || trade.realizedPL !== 0;
  }

  private static filterTradesByAssetType(trades: NormalizedTrade[], assetType?: AssetType): NormalizedTrade[] {
    if (!assetType) {
      return trades;
    }
    return trades.filter((trade) => trade.assetType === assetType);
  }

  private static filterTradesByDateRange(
    trades: NormalizedTrade[],
    days?: number,
    dateRange?: { startDate: string; endDate: string }
  ): NormalizedTrade[] {
    if (!days && !dateRange) {
      return trades;
    }

    let startDate: Date;
    let endDate: Date = new Date();

    if (dateRange) {
      // Custom date range has priority
      startDate = new Date(dateRange.startDate);
      endDate = new Date(dateRange.endDate);
      // Set to end of day for endDate
      endDate.setHours(23, 59, 59, 999);
    } else if (days) {
      // Preset timeframe
      startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
    } else {
      return trades;
    }

    return trades.filter((trade) => {
      const closedDate = this.getTradeClosedDate(trade);
      return closedDate && closedDate >= startDate && closedDate <= endDate;
    });
  }

  private static getDate(value?: string | null): Date | null {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private static getTradeClosedDate(trade: NormalizedTrade): Date | null {
    return this.getDate(trade.closedAt) || this.getDate(trade.updatedAt) || this.getDate(trade.openedAt);
  }

  private static getTradeOpenedDate(trade: NormalizedTrade): Date | null {
    return this.getDate(trade.openedAt);
  }

  private static getTradeExpirationDate(trade: NormalizedTrade): Date | null {
    return this.getDate(trade.expirationDate);
  }

  private static getTradeSymbol(trade: NormalizedTrade): string {
    return trade.symbol || 'Unknown';
  }

  /**
   * Calculate win rate from closed positions
   * Includes fully closed positions and partially closed positions (with realized P/L)
   * For multi-leg strategies, counts the strategy as a single trade instead of counting individual legs
   */
  static async calculateWinRate(
    userId: string,
    dateRange?: { startDate: string; endDate: string }
  ): Promise<WinRateMetrics> {
    const trades = await this.getNormalizedTrades(userId);
    const filteredTrades = this.filterTradesByDateRange(trades, undefined, dateRange);
    const realizedTrades = filteredTrades.filter((trade) => this.isRealizedTrade(trade));
    const winningTrades = realizedTrades.filter((trade) => trade.realizedPL > 0);
    const losingTrades = realizedTrades.filter((trade) => trade.realizedPL < 0);

    const realizedPL = realizedTrades.reduce((sum, trade) => sum + trade.realizedPL, 0);
    const unrealizedPL = filteredTrades
      .filter((trade) => trade.status !== 'closed')
      .reduce((sum, trade) => sum + trade.unrealizedPL, 0);

    const totalTrades = realizedTrades.length;
    const totalGains = winningTrades.reduce((sum, trade) => sum + trade.realizedPL, 0);
    const totalLosses = Math.abs(losingTrades.reduce((sum, trade) => sum + trade.realizedPL, 0));
    const averageGain = winningTrades.length > 0 ? totalGains / winningTrades.length : 0;
    const averageLoss = losingTrades.length > 0 ? totalLosses / losingTrades.length : 0;
    const winRate = totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0;
    const profitFactor =
      totalLosses > 0 ? totalGains / totalLosses : totalGains > 0 ? Infinity : 0;
    const averagePLPerTrade = totalTrades > 0 ? realizedPL / totalTrades : 0;

    const holdingPeriods = realizedTrades
      .map((trade) => {
        const opened = this.getTradeOpenedDate(trade);
        const closed = this.getTradeClosedDate(trade);
        if (!opened || !closed) {
          return null;
        }
        return Math.max(
          1,
          Math.ceil((closed.getTime() - opened.getTime()) / (1000 * 60 * 60 * 24))
        );
      })
      .filter((value): value is number => value !== null);
    const averageHoldingPeriodDays =
      holdingPeriods.length > 0
        ? holdingPeriods.reduce((sum, value) => sum + value, 0) / holdingPeriods.length
        : 0;

    // Calculate initial investment (sum of deposits) - matching ROI chart logic
    const cashTransactions = await CashTransactionRepository.getByUserId(userId);
    const depositCodes = ['DEPOSIT', 'ACH', 'DCF', 'RTP', 'DEP'];
    const initialInvestment = cashTransactions
      .filter((tx) => depositCodes.includes(tx.transaction_code || ''))
      .filter((tx) => (tx.amount || 0) > 0)
      .reduce((sum, tx) => sum + (tx.amount || 0), 0);

    // Get latest portfolio snapshot to use actual portfolio value (matching ROI chart logic)
    const latestSnapshot = await PortfolioSnapshotRepository.getMostRecent(userId);
    let portfolioValue = 0;
    
    if (latestSnapshot) {
      portfolioValue = latestSnapshot.portfolio_value;
    } else {
      // Fallback to simplified calculation if no snapshot exists
      const netCashFlow = cashTransactions
        .filter((tx) => !['FUTURES_MARGIN', 'FUTURES_MARGIN_RELEASE'].includes(tx.transaction_code || ''))
        .reduce((sum, tx) => sum + (tx.amount || 0), 0);
      portfolioValue = netCashFlow + unrealizedPL;
    }

    // Calculate ROI relative to initial investment
    // ROI = (Current Portfolio Value + Withdrawals - Deposits) / Deposits
    // Using snapshot's net_cash_flow: net_cash_flow = deposits - withdrawals
    // So: portfolioValue - net_cash_flow = portfolioValue - deposits + withdrawals
    const investmentBase = initialInvestment ||
      (latestSnapshot?.net_cash_flow ?? latestSnapshot?.portfolio_value ?? 0);

    // Calculate ROI using a simpler, more direct approach
    // ROI = (Total P&L) / Initial Investment * 100
    // Total P&L = Realized P&L + Unrealized P&L
    let roi = 0;
    if (initialInvestment > 0) {
      const totalPL = realizedPL + unrealizedPL;
      roi = (totalPL / Math.abs(initialInvestment)) * 100;
    } else if (portfolioValue > 0 && investmentBase !== 0) {
      // Fallback calculation if no deposits recorded
      roi = ((portfolioValue - investmentBase) / Math.abs(investmentBase)) * 100;
    }

    // Calculate total fees from all transactions
    const allTransactions = await TransactionRepository.getAll(userId);
    const totalFees = allTransactions.reduce((sum, tx) => sum + (tx.fees || 0), 0);

    if (totalTrades === 0) {
      return {
        winRate: 0,
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        averageGain: 0,
        averageLoss: 0,
        profitFactor: 0,
        totalGains: 0,
        totalLosses: 0,
        largestWin: 0,
        largestLoss: 0,
        expectancy: 0,
        averageHoldingPeriodDays: 0,
        realizedPL: 0,
        unrealizedPL,
        averagePLPerTrade: 0,
        roi, // Use calculated ROI instead of hardcoding to 0
        currentBalance: portfolioValue,
        totalFees,
      };
    }

    const largestWin = winningTrades.length > 0
      ? Math.max(...winningTrades.map((trade) => trade.realizedPL))
      : 0;
    const largestLoss = losingTrades.length > 0
      ? Math.min(...losingTrades.map((trade) => trade.realizedPL))
      : 0;

    const lossRate = (losingTrades.length / totalTrades) * 100;
    const expectancy = (winRate / 100) * averageGain - (lossRate / 100) * averageLoss;

    return {
      winRate,
      totalTrades,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      averageGain,
      averageLoss,
      profitFactor: Number.isFinite(profitFactor) ? profitFactor : 0,
      totalGains,
      totalLosses,
      largestWin,
      largestLoss,
      expectancy,
      averageHoldingPeriodDays,
      realizedPL,
      unrealizedPL,
      averagePLPerTrade,
      roi,
      currentBalance: portfolioValue,
      totalFees,
    };
  }

  /**
   * Calculate average gain vs average loss
   */
  static async calculateAverageGainLoss(userId: string): Promise<{
    averageGain: number;
    averageLoss: number;
  }> {
    const metrics = await this.calculateWinRate(userId);
    return {
      averageGain: metrics.averageGain,
      averageLoss: metrics.averageLoss,
    };
  }

  /**
   * Calculate profit factor (total gains / total losses)
   */
  static async calculateProfitFactor(userId: string): Promise<number> {
    const metrics = await this.calculateWinRate(userId);
    return metrics.profitFactor;
  }

  /**
   * Calculate win rate from closed positions filtered by asset type
   * Includes fully closed positions and partially closed positions (with realized P/L)
   * For multi-leg strategies, counts the strategy as a single trade instead of counting individual legs
   */
  static async calculateWinRateByAssetType(
    userId: string,
    assetType: AssetType,
    dateRange?: { startDate: string; endDate: string }
  ): Promise<WinRateMetrics> {
    const trades = await this.getNormalizedTrades(userId);
    const dateFilteredTrades = this.filterTradesByDateRange(trades, undefined, dateRange);
    const filteredTrades = this.filterTradesByAssetType(dateFilteredTrades, assetType);
    const realizedTrades = filteredTrades.filter((trade) => this.isRealizedTrade(trade));
    const winningTrades = realizedTrades.filter((trade) => trade.realizedPL > 0);
    const losingTrades = realizedTrades.filter((trade) => trade.realizedPL < 0);

    const realizedPL = realizedTrades.reduce((sum, trade) => sum + trade.realizedPL, 0);
    const unrealizedPL = filteredTrades
      .filter((trade) => trade.status !== 'closed')
      .reduce((sum, trade) => sum + trade.unrealizedPL, 0);

    const totalTrades = realizedTrades.length;
    const totalGains = winningTrades.reduce((sum, trade) => sum + trade.realizedPL, 0);
    const totalLosses = Math.abs(losingTrades.reduce((sum, trade) => sum + trade.realizedPL, 0));
    const averageGain = winningTrades.length > 0 ? totalGains / winningTrades.length : 0;
    const averageLoss = losingTrades.length > 0 ? totalLosses / losingTrades.length : 0;
    const winRate = totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0;
    const profitFactor =
      totalLosses > 0 ? totalGains / totalLosses : totalGains > 0 ? Infinity : 0;
    const averagePLPerTrade = totalTrades > 0 ? realizedPL / totalTrades : 0;

    const holdingPeriods = realizedTrades
      .map((trade) => {
        const opened = this.getTradeOpenedDate(trade);
        const closed = this.getTradeClosedDate(trade);
        if (!opened || !closed) {
          return null;
        }
        return Math.max(
          1,
          Math.ceil((closed.getTime() - opened.getTime()) / (1000 * 60 * 60 * 24))
        );
      })
      .filter((value): value is number => value !== null);
    const averageHoldingPeriodDays =
      holdingPeriods.length > 0
        ? holdingPeriods.reduce((sum, value) => sum + value, 0) / holdingPeriods.length
        : 0;

    // For asset-specific ROI, calculate based on cost basis of positions in that asset type
    // Get all positions (open + closed) for this asset type to calculate total cost basis
    const allPositionsForAssetType = await PositionRepository.getAll(userId, { asset_type: assetType });
    
    // Calculate total cost basis: sum of absolute cost basis for all positions in this asset type
    // This represents the total capital deployed in this asset type
    const totalCostBasis = allPositionsForAssetType.reduce((sum, position) => {
      return sum + Math.abs(position.total_cost_basis || 0);
    }, 0);

    // Get latest portfolio snapshot to use actual portfolio value
    // For asset-specific calculations, use breakdown value WITHOUT net_cash_flow
    const latestSnapshot = await PortfolioSnapshotRepository.getMostRecent(userId);
    let portfolioValue = 0;
    
    if (latestSnapshot) {
      const breakdown = latestSnapshot.positions_breakdown;
      if (assetType === 'stock') {
        portfolioValue = breakdown.stocks.value;
      } else if (assetType === 'option') {
        portfolioValue = breakdown.options.value;
      } else if (assetType === 'crypto') {
        portfolioValue = breakdown.crypto.value;
      } else if (assetType === 'futures') {
        portfolioValue = breakdown.futures.value;
      } else {
        // For overall portfolio, use full portfolio value
        portfolioValue = latestSnapshot.portfolio_value;
      }
    } else {
      // Fallback: use just unrealized PL if no snapshot exists
      portfolioValue = unrealizedPL;
    }

    // For asset-specific ROI: ROI = (Realized P&L + Unrealized P&L) / Total Cost Basis
    // This shows the return on capital actually deployed in this asset type
    const roi =
      totalCostBasis > 0
        ? ((realizedPL + unrealizedPL) / totalCostBasis) * 100
        : 0;

    // Calculate total fees from transactions filtered by asset type
    const allTransactions = await TransactionRepository.getAll(userId);
    const filteredTransactions = allTransactions.filter((tx) => tx.asset_type === assetType);
    const totalFees = filteredTransactions.reduce((sum, tx) => sum + (tx.fees || 0), 0);

    if (totalTrades === 0) {
      return {
        winRate: 0,
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        averageGain: 0,
        averageLoss: 0,
        profitFactor: 0,
        totalGains: 0,
        totalLosses: 0,
        largestWin: 0,
        largestLoss: 0,
        expectancy: 0,
        averageHoldingPeriodDays: 0,
        realizedPL: 0,
        unrealizedPL,
        averagePLPerTrade: 0,
        roi, // Use calculated ROI instead of hardcoding to 0
        currentBalance: portfolioValue,
        totalFees,
      };
    }

    const largestWin = winningTrades.length > 0
      ? Math.max(...winningTrades.map((trade) => trade.realizedPL))
      : 0;
    const largestLoss = losingTrades.length > 0
      ? Math.min(...losingTrades.map((trade) => trade.realizedPL))
      : 0;

    const lossRate = (losingTrades.length / totalTrades) * 100;
    const expectancy = (winRate / 100) * averageGain - (lossRate / 100) * averageLoss;

    return {
      winRate,
      totalTrades,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      averageGain,
      averageLoss,
      profitFactor: Number.isFinite(profitFactor) ? profitFactor : 0,
      totalGains,
      totalLosses,
      largestWin,
      largestLoss,
      expectancy,
      averageHoldingPeriodDays,
      realizedPL,
      unrealizedPL,
      averagePLPerTrade,
      roi,
      currentBalance: portfolioValue,
      totalFees,
    };
  }

  /**
   * Calculate performance by symbol for a specific asset type
   */
  static async calculatePerformanceBySymbol(
    userId: string,
    assetType?: AssetType,
    days?: number, // Optional: filter by last N days
    dateRange?: { startDate: string; endDate: string }
  ): Promise<SymbolPerformance[]> {
    const trades = await this.getNormalizedTrades(userId);
    const dateFilteredTrades = this.filterTradesByDateRange(trades, days, dateRange);
    let realizedTrades = dateFilteredTrades.filter(
      (trade) => (!assetType || trade.assetType === assetType) && this.isRealizedTrade(trade)
    );

    if (realizedTrades.length === 0) {
      return [];
    }

    // Group by symbol
    const symbolMap = new Map<string, NormalizedTrade[]>();
    realizedTrades.forEach((trade) => {
      const symbol = this.getTradeSymbol(trade);
      if (!symbolMap.has(symbol)) {
        symbolMap.set(symbol, []);
      }
      symbolMap.get(symbol)!.push(trade);
    });

    // Calculate metrics per symbol
    const symbolPerformance: SymbolPerformance[] = [];
    symbolMap.forEach((symbolTrades, symbol) => {
      const winningTrades = symbolTrades.filter((trade) => trade.realizedPL > 0);
      const losingTrades = symbolTrades.filter((trade) => trade.realizedPL < 0);
      const totalPL = symbolTrades.reduce((sum, trade) => sum + trade.realizedPL, 0);
      const winRate = symbolTrades.length > 0 ? (winningTrades.length / symbolTrades.length) * 100 : 0;
      const largestWin = winningTrades.length > 0
        ? Math.max(...winningTrades.map((trade) => trade.realizedPL))
        : 0;
      const largestLoss = losingTrades.length > 0
        ? Math.min(...losingTrades.map((trade) => trade.realizedPL))
        : 0;

      symbolPerformance.push({
        symbol,
        totalTrades: symbolTrades.length,
        winningTrades: winningTrades.length,
        losingTrades: losingTrades.length,
        winRate,
        totalPL,
        averagePL: symbolTrades.length > 0 ? totalPL / symbolTrades.length : 0,
        largestWin,
        largestLoss,
      });
    });

    // Sort by total P/L descending
    return symbolPerformance.sort((a, b) => b.totalPL - a.totalPL);
  }

  /**
   * Calculate monthly performance for a specific asset type
   */
  static async calculateMonthlyPerformance(
    userId: string,
    assetType?: AssetType,
    months: number = 12, // Number of months to include
    dateRange?: { startDate: string; endDate: string }
  ): Promise<MonthlyPerformance[]> {
    const trades = await this.getNormalizedTrades(userId);
    const dateFilteredTrades = this.filterTradesByDateRange(trades, undefined, dateRange);
    const realizedTrades = dateFilteredTrades.filter(
      (trade) => (!assetType || trade.assetType === assetType) && this.isRealizedTrade(trade)
    );

    if (realizedTrades.length === 0) {
      return [];
    }

    // Group by month
    const monthMap = new Map<string, NormalizedTrade[]>();
    realizedTrades.forEach((trade) => {
      const closedDate = this.getTradeClosedDate(trade);
      if (!closedDate) {
        return;
      }
      const monthKey = `${closedDate.getFullYear()}-${String(closedDate.getMonth() + 1).padStart(2, '0')}`;
      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, []);
      }
      monthMap.get(monthKey)!.push(trade);
    });

    // Calculate metrics per month
    const monthlyPerformance: MonthlyPerformance[] = [];
    monthMap.forEach((monthTrades, monthKey) => {
      const winningTrades = monthTrades.filter((trade) => trade.realizedPL > 0);
      const losingTrades = monthTrades.filter((trade) => trade.realizedPL < 0);
      const totalPL = monthTrades.reduce((sum, trade) => sum + trade.realizedPL, 0);
      const winRate = monthTrades.length > 0 ? (winningTrades.length / monthTrades.length) * 100 : 0;

      const [year, month] = monthKey.split('-');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthLabel = `${monthNames[parseInt(month) - 1]} ${year}`;

      monthlyPerformance.push({
        month: monthKey,
        monthLabel,
        totalPL,
        totalTrades: monthTrades.length,
        winningTrades: winningTrades.length,
        losingTrades: losingTrades.length,
        winRate,
      });
    });

    // Sort by month descending and limit to last N months
    const sorted = monthlyPerformance.sort((a, b) => b.month.localeCompare(a.month));
    return sorted.slice(0, months);
  }

  /**
   * Calculate P&L over time (daily cumulative)
   * Uses portfolio snapshots for accurate unrealized P&L when available
   */
  static async calculatePLOverTime(
    userId: string,
    assetType?: AssetType,
    days?: number
  ): Promise<Array<{ date: string; cumulativePL: number; realizedPL: number; unrealizedPL: number }>> {
    const trades = await this.getNormalizedTrades(userId);
    const filteredTrades = this.filterTradesByAssetType(trades, assetType);
    const realizedTrades = filteredTrades.filter((trade) => this.isRealizedTrade(trade));
    const openTrades = filteredTrades.filter((trade) => trade.status !== 'closed');

    const formatDateKey = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    const parseDateKey = (key: string) => {
      const [year, month, day] = key.split('-').map((value) => parseInt(value, 10));
      return new Date(year, (month || 1) - 1, day || 1);
    };
    const addDays = (date: Date, amount: number) => {
      const copy = new Date(date);
      copy.setDate(copy.getDate() + amount);
      return copy;
    };

    const dateMap = new Map<string, { realized: number; unrealized: number }>();

    const closingTransactionIdSet = new Set<string>();
    realizedTrades.forEach((trade) => {
      trade.legs.forEach((leg) => {
        (leg.closing_transaction_ids || []).forEach((id) => {
          if (id) {
            closingTransactionIdSet.add(id);
          }
        });
      });
    });
    const closingTransactionDates =
      closingTransactionIdSet.size > 0
        ? await TransactionRepository.getActivityDates(Array.from(closingTransactionIdSet))
        : {};

    const getRealizedDateKey = (trade: NormalizedTrade): string | null => {
      const closedDate = this.getTradeClosedDate(trade);
      const legClosingDates = trade.legs
        .flatMap((leg) => leg.closing_transaction_ids || [])
        .map((id) => (id ? closingTransactionDates[id] : undefined))
        .filter((date): date is string => Boolean(date));

      if (legClosingDates.length > 0) {
        const latestLegDate = this.getLatestDate(legClosingDates);
        return latestLegDate ?? null;
      }

      return closedDate ? formatDateKey(closedDate) : null;
    };

    realizedTrades.forEach((trade) => {
      const dateKey = getRealizedDateKey(trade);
      if (!dateKey) {
        return;
      }
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, { realized: 0, unrealized: 0 });
      }
      dateMap.get(dateKey)!.realized += trade.realizedPL;
    });

    const todayKey = formatDateKey(new Date());
    const todayDate = parseDateKey(todayKey);
    if (openTrades.length > 0) {
      if (!dateMap.has(todayKey)) {
        dateMap.set(todayKey, { realized: 0, unrealized: 0 });
      }
      dateMap.get(todayKey)!.unrealized += openTrades.reduce((sum, trade) => sum + trade.unrealizedPL, 0);
    }

    const dailyPL = Array.from(dateMap.entries())
      .map(([date, pl]) => ({
        date,
        dailyRealized: pl.realized,
        dailyUnrealized: pl.unrealized,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    if (dailyPL.length === 0) {
      return [];
    }

    const dailyPLMap = new Map(dailyPL.map((day) => [day.date, day]));

    let rangeEndDate = days ? todayDate : parseDateKey(dailyPL[dailyPL.length - 1].date);
    const rangeStartDate = days
      ? addDays(rangeEndDate, -(days - 1))
      : parseDateKey(dailyPL[0].date);

    if (!days && rangeStartDate.getTime() === rangeEndDate.getTime()) {
      rangeEndDate = addDays(rangeEndDate, 1);
    }

    const filledDailyPL: Array<{ date: string; dailyRealized: number; dailyUnrealized: number }> = [];
    for (let cursor = new Date(rangeStartDate); cursor <= rangeEndDate; cursor = addDays(cursor, 1)) {
      const dateKey = formatDateKey(cursor);
      const existing = dailyPLMap.get(dateKey);
      filledDailyPL.push({
        date: dateKey,
        dailyRealized: existing?.dailyRealized ?? 0,
        dailyUnrealized: existing?.dailyUnrealized ?? 0,
      });
    }

    const hasDataPointInRange = filledDailyPL.some((day) => dailyPLMap.has(day.date));
    if (!hasDataPointInRange) {
      return [];
    }

    // Get historical realized P&L from positions closed before the range start
    // This ensures cumulative P&L never decreases when viewing limited time ranges
    const historicalRealizedPL = days
      ? await PositionRepository.getSumRealizedPLBeforeDate(
        userId,
        formatDateKey(rangeStartDate),
        assetType
      )
      : 0;

    // Query portfolio snapshots for the date range to get accurate unrealized P&L
    const snapshots = await PortfolioSnapshotRepository.getDateRange(
      userId,
      formatDateKey(rangeStartDate),
      formatDateKey(rangeEndDate)
    );

    // Create a map of snapshot unrealized P&L by date
    const snapshotUnrealizedMap = new Map<string, number>();
    snapshots.forEach((snapshot) => {
      const dateKey = snapshot.snapshot_date;
      // Only use snapshot for unrealized P&L (not realized)
      // TODO: Future enhancement - add per-asset unrealized P&L to snapshot schema
      snapshotUnrealizedMap.set(dateKey, snapshot.total_unrealized_pl);
    });

    let cumulativeRealized = historicalRealizedPL;
    let cumulativeUnrealized = 0;

    return filledDailyPL.map((day) => {
      // Always accumulate realized P&L from trades (already working correctly)
      cumulativeRealized += day.dailyRealized;

      // For unrealized P&L: use snapshot if available, otherwise accumulate from trades
      const snapshotUnrealized = snapshotUnrealizedMap.get(day.date);
      const unrealizedPL = snapshotUnrealized !== undefined ? snapshotUnrealized : cumulativeUnrealized + day.dailyUnrealized;

      // Only update cumulative if not using snapshot
      if (snapshotUnrealized === undefined) {
        cumulativeUnrealized += day.dailyUnrealized;
      }

      return {
        date: day.date,
        cumulativePL: cumulativeRealized + unrealizedPL,
        realizedPL: cumulativeRealized,
        unrealizedPL: unrealizedPL,
      };
    });

  }

  /**
   * Calculate last 7 days P&L
   */
  static async calculateLast7DaysPL(
    userId: string,
    assetType?: AssetType,
    dateRange?: { startDate: string; endDate: string }
  ): Promise<Array<{ date: string; pl: number }>> {
    const trades = await this.getNormalizedTrades(userId);
    const dateFilteredTrades = this.filterTradesByDateRange(trades, undefined, dateRange);
    const filteredTrades = this.filterTradesByAssetType(dateFilteredTrades, assetType);
    const realizedTrades = filteredTrades.filter((trade) => this.isRealizedTrade(trade));
    const openTrades = filteredTrades.filter((trade) => trade.status !== 'closed');

    const closingTransactionIdSet = new Set<string>();
    realizedTrades.forEach((trade) => {
      trade.legs.forEach((leg) => {
        (leg.closing_transaction_ids || []).forEach((id) => {
          if (id) {
            closingTransactionIdSet.add(id);
          }
        });
      });
    });
    const closingTransactionDates =
      closingTransactionIdSet.size > 0
        ? await TransactionRepository.getActivityDates(Array.from(closingTransactionIdSet))
        : {};

    const getTradeDateKey = (trade: NormalizedTrade): string | null => {
      const closedDate = this.getTradeClosedDate(trade);
      const legClosingDates = trade.legs
        .flatMap((leg) => leg.closing_transaction_ids || [])
        .map((id) => (id ? closingTransactionDates[id] : undefined))
        .filter((date): date is string => Boolean(date));

      if (legClosingDates.length > 0) {
        const latestLegDate = this.getLatestDate(legClosingDates);
        return latestLegDate ? latestLegDate : null;
      }

      return closedDate ? closedDate.toISOString().split('T')[0] : null;
    };

    const dates: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }

    const dailyPL = dates.map((date) => {
      let value = 0;
      realizedTrades.forEach((trade) => {
        const closedKey = getTradeDateKey(trade);
        if (closedKey === date) {
          value += trade.realizedPL;
        }
      });

      if (date === dates[dates.length - 1] && openTrades.length > 0) {
        value += openTrades.reduce((sum, trade) => sum + trade.unrealizedPL, 0);
      }

      return { date, pl: value };
    });

    return dailyPL;
  }

  /**
   * Calculate P&L by day of week
   */
  static async calculateDayOfWeekPerformance(
    userId: string,
    assetType?: AssetType,
    dateRange?: { startDate: string; endDate: string }
  ): Promise<Array<{ dayOfWeek: string; pl: number; winRate: number; totalTrades: number; winningTrades: number; losingTrades: number }>> {
    const trades = await this.getNormalizedTrades(userId);
    const dateFilteredTrades = this.filterTradesByDateRange(trades, undefined, dateRange);
    const realizedTrades = this.filterTradesByAssetType(dateFilteredTrades, assetType).filter((trade) =>
      this.isRealizedTrade(trade)
    );

    const closingTransactionIdSet = new Set<string>();
    realizedTrades.forEach((trade) => {
      trade.legs.forEach((leg) => {
        (leg.closing_transaction_ids || []).forEach((id) => {
          if (id) {
            closingTransactionIdSet.add(id);
          }
        });
      });
    });
    const closingTransactionDates =
      closingTransactionIdSet.size > 0
        ? await TransactionRepository.getActivityDates(Array.from(closingTransactionIdSet))
        : {};

    const normalizeDateKey = (value: string | Date | null | undefined): string | null => {
      if (!value) {
        return null;
      }

      const toDateOnlyString = (input: string) => {
        if (!input) return null;
        const [datePart] = input.split(/[T\s]/);
        return datePart || null;
      };

      if (value instanceof Date) {
        if (Number.isNaN(value.getTime())) {
          return null;
        }
        return value.toISOString().split('T')[0];
      }

      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
      }

      if (typeof value === 'string') {
        return toDateOnlyString(value);
      }

      return null;
    };

    const getTradeDateKey = (trade: NormalizedTrade): string | null => {
      const legClosingDates = trade.legs
        .flatMap((leg) => leg.closing_transaction_ids || [])
        .map((id) => (id ? closingTransactionDates[id] : undefined))
        .filter((date): date is string => Boolean(date));

      if (legClosingDates.length > 0) {
        const latestLegDate = this.getLatestDate(legClosingDates);
        return normalizeDateKey(latestLegDate);
      }

      const closedDate = this.getTradeClosedDate(trade);
      return closedDate ? normalizeDateKey(closedDate) : null;
    };

    const getDayIndexFromDateKey = (dateKey: string): number | null => {
      const date = new Date(`${dateKey}T00:00:00Z`);
      if (Number.isNaN(date.getTime())) {
        return null;
      }
      return date.getUTCDay();
    };

    const dayMap = new Map<number, { pl: number; trades: NormalizedTrade[] }>();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    realizedTrades.forEach((trade) => {
      const dateKey = getTradeDateKey(trade);
      if (!dateKey) {
        return;
      }
      const dayOfWeek = getDayIndexFromDateKey(dateKey);
      if (dayOfWeek === null) {
        return;
      }

      if (!dayMap.has(dayOfWeek)) {
        dayMap.set(dayOfWeek, { pl: 0, trades: [] });
      }

      const dayData = dayMap.get(dayOfWeek)!;
      dayData.pl += trade.realizedPL;
      dayData.trades.push(trade);
    });

    // Convert to array and calculate win rates
    const result = Array.from(dayMap.entries())
      .map(([dayOfWeek, data]) => {
        const winningTrades = data.trades.filter((trade) => trade.realizedPL > 0);
        const losingTrades = data.trades.filter((trade) => trade.realizedPL < 0);
        const winRate = data.trades.length > 0 ? (winningTrades.length / data.trades.length) * 100 : 0;

        return {
          dayOfWeek: dayNames[dayOfWeek],
          dayIndex: dayOfWeek,
          pl: data.pl,
          winRate,
          totalTrades: data.trades.length,
          winningTrades: winningTrades.length,
          losingTrades: losingTrades.length,
        };
      })
      .sort((a, b) => {
        // Sort by day of week (Sunday = 0, Monday = 1, etc.)
        // But we want Monday first, so adjust
        const aIndex = a.dayIndex === 0 ? 7 : a.dayIndex;
        const bIndex = b.dayIndex === 0 ? 7 : b.dayIndex;
        return aIndex - bIndex;
      });

    // Ensure all days are present (with 0 values)
    const allDays = dayNames.map((name, index) => {
      const existing = result.find((r) => r.dayOfWeek === name);
      if (existing) return existing;
      return {
        dayOfWeek: name,
        dayIndex: index,
        pl: 0,
        winRate: 0,
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
      };
    });

    // Re-sort to put Monday first
    return allDays.sort((a, b) => {
      const aIndex = a.dayIndex === 0 ? 7 : a.dayIndex;
      const bIndex = b.dayIndex === 0 ? 7 : b.dayIndex;
      return aIndex - bIndex;
    });
  }

  /**
   * Calculate drawdown over time
   */
  static async calculateDrawdownOverTime(
    userId: string,
    assetType?: AssetType,
    days?: number
  ): Promise<Array<{ date: string; drawdown: number; peak: number; current: number; portfolioBalance: number; peakBalance: number }>> {
    // Get P&L over time data
    const plData = await this.calculatePLOverTime(userId, assetType, days);

    if (plData.length === 0) {
      return [];
    }

    // Fetch starting capital from deposits
    const cashTransactions = await CashTransactionRepository.getByUserId(userId);
    const depositCodes = ['DEPOSIT', 'ACH', 'DCF', 'RTP', 'DEP'];
    const startingCapital = cashTransactions
      .filter((tx) => depositCodes.includes(tx.transaction_code || ''))
      .filter((tx) => (tx.amount || 0) > 0)
      .reduce((sum, tx) => sum + (tx.amount || 0), 0);

    // If no deposits found, log warning and return empty array
    if (startingCapital === 0) {
      console.warn('No deposits found for user, cannot calculate meaningful drawdown');
      return [];
    }

    // Calculate drawdown based on portfolio balance (capital + P&L)
    let peakBalance = startingCapital;
    const result = plData.map((day) => {
      const portfolioBalance = startingCapital + day.cumulativePL;

      // Update peak if current balance exceeds it
      if (portfolioBalance > peakBalance) {
        peakBalance = portfolioBalance;
      }

      // Calculate drawdown as negative percentage when below peak
      // 0% when at all-time high, negative when below peak
      const drawdown = peakBalance > 0
        ? ((portfolioBalance - peakBalance) / peakBalance) * 100
        : 0;

      return {
        date: day.date,
        drawdown,
        peak: day.cumulativePL, // Keep for backward compatibility
        current: day.cumulativePL, // Keep for backward compatibility
        portfolioBalance,
        peakBalance,
      };
    });

    return result;
  }

  /**
   * Calculate options performance by type (Call vs Put)
   */
  static async calculateOptionsByType(
    userId: string,
    dateRange?: { startDate: string; endDate: string }
  ): Promise<{
    call: { pl: number; winRate: number; totalTrades: number; winningTrades: number; losingTrades: number };
    put: { pl: number; winRate: number; totalTrades: number; winningTrades: number; losingTrades: number };
  }> {
    const trades = await this.getNormalizedTrades(userId);
    const dateFilteredTrades = this.filterTradesByDateRange(trades, undefined, dateRange);
    const optionTrades = dateFilteredTrades.filter(
      (trade) => trade.assetType === 'option' && this.isRealizedTrade(trade)
    );

    const getTradeOptionType = (trade: NormalizedTrade): 'call' | 'put' | null => {
      const optionLegs = trade.legs.filter((leg) => leg.asset_type === 'option');
      if (optionLegs.length === 0) {
        return null;
      }
      const uniqueTypes = Array.from(
        new Set(optionLegs.map((leg) => leg.option_type).filter(Boolean) as Array<'call' | 'put'>)
      );
      return uniqueTypes.length === 1 ? uniqueTypes[0] : null;
    };

    const callTrades = optionTrades.filter((trade) => getTradeOptionType(trade) === 'call');
    const putTrades = optionTrades.filter((trade) => getTradeOptionType(trade) === 'put');

    const buildMetrics = (tradeSet: NormalizedTrade[]) => {
      const pl = tradeSet.reduce((sum, trade) => sum + trade.realizedPL, 0);
      const winning = tradeSet.filter((trade) => trade.realizedPL > 0);
      const losing = tradeSet.filter((trade) => trade.realizedPL < 0);
      const winRate = tradeSet.length > 0 ? (winning.length / tradeSet.length) * 100 : 0;
      return {
        pl,
        winRate,
        totalTrades: tradeSet.length,
        winningTrades: winning.length,
        losingTrades: losing.length,
      };
    };

    return {
      call: buildMetrics(callTrades),
      put: buildMetrics(putTrades),
    };
  }

  /**
   * Calculate options expiration status (expired vs closed)
   */
  static async calculateExpirationStatus(
    userId: string,
    dateRange?: { startDate: string; endDate: string }
  ): Promise<{
    expired: { pl: number; winRate: number; totalTrades: number; winningTrades: number; losingTrades: number };
    closed: { pl: number; winRate: number; totalTrades: number; winningTrades: number; losingTrades: number };
  }> {
    const trades = await this.getNormalizedTrades(userId);
    const dateFilteredTrades = this.filterTradesByDateRange(trades, undefined, dateRange);
    const optionTrades = dateFilteredTrades.filter(
      (trade) => trade.assetType === 'option' && trade.expirationDate && this.isRealizedTrade(trade)
    );

    const expiredTrades: NormalizedTrade[] = [];
    const closedTrades: NormalizedTrade[] = [];

    optionTrades.forEach((trade) => {
      const expirationDate = this.getTradeExpirationDate(trade);
      const closedDate = this.getTradeClosedDate(trade);
      if (!expirationDate || !closedDate) {
        return;
      }
      // Normalize both dates to midnight for comparison
      const expDateMidnight = new Date(expirationDate.getFullYear(), expirationDate.getMonth(), expirationDate.getDate());
      const closedDateMidnight = new Date(closedDate.getFullYear(), closedDate.getMonth(), closedDate.getDate());

      const legsExpired = trade.legs.some((leg) => leg.status === 'expired');
      // A trade is expired if legs are explicitly expired OR if closed AFTER expiration date
      // Note: We now use > instead of >= so positions closed ON the expiration date
      // are only marked as expired if they have an explicit 'expired' status
      const isExpired = legsExpired || closedDateMidnight > expDateMidnight;
      if (isExpired) {
        expiredTrades.push(trade);
      } else {
        closedTrades.push(trade);
      }
    });

    const buildMetrics = (tradeSet: NormalizedTrade[]) => {
      const pl = tradeSet.reduce((sum, trade) => sum + trade.realizedPL, 0);
      const winning = tradeSet.filter((trade) => trade.realizedPL > 0);
      const losing = tradeSet.filter((trade) => trade.realizedPL < 0);
      const winRate = tradeSet.length > 0 ? (winning.length / tradeSet.length) * 100 : 0;
      return {
        pl,
        winRate,
        totalTrades: tradeSet.length,
        winningTrades: winning.length,
        losingTrades: losing.length,
      };
    };

    return {
      expired: buildMetrics(expiredTrades),
      closed: buildMetrics(closedTrades),
    };
  }

  /**
   * Calculate options performance by days to expiration
   */
  static async calculateDaysToExpiration(
    userId: string,
    dateRange?: { startDate: string; endDate: string }
  ): Promise<Array<{ dteBucket: string; pl: number; winRate: number; totalTrades: number; winningTrades: number; losingTrades: number }>> {
    const MS_PER_DAY = 1000 * 60 * 60 * 24;
    const getLocalMidnight = (date: Date) =>
      new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

    // Group by DTE bucket
    const bucketMap = new Map<string, NormalizedTrade[]>();

    const trades = await this.getNormalizedTrades(userId);
    const dateFilteredTrades = this.filterTradesByDateRange(trades, undefined, dateRange);
    dateFilteredTrades
      .filter(
        (trade) =>
          trade.assetType === 'option' && trade.expirationDate && this.isRealizedTrade(trade)
      )
      .forEach((trade) => {
        const expirationDate = this.getTradeExpirationDate(trade);
        const openedDate = this.getTradeOpenedDate(trade);
        if (!expirationDate || !openedDate) {
          return;
        }
        const normalizedExpiration = getLocalMidnight(expirationDate);
        const normalizedOpened = getLocalMidnight(openedDate);
        const dayDiff = (normalizedExpiration - normalizedOpened) / MS_PER_DAY;
        const daysToExp = Math.max(0, Math.round(dayDiff));

        // Cap at 30 days, group everything else as "30+"
        const bucket = daysToExp <= 30 ? `${daysToExp}` : '30+';

        if (!bucketMap.has(bucket)) {
          bucketMap.set(bucket, []);
        }
        bucketMap.get(bucket)!.push(trade);
      });

    // Calculate metrics per bucket
    const result = Array.from(bucketMap.entries()).map(([bucket, tradesInBucket]) => {
      const winningTrades = tradesInBucket.filter((trade) => trade.realizedPL > 0);
      const losingTrades = tradesInBucket.filter((trade) => trade.realizedPL < 0);
      const pl = tradesInBucket.reduce((sum, trade) => sum + trade.realizedPL, 0);
      const winRate = tradesInBucket.length > 0 ? (winningTrades.length / tradesInBucket.length) * 100 : 0;

      return {
        dteBucket: bucket,
        pl,
        winRate,
        totalTrades: tradesInBucket.length,
        winningTrades: winningTrades.length,
        losingTrades: losingTrades.length,
      };
    });

    // Sort numerically by DTE value, with "30+" at the end
    return result.sort((a, b) => {
      if (a.dteBucket === '30+') return 1;
      if (b.dteBucket === '30+') return -1;
      return parseInt(a.dteBucket) - parseInt(b.dteBucket);
    });
  }

  /**
   * Calculate strategy performance
   */
  static async calculateStrategyPerformance(
    userId: string,
    dateRange?: { startDate: string; endDate: string }
  ): Promise<Array<{ strategyType: string; pl: number; winRate: number; profitOnRisk: number; totalTrades: number; winningTrades: number; losingTrades: number }>> {
    const [allStrategies, allPositions, allTrades] = await Promise.all([
      StrategyRepository.getAll(userId),
      PositionRepository.getAll(userId),
      this.getNormalizedTrades(userId),
    ]);

    // Filter trades by date range to get valid strategy IDs and position IDs
    const dateFilteredTrades = this.filterTradesByDateRange(allTrades, undefined, dateRange);
    const validStrategyIds = new Set(
      dateFilteredTrades
        .filter((trade) => trade.assetType === 'option' && trade.strategyId && this.isRealizedTrade(trade))
        .map((trade) => trade.strategyId!)
    );
    const validPositionIds = new Set(
      dateFilteredTrades
        .filter((trade) => trade.assetType === 'option' && !trade.strategyId && this.isRealizedTrade(trade))
        .flatMap((trade) => trade.legs.map((leg) => leg.id).filter(Boolean))
    );

    const strategyLookup = new Map(allStrategies.map((strategy) => [strategy.id, strategy]));
    const optionPositions = allPositions.filter((position) => position.asset_type === 'option');

    const positionsByStrategyId = new Map<string, Position[]>();
    optionPositions.forEach((position) => {
      if (!position.strategy_id) return;
      if (!positionsByStrategyId.has(position.strategy_id)) {
        positionsByStrategyId.set(position.strategy_id, []);
      }
      positionsByStrategyId.get(position.strategy_id)!.push(position);
    });

    const CLOSED_STATUSES = new Set(['closed', 'assigned', 'expired', 'exercised']);
    const isLegClosed = (position: Position) =>
      CLOSED_STATUSES.has(position.status) || Math.abs(position.current_quantity || 0) === 0;

    type StrategyAggregate = {
      totalPL: number;
      totalRisk: number;
      totalTrades: number;
      winningTrades: number;
      losingTrades: number;
    };

    const aggregates = new Map<string, StrategyAggregate>();
    const recordAggregate = (strategyType: string, pl: number, risk: number) => {
      if (!aggregates.has(strategyType)) {
        aggregates.set(strategyType, {
          totalPL: 0,
          totalRisk: 0,
          totalTrades: 0,
          winningTrades: 0,
          losingTrades: 0,
        });
      }
      const aggregate = aggregates.get(strategyType)!;
      aggregate.totalPL += pl;
      aggregate.totalRisk += Math.max(0, risk);
      aggregate.totalTrades += 1;
      if (pl > 0) {
        aggregate.winningTrades += 1;
      } else if (pl < 0) {
        aggregate.losingTrades += 1;
      }
    };

    // Aggregate real strategies by checking whether all legs are fully closed via positions data
    positionsByStrategyId.forEach((positions, strategyId) => {
      if (!positions.every(isLegClosed)) {
        return;
      }

      // Filter by date range if provided
      if (dateRange && validStrategyIds.size > 0 && !validStrategyIds.has(strategyId)) {
        return;
      }

      const strategy = strategyLookup.get(strategyId);
      const strategyType = strategy?.strategy_type ?? 'single_option';
      const totalPL = positions.reduce((sum, position) => sum + (position.realized_pl || 0), 0);
      const totalRisk = strategy
        ? Math.abs(strategy.max_risk ?? strategy.total_opening_cost ?? 0)
        : positions.reduce((sum, position) => sum + Math.abs(position.total_cost_basis || 0), 0);

      recordAggregate(strategyType, totalPL, totalRisk);
    });

    // Fallback: closed single option trades that never linked to a strategy
    optionPositions
      .filter((position) => {
        if (position.strategy_id || !isLegClosed(position)) return false;
        // Filter by date range if provided
        if (dateRange && validPositionIds.size > 0 && !validPositionIds.has(position.id)) {
          return false;
        }
        return true;
      })
      .forEach((position) => {
        const pl = position.realized_pl || 0;
        const risk = Math.abs(position.total_cost_basis || 0);
        recordAggregate('single_option', pl, risk);
      });

    const result = Array.from(aggregates.entries())
      .map(([strategyType, aggregate]) => {
        const { totalTrades, totalPL, totalRisk, winningTrades, losingTrades } = aggregate;
        return {
          strategyType,
          pl: totalPL,
          winRate: totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0,
          profitOnRisk: totalRisk > 0 ? (totalPL / totalRisk) * 100 : 0,
          totalTrades,
          winningTrades,
          losingTrades,
        };
      })
      .sort((a, b) => b.totalTrades - a.totalTrades);

    return result;
  }

  /**
   * Calculate entry time performance (for Options and Futures)
   */
  static async calculateEntryTimePerformance(
    userId: string,
    assetType: 'option' | 'futures',
    dateRange?: { startDate: string; endDate: string }
  ): Promise<Array<{ timeBucket: string; pl: number; winRate: number; totalTrades: number; winningTrades: number; losingTrades: number }>> {
    const trades = await this.getNormalizedTrades(userId);
    const dateFilteredTrades = this.filterTradesByDateRange(trades, undefined, dateRange);
    const filteredTrades = dateFilteredTrades.filter(
      (trade) => trade.assetType === assetType && this.isRealizedTrade(trade)
    );

    const timeMap = new Map<string, NormalizedTrade[]>();

    filteredTrades.forEach((trade) => {
      const openedDate = this.getTradeOpenedDate(trade);
      if (!openedDate) {
        return;
      }
      const hours = openedDate.getHours();
      const minutes = openedDate.getMinutes();
      const roundedMinutes = Math.floor(minutes / 5) * 5;
      const timeBucket = `${String(hours).padStart(2, '0')}:${String(roundedMinutes).padStart(2, '0')}`;

      if (!timeMap.has(timeBucket)) {
        timeMap.set(timeBucket, []);
      }
      timeMap.get(timeBucket)!.push(trade);
    });

    const result = Array.from(timeMap.entries())
      .map(([timeBucket, bucketTrades]) => {
        const winningTrades = bucketTrades.filter((trade) => trade.realizedPL > 0);
        const losingTrades = bucketTrades.filter((trade) => trade.realizedPL < 0);
        const pl = bucketTrades.reduce((sum, trade) => sum + trade.realizedPL, 0);
        const winRate = bucketTrades.length > 0 ? (winningTrades.length / bucketTrades.length) * 100 : 0;

        return {
          timeBucket,
          pl,
          winRate,
          totalTrades: bucketTrades.length,
          winningTrades: winningTrades.length,
          losingTrades: losingTrades.length,
        };
      })
      .sort((a, b) => a.timeBucket.localeCompare(b.timeBucket));

    return result;
  }

  /**
   * Calculate entry time performance by strategy (for Options)
   */
  static async calculateEntryTimeByStrategy(
    userId: string,
    dateRange?: { startDate: string; endDate: string }
  ): Promise<Record<string, Array<{ timeBucket: string; pl: number; winRate: number; totalTrades: number; winningTrades: number; losingTrades: number }>>> {
    const trades = await this.getNormalizedTrades(userId);
    const dateFilteredTrades = this.filterTradesByDateRange(trades, undefined, dateRange);
    const optionTrades = dateFilteredTrades.filter(
      (trade) => trade.assetType === 'option' && this.isRealizedTrade(trade)
    );

    const strategyTimeMap = new Map<string, Map<string, NormalizedTrade[]>>();

    optionTrades.forEach((trade) => {
      const openedDate = this.getTradeOpenedDate(trade);
      if (!openedDate) {
        return;
      }
      const strategyType = trade.strategyType || 'single_option';
      const hours = openedDate.getHours();
      const minutes = openedDate.getMinutes();
      const roundedMinutes = Math.floor(minutes / 5) * 5;
      const timeBucket = `${String(hours).padStart(2, '0')}:${String(roundedMinutes).padStart(2, '0')}`;

      if (!strategyTimeMap.has(strategyType)) {
        strategyTimeMap.set(strategyType, new Map());
      }
      const timeMap = strategyTimeMap.get(strategyType)!;

      if (!timeMap.has(timeBucket)) {
        timeMap.set(timeBucket, []);
      }
      timeMap.get(timeBucket)!.push(trade);
    });

    const result: Record<string, Array<{ timeBucket: string; pl: number; winRate: number; totalTrades: number; winningTrades: number; losingTrades: number }>> = {};

    strategyTimeMap.forEach((timeMap, strategyType) => {
      const strategyData = Array.from(timeMap.entries())
        .map(([timeBucket, bucketTrades]) => {
          const winningTrades = bucketTrades.filter((trade) => trade.realizedPL > 0);
          const losingTrades = bucketTrades.filter((trade) => trade.realizedPL < 0);
          const pl = bucketTrades.reduce((sum, trade) => sum + trade.realizedPL, 0);
          const winRate = bucketTrades.length > 0 ? (winningTrades.length / bucketTrades.length) * 100 : 0;

          return {
            timeBucket,
            pl,
            winRate,
            totalTrades: bucketTrades.length,
            winningTrades: winningTrades.length,
            losingTrades: losingTrades.length,
          };
        })
        .sort((a, b) => a.timeBucket.localeCompare(b.timeBucket));

      result[strategyType] = strategyData;
    });

    return result;
  }

  /**
   * Calculate balance over time from portfolio snapshots
   */
  static async calculateBalanceOverTime(
    userId: string,
    assetType?: AssetType,
    days?: number
  ): Promise<Array<{ date: string; balance: number; netCashFlow: number }>> {
    const allSnapshots = await PortfolioSnapshotRepository.getAll(userId);

    if (allSnapshots.length === 0) {
      return [];
    }

    // Filter by date range if specified
    let filteredSnapshots = allSnapshots;
    if (days) {
      const latestDate = new Date(allSnapshots[allSnapshots.length - 1].snapshot_date);
      const startDate = new Date(latestDate);
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = startDate.toISOString().split('T')[0];

      filteredSnapshots = allSnapshots.filter(
        (s) => s.snapshot_date >= startDateStr
      );
    }

    // If asset type is specified, we need to filter by positions breakdown
    // For now, we'll use total portfolio value, but could filter by asset type breakdown
    const result = filteredSnapshots.map((s) => {
      let balance = s.portfolio_value;

      // If asset type specified, use breakdown value
      if (assetType) {
        const breakdown = s.positions_breakdown;
        if (assetType === 'stock') {
          balance = breakdown.stocks.value + s.net_cash_flow;
        } else if (assetType === 'option') {
          balance = breakdown.options.value + s.net_cash_flow;
        } else if (assetType === 'crypto') {
          balance = breakdown.crypto.value + s.net_cash_flow;
        } else if (assetType === 'futures') {
          balance = breakdown.futures.value + s.net_cash_flow;
        }
      }

      return {
        date: s.snapshot_date,
        balance,
        netCashFlow: s.net_cash_flow,
      };
    });

    return result;
  }

  /**
   * Calculate ROI % over time from portfolio snapshots
   */
  static async calculateROIOverTime(
    userId: string,
    assetType?: AssetType,
    days?: number
  ): Promise<Array<{ date: string; roi: number; portfolioValue: number; netCashFlow: number }>> {
    const allSnapshots = await PortfolioSnapshotRepository.getAll(userId);

    if (allSnapshots.length === 0) {
      return [];
    }

    // Filter by date range if specified
    let filteredSnapshots = allSnapshots;
    if (days) {
      const latestDate = new Date(allSnapshots[allSnapshots.length - 1].snapshot_date);
      const startDate = new Date(latestDate);
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = startDate.toISOString().split('T')[0];

      filteredSnapshots = allSnapshots.filter(
        (s) => s.snapshot_date >= startDateStr
      );
    }

    // Get initial net cash flow (first snapshot or earliest)
    const sortedSnapshots = [...filteredSnapshots].sort(
      (a, b) => a.snapshot_date.localeCompare(b.snapshot_date)
    );

    // For asset-specific ROI, calculate based on all positions (open + closed)
    // and get total realized P&L and total cost basis
    // For overall portfolio, use deposits as before
    let investmentBase = 0;
    let totalRealizedPL = 0;
    let totalCostBasis = 0; // Total amount invested (for calculating ROI when positions are closed)

    if (assetType) {
      // Get all positions for this asset type
      const allPositionsForAssetType = await PositionRepository.getAll(userId, { asset_type: assetType });

      // Calculate total cost basis (all positions, open and closed)
      totalCostBasis = allPositionsForAssetType.reduce((sum, position) => {
        return sum + Math.abs(position.total_cost_basis || 0);
      }, 0);

      // Investment base = cost basis of OPEN positions (for current unrealized P&L calc)
      const openPositions = allPositionsForAssetType.filter(p => p.status === 'open');
      investmentBase = openPositions.reduce((sum, position) => {
        return sum + Math.abs(position.total_cost_basis || 0);
      }, 0);

      // Get total realized P&L from CLOSED positions (that aren't part of a strategy)
      const closedPositions = allPositionsForAssetType.filter(p =>
        (p.status === 'closed' || p.status === 'expired' || p.status === 'assigned' || p.status === 'exercised') &&
        !p.strategy_id // Exclude positions that are part of a strategy to avoid double-counting
      );
      totalRealizedPL = closedPositions.reduce((sum, position) => {
        return sum + (position.realized_pl || 0);
      }, 0);

      // Get realized P&L from closed strategies
      // Note: Strategies are typically for options, but we check positions to be sure
      const allStrategies = await StrategyRepository.getAll(userId);
      const closedStrategies = allStrategies.filter(s =>
        s.status === 'closed' || s.status === 'expired' || s.status === 'assigned'
      );

      // For each closed strategy, check if its positions match the asset type
      for (const strategy of closedStrategies) {
        const strategyPositions = allPositionsForAssetType.filter(p => p.strategy_id === strategy.id);
        if (strategyPositions.length > 0) {
          // This strategy has positions of the requested asset type
          totalRealizedPL += strategy.realized_pl || 0;
        }
      }
    } else {
      // For overall portfolio, use net cash flow (deposits - withdrawals) as investment base
      const cashTransactions = await CashTransactionRepository.getByUserId(userId);
      const depositCodes = ['DEPOSIT', 'ACH', 'DCF', 'RTP', 'DEP'];
      const withdrawalCodes = ['WITHDRAWAL', 'WITHDRAW', 'WDR', 'ACH_OUT'];

      const totalDeposits = cashTransactions
        .filter((tx) => depositCodes.includes(tx.transaction_code || ''))
        .filter((tx) => (tx.amount || 0) > 0)
        .reduce((sum, tx) => sum + (tx.amount || 0), 0);

      const totalWithdrawals = cashTransactions
        .filter((tx) => withdrawalCodes.includes(tx.transaction_code || ''))
        .filter((tx) => (tx.amount || 0) < 0) // Withdrawals are negative
        .reduce((sum, tx) => sum + Math.abs(tx.amount || 0), 0);

      // Calculate total realized P&L from all closed positions and strategies
      const allPositions = await PositionRepository.getAll(userId);
      const closedPositions = allPositions.filter(p =>
        (p.status === 'closed' || p.status === 'expired' || p.status === 'assigned' || p.status === 'exercised') &&
        !p.strategy_id // Exclude positions that are part of a strategy to avoid double-counting
      );
      totalRealizedPL = closedPositions.reduce((sum, position) => {
        return sum + (position.realized_pl || 0);
      }, 0);

      // Get realized P&L from closed strategies
      const allStrategies = await StrategyRepository.getAll(userId);
      const closedStrategies = allStrategies.filter(s =>
        s.status === 'closed' || s.status === 'expired' || s.status === 'assigned'
      );
      totalRealizedPL += closedStrategies.reduce((sum, strategy) => {
        return sum + (strategy.realized_pl || 0);
      }, 0);

      // Use initial investment (deposits only) as the investment base
      // This matches the stat card calculation exactly
      investmentBase = totalDeposits;
    }

    // For the latest snapshot, get normalized trades to match statcard calculation
    const latestSnapshotDate = sortedSnapshots.length > 0 ? sortedSnapshots[sortedSnapshots.length - 1].snapshot_date : null;
    let latestRealizedPL = 0;
    let latestUnrealizedPL = 0;
    
    if (latestSnapshotDate && !assetType) {
      const allTrades = await this.getNormalizedTrades(userId);
      const realizedTrades = allTrades.filter(t => this.isRealizedTrade(t));
      const openTrades = allTrades.filter(t => t.status !== 'closed');
      
      latestRealizedPL = realizedTrades.reduce((sum, t) => sum + t.realizedPL, 0);
      latestUnrealizedPL = openTrades.reduce((sum, t) => sum + t.unrealizedPL, 0);
    }

    const result = sortedSnapshots.map((s) => {
      let portfolioValue = s.portfolio_value;

      // If asset type specified, use breakdown value WITHOUT net_cash_flow
      if (assetType) {
        const breakdown = s.positions_breakdown;
        if (assetType === 'stock') {
          portfolioValue = breakdown.stocks.value;
        } else if (assetType === 'option') {
          portfolioValue = breakdown.options.value;
        } else if (assetType === 'crypto') {
          portfolioValue = breakdown.crypto.value;
        } else if (assetType === 'futures') {
          portfolioValue = breakdown.futures.value;
        }
      }

      // Calculate ROI
      // For asset-specific: ROI = (realizedPL + unrealizedPL) / totalCostBasis
      // For overall portfolio: ROI = Total P&L / Initial Investment * 100

      let roi = 0;
      if (assetType) {
        if (totalCostBasis > 0) {
          // ROI = (realized P&L from closed + unrealized P&L from open) / total cost basis
          const unrealizedPL = investmentBase > 0 ? (portfolioValue - investmentBase) : 0;
          const totalPL = totalRealizedPL + unrealizedPL;
          roi = (totalPL / Math.abs(totalCostBasis)) * 100;
        }
      } else {
        // For overall portfolio: ROI = (Realized P&L + Unrealized P&L) / Initial Investment * 100
        // This MUST match the statcard calculation exactly
        // For the latest snapshot, use the same method as statcard (normalized trades)
        // For historical snapshots, use portfolio value (which includes all P&L up to that date)
        
        if (investmentBase !== 0) {
          // Check if this is the latest snapshot
          const isLatestSnapshot = s.snapshot_date === latestSnapshotDate;
          
          if (isLatestSnapshot && latestSnapshotDate) {
            // For latest snapshot, use normalized trades to match statcard exactly
            const totalPL = latestRealizedPL + latestUnrealizedPL;
            roi = (totalPL / Math.abs(investmentBase)) * 100;
          } else {
            // For historical snapshots, use the snapshot's stored realized and unrealized PL
            // This matches the same formula as statcard: (Realized PL + Unrealized PL) / Deposits
            const snapshotRealizedPL = s.total_realized_pl || 0;
            const snapshotUnrealizedPL = s.total_unrealized_pl || 0;
            const totalPL = snapshotRealizedPL + snapshotUnrealizedPL;
            roi = (totalPL / Math.abs(investmentBase)) * 100;
          }
        }
      }

      return {
        date: s.snapshot_date,
        roi,
        portfolioValue,
        netCashFlow: s.net_cash_flow,
      };
    });

    return result;
  }

  /**
   * Calculate daily performance for calendar heatmap
   * Returns all data (no year filter) so calendar can navigate months
   */
  static async calculateDailyPerformanceCalendar(
    userId: string,
    assetType?: AssetType,
    dateRange?: { startDate: string; endDate: string }
  ): Promise<Array<{ date: string; pl: number; trades: number }>> {
    const trades = await this.getNormalizedTrades(userId);
    const dateFilteredTrades = this.filterTradesByDateRange(trades, undefined, dateRange);
    const realizedTrades = this.filterTradesByAssetType(dateFilteredTrades, assetType).filter((trade) =>
      this.isRealizedTrade(trade)
    );

    const closingTransactionIdSet = new Set<string>();
    realizedTrades.forEach((trade) => {
      trade.legs.forEach((leg) => {
        (leg.closing_transaction_ids || []).forEach((id) => {
          if (id) {
            closingTransactionIdSet.add(id);
          }
        });
      });
    });
    const closingTransactionDates =
      closingTransactionIdSet.size > 0
        ? await TransactionRepository.getActivityDates(Array.from(closingTransactionIdSet))
        : {};

    const dateMap = new Map<string, { pl: number; count: number }>();

    realizedTrades.forEach((trade) => {
      const closedDate = this.getTradeClosedDate(trade);
      
      let dateKey: string | null = null;
      
      // For strategies that have been manually corrected with fix-strategy-dates.sql,
      // prioritize the strategy's closed_at date over transaction dates
      if (trade.strategyId && trade.closedAt) {
        // Strategy with a closed_at date - use it directly (it's been corrected)
        dateKey = this.formatLocalDate(new Date(trade.closedAt));
      } else {
        // For individual positions or strategies without closed_at, use transaction dates
        const legClosingDates = trade.legs
          .flatMap((leg) => leg.closing_transaction_ids || [])
          .map((id) => (id ? closingTransactionDates[id] : undefined))
          .filter((date): date is string => Boolean(date));

        const latestLegDate = legClosingDates.length > 0 ? this.getLatestDate(legClosingDates) : null;
        dateKey = latestLegDate || (closedDate ? this.formatLocalDate(closedDate) : null);
      }

      if (!dateKey) {
        return;
      }
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, { pl: 0, count: 0 });
      }
      const entry = dateMap.get(dateKey)!;
      entry.pl += trade.realizedPL;
      entry.count += 1;
    });

    const result = Array.from(dateMap.entries())
      .map(([date, data]) => ({
        date,
        pl: data.pl,
        trades: data.count,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return result;
  }

  /**
   * Calculate correct snapshot values for a given date
   * This helps fix incorrect historical snapshots
   */
  static async calculateSnapshotValuesForDate(
    userId: string,
    snapshotDate: string
  ): Promise<{
    totalRealizedPL: number;
    totalUnrealizedPL: number;
    portfolioValue: number;
    roi: number;
  }> {
    // Get all normalized trades
    const allTrades = await this.getNormalizedTrades(userId);
    
    // Filter trades closed on or before the snapshot date
    const snapshotDateObj = new Date(snapshotDate);
    snapshotDateObj.setHours(23, 59, 59, 999); // End of day
    
    const closedTradesUpToDate = allTrades.filter((trade) => {
      if (!this.isRealizedTrade(trade)) return false;
      const closedDate = this.getTradeClosedDate(trade);
      return closedDate && closedDate <= snapshotDateObj;
    });
    
    // Calculate realized PL from closed trades
    const totalRealizedPL = closedTradesUpToDate.reduce((sum, trade) => sum + trade.realizedPL, 0);
    
    // For unrealized PL, we need to get positions that were open on that date
    // This is tricky because we don't have historical position states
    // So we'll use the snapshot's portfolio_value to derive it
    const snapshot = await PortfolioSnapshotRepository.getByDate(userId, snapshotDate);
    const cashTransactions = await CashTransactionRepository.getByUserId(userId);
    const depositCodes = ['DEPOSIT', 'ACH', 'DCF', 'RTP', 'DEP'];
    const totalDeposits = cashTransactions
      .filter((tx) => depositCodes.includes(tx.transaction_code || ''))
      .filter((tx) => (tx.amount || 0) > 0)
      .reduce((sum, tx) => sum + (tx.amount || 0), 0);
    
    // Portfolio Value = Deposits + Realized PL + Unrealized PL
    // So: Unrealized PL = Portfolio Value - Deposits - Realized PL
    const portfolioValue = snapshot?.portfolio_value || 0;
    const totalUnrealizedPL = portfolioValue - totalDeposits - totalRealizedPL;
    
    // Calculate ROI
    const totalPL = totalRealizedPL + totalUnrealizedPL;
    const roi = totalDeposits > 0 ? (totalPL / Math.abs(totalDeposits)) * 100 : 0;
    
    return {
      totalRealizedPL,
      totalUnrealizedPL,
      portfolioValue,
      roi,
    };
  }

  /**
   * Format a Date object as local date string (YYYY-MM-DD)
   */
  /**
   * Format a Date object as ISO date string (YYYY-MM-DD)
   * Uses UTC components to ensure consistency across timezones
   */
  private static formatLocalDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Get positions closed on a specific date
   * Note: For multi-leg strategies, this returns individual positions.
   * To see strategies grouped, the UI should filter positions by strategy_id.
   */
  static async getPositionsByClosedDate(
    userId: string,
    date: string,
    assetType?: AssetType
  ): Promise<Position[]> {
    // Optimized fetch: Only get positions relevant to this date
    // Note: This relies on the date string being YYYY-MM-DD.
    const dateStr = date.split('T')[0];
    const allPositions = await PositionRepository.getByActivityDate(userId, dateStr);

    // Filter by asset type if specified
    const filteredPositions = assetType
      ? allPositions.filter((p) => p.asset_type === assetType)
      : allPositions;

    // Get positions closed on this date
    // dateStr is already defined above

    // Helper to get transaction dates for accurate closure dates
    const closingTransactionIdSet = new Set<string>();
    filteredPositions.forEach((p) => {
      (p.closing_transaction_ids || []).forEach((id) => {
        if (id) {
          closingTransactionIdSet.add(id);
        }
      });
    });

    const closingTransactionDates =
      closingTransactionIdSet.size > 0
        ? await TransactionRepository.getActivityDates(Array.from(closingTransactionIdSet))
        : {};

    const positionsClosedOnDate = filteredPositions.filter((p) => {
      const dateKey = this.determinePositionDate(p, closingTransactionDates);
      return dateKey === dateStr;
    });

    // Also include partially closed positions (with realized P&L) that were updated on this date
    const partiallyClosedOnDate = filteredPositions.filter((p) => {
      // Exclude if already included
      if (positionsClosedOnDate.includes(p)) return false;

      // If position is fully closed, it should only appear on its closed date (handled above)
      // We don't want 'updated_at' to drag it to a different day
      if (p.status === 'closed' || p.status === 'expired' || p.status === 'assigned' || p.status === 'exercised') {
        return false;
      }

      if (p.status !== 'open' && p.status !== 'partial') return false; // strict check
      if (!p.realized_pl || p.realized_pl === 0) return false;
      if (p.current_quantity >= p.opening_quantity) return false;

      const updatedDate = this.formatLocalDate(new Date(p.updated_at));
      return updatedDate === dateStr;
    });

    // Get all strategies and check if any were closed on this date
    // We need to include positions that are part of strategies closed on this date
    const allStrategies = await StrategyRepository.getAll(userId);
    console.log('[getPositionsByClosedDate] All strategies:', allStrategies.length);
    const strategiesClosedOnDate = allStrategies.filter((strategy) => {
      if (!strategy.closed_at) return false;
      const strategyClosedDate = this.formatLocalDate(new Date(strategy.closed_at));
      console.log('[getPositionsByClosedDate] Strategy closed date:', strategyClosedDate, 'vs', dateStr, strategy.id);
      return strategyClosedDate === dateStr;
    });
    console.log('[getPositionsByClosedDate] Strategies closed on', dateStr, ':', strategiesClosedOnDate.length);

    // Get all position IDs that are part of strategies closed on this date
    const strategyPositionIds = new Set<string>();
    strategiesClosedOnDate.forEach((strategy) => {
      strategy.legs.forEach((leg) => {
        if (leg.position_id) {
          strategyPositionIds.add(leg.position_id);
        }
      });
    });

    // Fetch positions that are part of strategies closed on this date
    const strategyPositions = await Promise.all(
      Array.from(strategyPositionIds).map((id) => PositionRepository.getById(id))
    );
    const validStrategyPositions = strategyPositions.filter((p): p is Position => p !== null);

    // Filter by asset type if specified
    const filteredStrategyPositions = assetType
      ? validStrategyPositions.filter((p) => p.asset_type === assetType)
      : validStrategyPositions;

    // Combine all positions, removing duplicates
    const allClosedPositions = [...positionsClosedOnDate, ...partiallyClosedOnDate, ...filteredStrategyPositions];
    const uniquePositions = Array.from(new Map(allClosedPositions.map((p) => [p.id, p])).values());

    return uniquePositions;
  }

  /**
   * Helper to determine the effective date for a position based on transaction or close date
   */
  private static determinePositionDate(p: Position, closingTransactionDates: Record<string, string>): string | null {
    const legClosingDates = (p.closing_transaction_ids || [])
      .map((id) => (id ? closingTransactionDates[id] : undefined))
      .filter((d): d is string => Boolean(d));

    const latestLegDate = legClosingDates.length > 0 ? this.getLatestDate(legClosingDates) : null;

    if (latestLegDate) {
      return latestLegDate.split('T')[0];
    }

    if (!p.closed_at) return null;
    return this.formatLocalDate(new Date(p.closed_at));
  }

  /**
   * Calculate holding period distribution for stocks/crypto
   */
  static async calculateHoldingPeriodDistribution(
    userId: string,
    assetType: 'stock' | 'crypto',
    dateRange?: { startDate: string; endDate: string }
  ): Promise<Array<{ period: string; pl: number; winRate: number; totalTrades: number; winningTrades: number; losingTrades: number }>> {
    const trades = await this.getNormalizedTrades(userId);
    const dateFilteredTrades = this.filterTradesByDateRange(trades, undefined, dateRange);
    const filteredTrades = dateFilteredTrades.filter(
      (trade) => trade.assetType === assetType && this.isRealizedTrade(trade)
    );

    const periodMap = new Map<string, NormalizedTrade[]>();

    filteredTrades.forEach((trade) => {
      const openedDate = this.getTradeOpenedDate(trade);
      const closedDate = this.getTradeClosedDate(trade);
      if (!openedDate || !closedDate) {
        return;
      }
      const daysHeld = Math.ceil((closedDate.getTime() - openedDate.getTime()) / (1000 * 60 * 60 * 24));

      let period: string;
      if (daysHeld === 0) {
        period = '< 1 Day';
      } else if (daysHeld >= 1 && daysHeld <= 7) {
        period = '1-7 Days';
      } else if (daysHeld >= 8 && daysHeld <= 30) {
        period = '1-4 Weeks';
      } else if (daysHeld >= 31 && daysHeld <= 90) {
        period = '1-3 Months';
      } else {
        period = '3+ Months';
      }

      if (!periodMap.has(period)) {
        periodMap.set(period, []);
      }
      periodMap.get(period)!.push(trade);
    });

    const periodOrder = ['< 1 Day', '1-7 Days', '1-4 Weeks', '1-3 Months', '3+ Months'];
    const result = periodOrder
      .filter((period) => periodMap.has(period))
      .map((period) => {
        const bucketTrades = periodMap.get(period)!;
        const winningTrades = bucketTrades.filter((trade) => trade.realizedPL > 0);
        const losingTrades = bucketTrades.filter((trade) => trade.realizedPL < 0);
        const pl = bucketTrades.reduce((sum, trade) => sum + trade.realizedPL, 0);
        const winRate = bucketTrades.length > 0 ? (winningTrades.length / bucketTrades.length) * 100 : 0;

        return {
          period,
          pl,
          winRate,
          totalTrades: bucketTrades.length,
          winningTrades: winningTrades.length,
          losingTrades: losingTrades.length,
        };
      });

    return result;
  }

  /**
   * Calculate futures contract month performance
   */
  static async calculateFuturesContractMonthPerformance(
    userId: string,
    dateRange?: { startDate: string; endDate: string }
  ): Promise<Array<{ contractMonth: string; pl: number; winRate: number; totalTrades: number; winningTrades: number; losingTrades: number }>> {
    const trades = await this.getNormalizedTrades(userId);
    const dateFilteredTrades = this.filterTradesByDateRange(trades, undefined, dateRange);
    const futuresTrades = dateFilteredTrades.filter(
      (trade) => trade.assetType === 'futures' && this.isRealizedTrade(trade)
    );

    const monthMap = new Map<string, NormalizedTrade[]>();

    futuresTrades.forEach((trade) => {
      const contractMonth =
        trade.legs.find((leg) => leg.contract_month)?.contract_month || 'Unknown';
      if (!monthMap.has(contractMonth)) {
        monthMap.set(contractMonth, []);
      }
      monthMap.get(contractMonth)!.push(trade);
    });

    const result = Array.from(monthMap.entries())
      .map(([contractMonth, bucketTrades]) => {
        const winningTrades = bucketTrades.filter((trade) => trade.realizedPL > 0);
        const losingTrades = bucketTrades.filter((trade) => trade.realizedPL < 0);
        const pl = bucketTrades.reduce((sum, trade) => sum + trade.realizedPL, 0);
        const winRate = bucketTrades.length > 0 ? (winningTrades.length / bucketTrades.length) * 100 : 0;

        return {
          contractMonth,
          pl,
          winRate,
          totalTrades: bucketTrades.length,
          winningTrades: winningTrades.length,
          losingTrades: losingTrades.length,
        };
      })
      .sort((a, b) => a.contractMonth.localeCompare(b.contractMonth));

    return result;
  }

  /**
   * Calculate futures margin efficiency
   */
  static async calculateFuturesMarginEfficiency(
    userId: string,
    dateRange?: { startDate: string; endDate: string }
  ): Promise<Array<{ symbol: string; pl: number; marginUsed: number; marginEfficiency: number; totalTrades: number }>> {
    const trades = await this.getNormalizedTrades(userId);
    const dateFilteredTrades = this.filterTradesByDateRange(trades, undefined, dateRange);
    const futuresTrades = dateFilteredTrades.filter(
      (trade) => trade.assetType === 'futures' && this.isRealizedTrade(trade)
    );

    const symbolMap = new Map<string, { pl: number; marginUsed: number; count: number }>();

    futuresTrades.forEach((trade) => {
      const symbol = trade.symbol || 'Unknown';
      const marginUsed = trade.legs.reduce((sum, leg) => {
        const margin = leg.margin_requirement || 0;
        const quantity = Math.abs(leg.opening_quantity || 0);
        return sum + margin * quantity;
      }, 0);

      if (!symbolMap.has(symbol)) {
        symbolMap.set(symbol, { pl: 0, marginUsed: 0, count: 0 });
      }
      const symbolData = symbolMap.get(symbol)!;
      symbolData.pl += trade.realizedPL;
      symbolData.marginUsed += marginUsed;
      symbolData.count += 1;
    });

    const result = Array.from(symbolMap.entries())
      .map(([symbol, data]) => {
        const marginEfficiency = data.marginUsed > 0 ? (data.pl / data.marginUsed) * 100 : 0;
        return {
          symbol,
          pl: data.pl,
          marginUsed: data.marginUsed,
          marginEfficiency,
          totalTrades: data.count,
        };
      })
      .sort((a, b) => b.totalTrades - a.totalTrades);

    return result;
  }

  /**
   * Calculate crypto coin performance
   */
  static async calculateCryptoCoinPerformance(
    userId: string,
    dateRange?: { startDate: string; endDate: string }
  ): Promise<Array<{ coin: string; pl: number; winRate: number; totalTrades: number; winningTrades: number; losingTrades: number }>> {
    const trades = await this.getNormalizedTrades(userId);
    const dateFilteredTrades = this.filterTradesByDateRange(trades, undefined, dateRange);
    const cryptoTrades = dateFilteredTrades.filter(
      (trade) => trade.assetType === 'crypto' && this.isRealizedTrade(trade)
    );

    const coinMap = new Map<string, NormalizedTrade[]>();

    cryptoTrades.forEach((trade) => {
      const coin = trade.symbol || 'Unknown';
      if (!coinMap.has(coin)) {
        coinMap.set(coin, []);
      }
      coinMap.get(coin)!.push(trade);
    });

    const result = Array.from(coinMap.entries())
      .map(([coin, bucketTrades]) => {
        const winningTrades = bucketTrades.filter((trade) => trade.realizedPL > 0);
        const losingTrades = bucketTrades.filter((trade) => trade.realizedPL < 0);
        const pl = bucketTrades.reduce((sum, trade) => sum + trade.realizedPL, 0);
        const winRate = bucketTrades.length > 0 ? (winningTrades.length / bucketTrades.length) * 100 : 0;

        return {
          coin,
          pl,
          winRate,
          totalTrades: bucketTrades.length,
          winningTrades: winningTrades.length,
          losingTrades: losingTrades.length,
        };
      })
      .sort((a, b) => b.totalTrades - a.totalTrades);

    return result;
  }
}

