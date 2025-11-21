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
    positions.forEach((position) => {
      if (!position.strategy_id) {
        return;
      }
      if (!positionsByStrategyId.has(position.strategy_id)) {
        positionsByStrategyId.set(position.strategy_id, []);
      }
      positionsByStrategyId.get(position.strategy_id)!.push(position);
    });

    const usedPositionIds = new Set<string>();
    const trades: NormalizedTrade[] = [];

    positionsByStrategyId.forEach((groupPositions, strategyId) => {
      groupPositions.forEach((position) => usedPositionIds.add(position.id));
      trades.push(this.buildNormalizedTrade(groupPositions, strategyMap.get(strategyId)));
    });

    positions
      .filter((position) => !usedPositionIds.has(position.id))
      .forEach((position) => {
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
    const realizedPL = positions.reduce((sum, position) => sum + (position.realized_pl || 0), 0);
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
    return trade.status === 'closed' || trade.realizedPL !== 0;
  }

  private static filterTradesByAssetType(trades: NormalizedTrade[], assetType?: AssetType): NormalizedTrade[] {
    if (!assetType) {
      return trades;
    }
    return trades.filter((trade) => trade.assetType === assetType);
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
  static async calculateWinRate(userId: string): Promise<WinRateMetrics> {
    const trades = await this.getNormalizedTrades(userId);
    const realizedTrades = trades.filter((trade) => this.isRealizedTrade(trade));
    const winningTrades = realizedTrades.filter((trade) => trade.realizedPL > 0);
    const losingTrades = realizedTrades.filter((trade) => trade.realizedPL < 0);

    const realizedPL = realizedTrades.reduce((sum, trade) => sum + trade.realizedPL, 0);
    const unrealizedPL = trades
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

    // Calculate initial investment (sum of deposits)
    const cashTransactions = await CashTransactionRepository.getByUserId(userId);
    const depositCodes = ['DEPOSIT', 'ACH', 'DCF', 'RTP', 'DEP'];
    const initialInvestment = cashTransactions
      .filter((tx) => depositCodes.includes(tx.transaction_code || ''))
      .filter((tx) => (tx.amount || 0) > 0)
      .reduce((sum, tx) => sum + (tx.amount || 0), 0);
    
    // Calculate current balance: Net cash flow + unrealized P&L
    // Net cash flow = sum of all cash transactions (excluding futures margin)
    const netCashFlow = cashTransactions
      .filter((tx) => !['FUTURES_MARGIN', 'FUTURES_MARGIN_RELEASE'].includes(tx.transaction_code || ''))
      .reduce((sum, tx) => sum + (tx.amount || 0), 0);
    
    // For current balance, we'll use a simplified calculation: net cash flow + unrealized PL
    // Full portfolio value would require market quotes, which is handled in the hook
    const currentBalance = netCashFlow + unrealizedPL;
    
    // Calculate ROI relative to initial investment (matching ROI chart logic)
    const roi =
      initialInvestment > 0
        ? ((currentBalance - initialInvestment) / Math.abs(initialInvestment)) * 100
        : 0;

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
        roi: 0,
        currentBalance,
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
      currentBalance,
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
  static async calculateWinRateByAssetType(userId: string, assetType: AssetType): Promise<WinRateMetrics> {
    const trades = await this.getNormalizedTrades(userId);
    const filteredTrades = this.filterTradesByAssetType(trades, assetType);
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

    // Calculate initial investment (sum of deposits)
    const cashTransactions = await CashTransactionRepository.getByUserId(userId);
    const depositCodes = ['DEPOSIT', 'ACH', 'DCF', 'RTP', 'DEP'];
    const initialInvestment = cashTransactions
      .filter((tx) => depositCodes.includes(tx.transaction_code || ''))
      .filter((tx) => (tx.amount || 0) > 0)
      .reduce((sum, tx) => sum + (tx.amount || 0), 0);
    
    // Calculate current balance: Net cash flow + unrealized P&L
    const netCashFlow = cashTransactions
      .filter((tx) => !['FUTURES_MARGIN', 'FUTURES_MARGIN_RELEASE'].includes(tx.transaction_code || ''))
      .reduce((sum, tx) => sum + (tx.amount || 0), 0);
    const currentBalance = netCashFlow + unrealizedPL;
    
    const roi =
      initialInvestment > 0
        ? ((currentBalance - initialInvestment) / Math.abs(initialInvestment)) * 100
        : 0;

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
        roi: 0,
        currentBalance,
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
      currentBalance,
    };
  }

  /**
   * Calculate performance by symbol for a specific asset type
   */
  static async calculatePerformanceBySymbol(
    userId: string,
    assetType?: AssetType,
    days?: number // Optional: filter by last N days
  ): Promise<SymbolPerformance[]> {
    const trades = await this.getNormalizedTrades(userId);
    let realizedTrades = trades.filter(
      (trade) => (!assetType || trade.assetType === assetType) && this.isRealizedTrade(trade)
    );

    if (days) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      realizedTrades = realizedTrades.filter((trade) => {
        const closedDate = this.getTradeClosedDate(trade);
        return closedDate ? closedDate >= cutoff : false;
      });
    }

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
    months: number = 12 // Number of months to include
  ): Promise<MonthlyPerformance[]> {
    const trades = await this.getNormalizedTrades(userId);
    const realizedTrades = trades.filter(
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
    let rangeStartDate = days
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

    let cumulativeRealized = 0;
    let cumulativeUnrealized = 0;
    return filledDailyPL.map((day) => {
      cumulativeRealized += day.dailyRealized;
      cumulativeUnrealized += day.dailyUnrealized;
      return {
        date: day.date,
        cumulativePL: cumulativeRealized + cumulativeUnrealized,
        realizedPL: cumulativeRealized,
        unrealizedPL: cumulativeUnrealized,
      };
    });

  }

  /**
   * Calculate last 7 days P&L
   */
  static async calculateLast7DaysPL(
    userId: string,
    assetType?: AssetType
  ): Promise<Array<{ date: string; pl: number }>> {
    const trades = await this.getNormalizedTrades(userId);
    const filteredTrades = this.filterTradesByAssetType(trades, assetType);
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
    assetType?: AssetType
  ): Promise<Array<{ dayOfWeek: string; pl: number; winRate: number; totalTrades: number; winningTrades: number; losingTrades: number }>> {
    const trades = await this.getNormalizedTrades(userId);
    const realizedTrades = this.filterTradesByAssetType(trades, assetType).filter((trade) =>
      this.isRealizedTrade(trade)
    );

    const dayMap = new Map<number, { pl: number; trades: NormalizedTrade[] }>();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    realizedTrades.forEach((trade) => {
      const closedDate = this.getTradeClosedDate(trade);
      if (!closedDate) {
        return;
      }
      const dayOfWeek = closedDate.getDay();
      
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
  ): Promise<Array<{ date: string; drawdown: number; peak: number; current: number }>> {
    // Get P&L over time data
    const plData = await this.calculatePLOverTime(userId, assetType, days);
    
    if (plData.length === 0) {
      return [];
    }
    
    // Calculate drawdown
    let peak = 0;
    const result = plData.map((day) => {
      const current = day.cumulativePL;
      if (current > peak) {
        peak = current;
      }
      const drawdown = peak > 0 ? ((peak - current) / Math.abs(peak)) * 100 : 0;
      
      return {
        date: day.date,
        drawdown,
        peak,
        current,
      };
    });
    
    return result;
  }

  /**
   * Calculate options performance by type (Call vs Put)
   */
  static async calculateOptionsByType(
    userId: string
  ): Promise<{
    call: { pl: number; winRate: number; totalTrades: number; winningTrades: number; losingTrades: number };
    put: { pl: number; winRate: number; totalTrades: number; winningTrades: number; losingTrades: number };
  }> {
    const trades = await this.getNormalizedTrades(userId);
    const optionTrades = trades.filter(
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
    userId: string
  ): Promise<{
    expired: { pl: number; winRate: number; totalTrades: number; winningTrades: number; losingTrades: number };
    closed: { pl: number; winRate: number; totalTrades: number; winningTrades: number; losingTrades: number };
  }> {
    const trades = await this.getNormalizedTrades(userId);
    const optionTrades = trades.filter(
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
      const legsExpired = trade.legs.some((leg) => leg.status === 'expired');
      const isExpired = legsExpired || closedDate >= expirationDate;
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
    userId: string
  ): Promise<Array<{ dteBucket: string; pl: number; winRate: number; totalTrades: number; winningTrades: number; losingTrades: number }>> {
    const MS_PER_DAY = 1000 * 60 * 60 * 24;
    const getLocalMidnight = (date: Date) =>
      new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    
    // Group by DTE bucket
    const bucketMap = new Map<string, NormalizedTrade[]>();
    
    const trades = await this.getNormalizedTrades(userId);
    trades
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
      
        // Determine bucket
        let bucket: string;
        if (daysToExp === 0) {
          bucket = '0 DTE';
        } else if (daysToExp === 1) {
          bucket = '1 DTE';
        } else if (daysToExp >= 2 && daysToExp <= 3) {
          bucket = '2-3 DTE';
        } else if (daysToExp >= 4 && daysToExp <= 7) {
          bucket = '4-7 DTE';
        } else if (daysToExp >= 8 && daysToExp <= 14) {
          bucket = '8-14 DTE';
        } else if (daysToExp >= 15 && daysToExp <= 30) {
          bucket = '15-30 DTE';
        } else {
          bucket = '30+ DTE';
        }
        
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
    
    // Sort by DTE order
    const bucketOrder = ['0 DTE', '1 DTE', '2-3 DTE', '4-7 DTE', '8-14 DTE', '15-30 DTE', '30+ DTE'];
    return result.sort((a, b) => {
      const aIndex = bucketOrder.indexOf(a.dteBucket);
      const bIndex = bucketOrder.indexOf(b.dteBucket);
      return aIndex - bIndex;
    });
  }

  /**
   * Calculate strategy performance
   */
  static async calculateStrategyPerformance(
    userId: string
  ): Promise<Array<{ strategyType: string; pl: number; winRate: number; profitOnRisk: number; totalTrades: number; winningTrades: number; losingTrades: number }>> {
    const [allStrategies, allPositions] = await Promise.all([
      StrategyRepository.getAll(userId),
      PositionRepository.getAll(userId),
    ]);

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
      .filter((position) => !position.strategy_id && isLegClosed(position))
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
    assetType: 'option' | 'futures'
  ): Promise<Array<{ timeBucket: string; pl: number; winRate: number; totalTrades: number; winningTrades: number; losingTrades: number }>> {
    const trades = await this.getNormalizedTrades(userId);
    const filteredTrades = trades.filter(
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
    userId: string
  ): Promise<Record<string, Array<{ timeBucket: string; pl: number; winRate: number; totalTrades: number; winningTrades: number; losingTrades: number }>>> {
    const trades = await this.getNormalizedTrades(userId);
    const optionTrades = trades.filter(
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
    
    // Determine initial investment (sum of deposits) to match ROI metric summary
    const cashTransactions = await CashTransactionRepository.getByUserId(userId);
    const depositCodes = ['DEPOSIT', 'ACH', 'DCF', 'RTP', 'DEP'];
    const initialInvestmentFromDeposits = cashTransactions
      .filter((tx) => depositCodes.includes(tx.transaction_code || ''))
      .filter((tx) => (tx.amount || 0) > 0)
      .reduce((sum, tx) => sum + (tx.amount || 0), 0);
    
    const fallbackInvestment =
      sortedSnapshots.find((snapshot) => snapshot.net_cash_flow !== 0)?.net_cash_flow ??
      sortedSnapshots[0]?.portfolio_value ??
      0;
    
    const investmentBase = initialInvestmentFromDeposits || fallbackInvestment;
    
    const result = sortedSnapshots.map((s) => {
      let portfolioValue = s.portfolio_value;
      
      // If asset type specified, use breakdown value
      if (assetType) {
        const breakdown = s.positions_breakdown;
        if (assetType === 'stock') {
          portfolioValue = breakdown.stocks.value + s.net_cash_flow;
        } else if (assetType === 'option') {
          portfolioValue = breakdown.options.value + s.net_cash_flow;
        } else if (assetType === 'crypto') {
          portfolioValue = breakdown.crypto.value + s.net_cash_flow;
        } else if (assetType === 'futures') {
          portfolioValue = breakdown.futures.value + s.net_cash_flow;
        }
      }
      
      // Calculate ROI relative to initial investment
      const roi =
        investmentBase !== 0
          ? ((portfolioValue - investmentBase) / Math.abs(investmentBase)) * 100
          : 0;
      
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
    assetType?: AssetType
  ): Promise<Array<{ date: string; pl: number; trades: number }>> {
    const trades = await this.getNormalizedTrades(userId);
    const realizedTrades = this.filterTradesByAssetType(trades, assetType).filter((trade) =>
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

      const legClosingDates = trade.legs
        .flatMap((leg) => leg.closing_transaction_ids || [])
        .map((id) => (id ? closingTransactionDates[id] : undefined))
        .filter((date): date is string => Boolean(date));

      const latestLegDate = legClosingDates.length > 0 ? this.getLatestDate(legClosingDates) : null;
      const dateKey = latestLegDate || (closedDate ? closedDate.toISOString().split('T')[0] : null);

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
   * Get positions closed on a specific date
   */
  static async getPositionsByClosedDate(
    userId: string,
    date: string,
    assetType?: AssetType
  ): Promise<Position[]> {
    const allPositions = await PositionRepository.getAll(userId);
    
    // Filter by asset type if specified
    const filteredPositions = assetType 
      ? allPositions.filter((p) => p.asset_type === assetType)
      : allPositions;
    
    // Get positions closed on this date
    const dateStr = date.split('T')[0]; // Ensure we only use the date part
    
    const positionsClosedOnDate = filteredPositions.filter((p) => {
      if (!p.closed_at) return false;
      const closedDate = new Date(p.closed_at).toISOString().split('T')[0];
      return closedDate === dateStr;
    });
    
    // Also include partially closed positions (with realized P&L) that were updated on this date
    const partiallyClosedOnDate = filteredPositions.filter((p) => {
      if (p.status !== 'open' || !p.realized_pl || p.realized_pl === 0) return false;
      if (p.current_quantity >= p.opening_quantity) return false;
      const updatedDate = new Date(p.updated_at).toISOString().split('T')[0];
      return updatedDate === dateStr;
    });
    
    return [...positionsClosedOnDate, ...partiallyClosedOnDate];
  }

  /**
   * Calculate holding period distribution for stocks/crypto
   */
  static async calculateHoldingPeriodDistribution(
    userId: string,
    assetType: 'stock' | 'crypto'
  ): Promise<Array<{ period: string; pl: number; winRate: number; totalTrades: number; winningTrades: number; losingTrades: number }>> {
    const trades = await this.getNormalizedTrades(userId);
    const filteredTrades = trades.filter(
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
    userId: string
  ): Promise<Array<{ contractMonth: string; pl: number; winRate: number; totalTrades: number; winningTrades: number; losingTrades: number }>> {
    const trades = await this.getNormalizedTrades(userId);
    const futuresTrades = trades.filter(
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
    userId: string
  ): Promise<Array<{ symbol: string; pl: number; marginUsed: number; marginEfficiency: number; totalTrades: number }>> {
    const trades = await this.getNormalizedTrades(userId);
    const futuresTrades = trades.filter(
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
    userId: string
  ): Promise<Array<{ coin: string; pl: number; winRate: number; totalTrades: number; winningTrades: number; losingTrades: number }>> {
    const trades = await this.getNormalizedTrades(userId);
    const cryptoTrades = trades.filter(
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

