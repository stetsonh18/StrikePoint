import { PositionRepository } from '@/infrastructure/repositories/position.repository';
import { StrategyRepository } from '@/infrastructure/repositories/strategy.repository';
import { PortfolioSnapshotRepository } from '@/infrastructure/repositories/portfolioSnapshot.repository';
import { CashTransactionRepository } from '@/infrastructure/repositories/cashTransaction.repository';
import type { Position } from '@/domain/types';
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

/**
 * Service for calculating performance metrics from closed positions
 */
export class PerformanceMetricsService {
  /**
   * Calculate win rate from closed positions
   * Includes fully closed positions and partially closed positions (with realized P/L)
   * For multi-leg strategies, counts the strategy as a single trade instead of counting individual legs
   */
  static async calculateWinRate(userId: string): Promise<WinRateMetrics> {
    // Get all positions and strategies
    const allPositions = await PositionRepository.getAll(userId);
    const allStrategies = await StrategyRepository.getAll(userId);
    
    // Get strategies that should be counted as trades
    // Include strategies that are:
    // 1. Not open (closed, partially_closed, assigned, or expired), OR
    // 2. Have realized_pl (even if still marked as open - this handles cases where positions are closed but strategy status wasn't updated)
    // 3. Have all positions closed (calculate realized_pl from positions if strategy doesn't have it)
    const strategiesWithRealizedPL = allStrategies.filter((s) => {
      // If strategy is not open, include it
      if (s.status !== 'open') {
        return true;
      }
      
      // If strategy has realized_pl, include it
      if ((s.realized_pl || 0) !== 0) {
        return true;
      }
      
      // If strategy is open but has no realized_pl, check if all its positions are closed
      // If so, calculate realized_pl from positions and include it
      const strategyPositions = allPositions.filter(p => p.strategy_id === s.id);
      if (strategyPositions.length > 0) {
        const allPositionsClosed = strategyPositions.every(p => p.status === 'closed');
        if (allPositionsClosed) {
          // Calculate realized_pl from positions
          const calculatedPL = strategyPositions.reduce((sum, p) => sum + (p.realized_pl || 0), 0);
          // Update the strategy's realized_pl for this calculation
          s.realized_pl = calculatedPL;
          return calculatedPL !== 0; // Only include if there's actual P/L
        }
      }
      
      return false;
    });
    
    // Log for debugging
    console.log('[PerformanceMetrics] Strategies found:', {
      total: allStrategies.length,
      withRealizedPL: strategiesWithRealizedPL.length,
      strategies: strategiesWithRealizedPL.map(s => ({
        id: s.id,
        status: s.status,
        realized_pl: s.realized_pl,
        underlying: s.underlying_symbol
      }))
    });
    
    // Get individual positions with realized P/L
    // CRITICAL: Exclude ALL positions that are part of a strategy (regardless of strategy status)
    // Multi-leg strategies should ONLY be counted at the strategy level, never at the individual position level
    // This ensures a multi-leg strategy counts as a single win or loss based on the strategy's total P/L
    const individualPositionsWithRealizedPL = allPositions.filter(
      (p) => {
        const hasRealizedPL = p.status === 'closed' || 
          (p.status === 'open' && (p.realized_pl || 0) !== 0 && p.current_quantity < p.opening_quantity);
        
        if (!hasRealizedPL) return false;
        
        // If position is part of ANY strategy, exclude it - the strategy will be counted instead
        // This prevents double-counting and ensures multi-leg strategies are treated as single trades
        if (p.strategy_id) {
          return false; // Always exclude positions that are part of a strategy
        }
        
        // Only include positions that are NOT part of a strategy
        return true;
      }
    );

    // Calculate realized P&L from strategies (multi-leg trades count as one)
    const strategyRealizedPL = strategiesWithRealizedPL.reduce((sum, s) => sum + (s.realized_pl || 0), 0);
    
    // Calculate realized P&L from individual positions (single-leg trades)
    const individualRealizedPL = individualPositionsWithRealizedPL.reduce((sum, p) => sum + (p.realized_pl || 0), 0);
    
    // Total realized P&L
    const realizedPL = strategyRealizedPL + individualRealizedPL;
    
    // Calculate unrealized P&L from open positions
    // Use stored unrealized_pl value (should be updated by real-time price services)
    // If stored value is 0, it means either no unrealized P&L or value hasn't been calculated yet
    const openPositions = allPositions.filter((p) => p.status === 'open');
    const unrealizedPL = openPositions.reduce((sum, p) => {
      // Use stored unrealized_pl - this should be updated by market data services
      // For positions where unrealized_pl is 0, we can't calculate without current market prices
      // The unrealized_pl field should be updated when positions are viewed/refreshed
      return sum + (p.unrealized_pl || 0);
    }, 0);
    
    // Total number of trades = strategies + individual positions
    const totalTrades = strategiesWithRealizedPL.length + individualPositionsWithRealizedPL.length;
    
    // Calculate average P&L per trade
    const averagePLPerTrade = totalTrades > 0 ? realizedPL / totalTrades : 0;
    
    // Calculate initial investment (sum of deposits)
    const cashTransactions = await CashTransactionRepository.getByUserId(userId);
    const depositCodes = ['DEPOSIT', 'ACH', 'DCF', 'RTP', 'DEP'];
    const initialInvestment = cashTransactions
      .filter((tx) => depositCodes.includes(tx.transaction_code || ''))
      .filter((tx) => (tx.amount || 0) > 0)
      .reduce((sum, tx) => sum + (tx.amount || 0), 0);
    
    // Calculate ROI: (Realized P&L / Initial Investment) * 100
    const roi = initialInvestment > 0 ? (realizedPL / initialInvestment) * 100 : 0;
    
    // Calculate current balance: Net cash flow + unrealized P&L
    // Net cash flow = sum of all cash transactions (excluding futures margin)
    const netCashFlow = cashTransactions
      .filter((tx) => !['FUTURES_MARGIN', 'FUTURES_MARGIN_RELEASE'].includes(tx.transaction_code || ''))
      .reduce((sum, tx) => sum + (tx.amount || 0), 0);
    
    // For current balance, we'll use a simplified calculation: net cash flow + unrealized PL
    // Full portfolio value would require market quotes, which is handled in the hook
    const currentBalance = netCashFlow + unrealizedPL;

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

    // Separate winning and losing strategies
    const winningStrategies = strategiesWithRealizedPL.filter((s) => (s.realized_pl || 0) > 0);
    const losingStrategies = strategiesWithRealizedPL.filter((s) => (s.realized_pl || 0) < 0);
    
    // Separate winning and losing individual positions
    const winningIndividualPositions = individualPositionsWithRealizedPL.filter((p: Position) => (p.realized_pl || 0) > 0);
    const losingIndividualPositions = individualPositionsWithRealizedPL.filter((p: Position) => (p.realized_pl || 0) < 0);
    
    // Combine all winning and losing trades
    const winningTrades = [...winningStrategies.map(s => ({ realized_pl: s.realized_pl, opened_at: s.opened_at, closed_at: s.closed_at })), 
                          ...winningIndividualPositions.map(p => ({ realized_pl: p.realized_pl, opened_at: p.opened_at, closed_at: p.closed_at }))];
    const losingTrades = [...losingStrategies.map(s => ({ realized_pl: s.realized_pl, opened_at: s.opened_at, closed_at: s.closed_at })), 
                          ...losingIndividualPositions.map(p => ({ realized_pl: p.realized_pl, opened_at: p.opened_at, closed_at: p.closed_at }))];

    // Calculate totals
    const totalGains = winningTrades.reduce((sum, t) => sum + (t.realized_pl || 0), 0);
    const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + (t.realized_pl || 0), 0));

    // Calculate averages
    const averageGain = winningTrades.length > 0 ? totalGains / winningTrades.length : 0;
    const averageLoss = losingTrades.length > 0 ? totalLosses / losingTrades.length : 0;

    // Calculate win rate
    const winRate = (winningTrades.length / totalTrades) * 100;

    // Calculate profit factor
    const profitFactor = totalLosses > 0 ? totalGains / totalLosses : (totalGains > 0 ? Infinity : 0);

    // Calculate largest win and loss
    const largestWin = winningTrades.length > 0 
      ? Math.max(...winningTrades.map(t => t.realized_pl || 0))
      : 0;
    const largestLoss = losingTrades.length > 0
      ? Math.min(...losingTrades.map(t => t.realized_pl || 0))
      : 0;

    // Calculate expectancy: (Win Rate × Avg Win) - (Loss Rate × Avg Loss)
    const lossRate = (losingTrades.length / totalTrades) * 100;
    const expectancy = (winRate / 100) * averageGain - (lossRate / 100) * averageLoss;

    // Calculate average holding period
    let totalHoldingDays = 0;
    let tradesWithDates = 0;
    [...winningTrades, ...losingTrades].forEach((t) => {
      if (t.opened_at && t.closed_at) {
        const opened = new Date(t.opened_at);
        const closed = new Date(t.closed_at);
        const days = Math.max(1, Math.ceil((closed.getTime() - opened.getTime()) / (1000 * 60 * 60 * 24)));
        totalHoldingDays += days;
        tradesWithDates++;
      }
    });
    const averageHoldingPeriodDays = tradesWithDates > 0 ? totalHoldingDays / tradesWithDates : 0;

    return {
      winRate,
      totalTrades,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      averageGain,
      averageLoss,
      profitFactor: isFinite(profitFactor) ? profitFactor : 0,
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
    // Get all positions and strategies
    const allPositions = await PositionRepository.getAll(userId);
    const allStrategies = await StrategyRepository.getAll(userId);
    
    // Filter strategies by asset type (only option strategies for now, as multi-leg is primarily for options)
    // For other asset types, we'll only count individual positions
    // Include strategies that are not open OR have realized_pl OR have all positions closed
    const strategiesWithRealizedPL = assetType === 'option' 
      ? allStrategies.filter((s) => {
          // For options, check if strategy has underlying_symbol OR if its positions are options
          const strategyPositions = allPositions.filter(p => p.strategy_id === s.id && p.asset_type === assetType);
          if (strategyPositions.length === 0) return false; // No positions of this asset type
          
          // If strategy is not open, include it
          if (s.status !== 'open') {
            return true;
          }
          
          // If strategy has realized_pl, include it
          if ((s.realized_pl || 0) !== 0) {
            return true;
          }
          
          // If strategy is open but has no realized_pl, check if all its positions are closed
          const allPositionsClosed = strategyPositions.every(p => p.status === 'closed');
          if (allPositionsClosed) {
            // Calculate realized_pl from positions
            const calculatedPL = strategyPositions.reduce((sum, p) => sum + (p.realized_pl || 0), 0);
            // Update the strategy's realized_pl for this calculation
            s.realized_pl = calculatedPL;
            return calculatedPL !== 0; // Only include if there's actual P/L
          }
          
          return false;
        })
      : [];
    
    // Log for debugging
    if (assetType === 'option') {
      console.log(`[PerformanceMetrics] ${assetType} strategies found:`, {
        total: allStrategies.length,
        withRealizedPL: strategiesWithRealizedPL.length,
        strategies: strategiesWithRealizedPL.map(s => ({
          id: s.id,
          status: s.status,
          realized_pl: s.realized_pl,
          underlying: s.underlying_symbol,
          positions: allPositions.filter(p => p.strategy_id === s.id && p.asset_type === assetType).length
        }))
      });
    }
    
    // Get individual positions with realized P/L for this asset type
    // CRITICAL: Exclude ALL positions that are part of a strategy (regardless of strategy status)
    // Multi-leg strategies should ONLY be counted at the strategy level, never at the individual position level
    // This ensures a multi-leg strategy counts as a single win or loss based on the strategy's total P/L
    const individualPositionsWithRealizedPL = allPositions.filter(
      (p) => {
        if (p.asset_type !== assetType) return false;
        
        const hasRealizedPL = p.status === 'closed' || 
          (p.status === 'open' && (p.realized_pl || 0) !== 0 && p.current_quantity < p.opening_quantity);
        
        if (!hasRealizedPL) return false;
        
        // If position is part of ANY strategy, exclude it - the strategy will be counted instead
        // This prevents double-counting and ensures multi-leg strategies are treated as single trades
        if (p.strategy_id) {
          return false; // Always exclude positions that are part of a strategy
        }
        
        // Only include positions that are NOT part of a strategy
        return true;
      }
    );

    // Calculate realized P&L from strategies (multi-leg trades count as one)
    const strategyRealizedPL = strategiesWithRealizedPL.reduce((sum, s) => sum + (s.realized_pl || 0), 0);
    
    // Calculate realized P&L from individual positions (single-leg trades)
    const individualRealizedPL = individualPositionsWithRealizedPL.reduce((sum, p) => sum + (p.realized_pl || 0), 0);
    
    // Total realized P&L
    const realizedPL = strategyRealizedPL + individualRealizedPL;
    
    // Calculate unrealized P&L from open positions for this asset type
    // Use stored unrealized_pl value (should be updated by real-time price services)
    const openPositions = allPositions.filter((p) => p.status === 'open' && p.asset_type === assetType);
    const unrealizedPL = openPositions.reduce((sum, p) => {
      // Use stored unrealized_pl - this should be updated by market data services
      return sum + (p.unrealized_pl || 0);
    }, 0);
    
    // Total number of trades = strategies + individual positions
    const totalTrades = strategiesWithRealizedPL.length + individualPositionsWithRealizedPL.length;
    
    // Calculate average P&L per trade
    const averagePLPerTrade = totalTrades > 0 ? realizedPL / totalTrades : 0;
    
    // Calculate initial investment (sum of deposits)
    const cashTransactions = await CashTransactionRepository.getByUserId(userId);
    const depositCodes = ['DEPOSIT', 'ACH', 'DCF', 'RTP', 'DEP'];
    const initialInvestment = cashTransactions
      .filter((tx) => depositCodes.includes(tx.transaction_code || ''))
      .filter((tx) => (tx.amount || 0) > 0)
      .reduce((sum, tx) => sum + (tx.amount || 0), 0);
    
    // Calculate ROI: (Realized P&L / Initial Investment) * 100
    const roi = initialInvestment > 0 ? (realizedPL / initialInvestment) * 100 : 0;
    
    // Calculate current balance: Net cash flow + unrealized P&L
    const netCashFlow = cashTransactions
      .filter((tx) => !['FUTURES_MARGIN', 'FUTURES_MARGIN_RELEASE'].includes(tx.transaction_code || ''))
      .reduce((sum, tx) => sum + (tx.amount || 0), 0);
    const currentBalance = netCashFlow + unrealizedPL;

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

    // Separate winning and losing strategies
    const winningStrategies = strategiesWithRealizedPL.filter((s) => (s.realized_pl || 0) > 0);
    const losingStrategies = strategiesWithRealizedPL.filter((s) => (s.realized_pl || 0) < 0);
    
    // Separate winning and losing individual positions
    const winningIndividualPositions = individualPositionsWithRealizedPL.filter((p: Position) => (p.realized_pl || 0) > 0);
    const losingIndividualPositions = individualPositionsWithRealizedPL.filter((p: Position) => (p.realized_pl || 0) < 0);
    
    // Combine all winning and losing trades
    const winningTrades = [...winningStrategies.map(s => ({ realized_pl: s.realized_pl, opened_at: s.opened_at, closed_at: s.closed_at })), 
                          ...winningIndividualPositions.map(p => ({ realized_pl: p.realized_pl, opened_at: p.opened_at, closed_at: p.closed_at }))];
    const losingTrades = [...losingStrategies.map(s => ({ realized_pl: s.realized_pl, opened_at: s.opened_at, closed_at: s.closed_at })), 
                          ...losingIndividualPositions.map(p => ({ realized_pl: p.realized_pl, opened_at: p.opened_at, closed_at: p.closed_at }))];

    // Calculate totals
    const totalGains = winningTrades.reduce((sum, t) => sum + (t.realized_pl || 0), 0);
    const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + (t.realized_pl || 0), 0));

    // Calculate averages
    const averageGain = winningTrades.length > 0 ? totalGains / winningTrades.length : 0;
    const averageLoss = losingTrades.length > 0 ? totalLosses / losingTrades.length : 0;

    // Calculate win rate
    const winRate = (winningTrades.length / totalTrades) * 100;

    // Calculate profit factor
    const profitFactor = totalLosses > 0 ? totalGains / totalLosses : (totalGains > 0 ? Infinity : 0);

    // Calculate largest win and loss
    const largestWin = winningTrades.length > 0 
      ? Math.max(...winningTrades.map(t => t.realized_pl || 0))
      : 0;
    const largestLoss = losingTrades.length > 0
      ? Math.min(...losingTrades.map(t => t.realized_pl || 0))
      : 0;

    // Calculate expectancy: (Win Rate × Avg Win) - (Loss Rate × Avg Loss)
    const lossRate = (losingTrades.length / totalTrades) * 100;
    const expectancy = (winRate / 100) * averageGain - (lossRate / 100) * averageLoss;

    // Calculate average holding period
    let totalHoldingDays = 0;
    let tradesWithDates = 0;
    [...winningTrades, ...losingTrades].forEach((t) => {
      if (t.opened_at && t.closed_at) {
        const opened = new Date(t.opened_at);
        const closed = new Date(t.closed_at);
        const days = Math.max(1, Math.ceil((closed.getTime() - opened.getTime()) / (1000 * 60 * 60 * 24)));
        totalHoldingDays += days;
        tradesWithDates++;
      }
    });
    const averageHoldingPeriodDays = tradesWithDates > 0 ? totalHoldingDays / tradesWithDates : 0;

    return {
      winRate,
      totalTrades,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      averageGain,
      averageLoss,
      profitFactor: isFinite(profitFactor) ? profitFactor : 0,
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
    const allPositions = await PositionRepository.getAll(userId);
    
    // Filter positions
    let positionsWithRealizedPL = allPositions.filter(
      (p) => (!assetType || p.asset_type === assetType) && 
        (p.status === 'closed' || (p.status === 'open' && (p.realized_pl || 0) !== 0 && p.current_quantity < p.opening_quantity))
    );

    // Filter by date if specified
    if (days) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      positionsWithRealizedPL = positionsWithRealizedPL.filter((p) => {
        const closedDate = p.closed_at ? new Date(p.closed_at) : new Date(p.updated_at);
        return closedDate >= cutoffDate;
      });
    }

    if (positionsWithRealizedPL.length === 0) {
      return [];
    }

    // Group by symbol
    const symbolMap = new Map<string, Position[]>();
    positionsWithRealizedPL.forEach((p) => {
      const symbol = p.symbol || 'Unknown';
      if (!symbolMap.has(symbol)) {
        symbolMap.set(symbol, []);
      }
      symbolMap.get(symbol)!.push(p);
    });

    // Calculate metrics per symbol
    const symbolPerformance: SymbolPerformance[] = [];
    symbolMap.forEach((positions, symbol) => {
      const winningTrades = positions.filter(p => (p.realized_pl || 0) > 0);
      const losingTrades = positions.filter(p => (p.realized_pl || 0) < 0);
      const totalPL = positions.reduce((sum, p) => sum + (p.realized_pl || 0), 0);
      const winRate = positions.length > 0 ? (winningTrades.length / positions.length) * 100 : 0;
      const largestWin = winningTrades.length > 0
        ? Math.max(...winningTrades.map(p => p.realized_pl || 0))
        : 0;
      const largestLoss = losingTrades.length > 0
        ? Math.min(...losingTrades.map(p => p.realized_pl || 0))
        : 0;

      symbolPerformance.push({
        symbol,
        totalTrades: positions.length,
        winningTrades: winningTrades.length,
        losingTrades: losingTrades.length,
        winRate,
        totalPL,
        averagePL: positions.length > 0 ? totalPL / positions.length : 0,
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
    const allPositions = await PositionRepository.getAll(userId);
    
    // Filter positions
    const positionsWithRealizedPL = allPositions.filter(
      (p) => (!assetType || p.asset_type === assetType) && 
        (p.status === 'closed' || (p.status === 'open' && (p.realized_pl || 0) !== 0 && p.current_quantity < p.opening_quantity))
    );

    if (positionsWithRealizedPL.length === 0) {
      return [];
    }

    // Group by month
    const monthMap = new Map<string, Position[]>();
    positionsWithRealizedPL.forEach((p) => {
      const date = p.closed_at ? new Date(p.closed_at) : new Date(p.updated_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, []);
      }
      monthMap.get(monthKey)!.push(p);
    });

    // Calculate metrics per month
    const monthlyPerformance: MonthlyPerformance[] = [];
    monthMap.forEach((positions, monthKey) => {
      const winningTrades = positions.filter(p => (p.realized_pl || 0) > 0);
      const losingTrades = positions.filter(p => (p.realized_pl || 0) < 0);
      const totalPL = positions.reduce((sum, p) => sum + (p.realized_pl || 0), 0);
      const winRate = positions.length > 0 ? (winningTrades.length / positions.length) * 100 : 0;

      const [year, month] = monthKey.split('-');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthLabel = `${monthNames[parseInt(month) - 1]} ${year}`;

      monthlyPerformance.push({
        month: monthKey,
        monthLabel,
        totalPL,
        totalTrades: positions.length,
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
    const allPositions = await PositionRepository.getAll(userId);
    
    // Filter by asset type if specified
    const filteredPositions = assetType 
      ? allPositions.filter((p) => p.asset_type === assetType)
      : allPositions;
    
    // Get all positions with realized P&L (closed or partially closed)
    const positionsWithRealizedPL = filteredPositions.filter(
      (p) => p.status === 'closed' || (p.status === 'open' && (p.realized_pl || 0) !== 0 && p.current_quantity < p.opening_quantity)
    );
    
    // Get open positions for unrealized P&L
    const openPositions = filteredPositions.filter((p) => p.status === 'open');
    
    // Group by date
    const dateMap = new Map<string, { realized: number; unrealized: number }>();
    
    // Process closed positions - use closed_at date
    positionsWithRealizedPL.forEach((p) => {
      const date = p.closed_at ? new Date(p.closed_at).toISOString().split('T')[0] : new Date(p.updated_at).toISOString().split('T')[0];
      if (!dateMap.has(date)) {
        dateMap.set(date, { realized: 0, unrealized: 0 });
      }
      dateMap.get(date)!.realized += p.realized_pl || 0;
    });
    
    // Process open positions - use current date for unrealized
    const today = new Date().toISOString().split('T')[0];
    openPositions.forEach((p) => {
      if (!dateMap.has(today)) {
        dateMap.set(today, { realized: 0, unrealized: 0 });
      }
      dateMap.get(today)!.unrealized += p.unrealized_pl || 0;
    });
    
    // Convert to array and sort by date
    const dailyPL = Array.from(dateMap.entries())
      .map(([date, pl]) => ({
        date,
        dailyRealized: pl.realized,
        dailyUnrealized: pl.unrealized,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
    
    // Calculate cumulative P&L
    let cumulativeRealized = 0;
    let cumulativeUnrealized = 0;
    const result = dailyPL.map((day) => {
      cumulativeRealized += day.dailyRealized;
      cumulativeUnrealized += day.dailyUnrealized;
      return {
        date: day.date,
        cumulativePL: cumulativeRealized + cumulativeUnrealized,
        realizedPL: cumulativeRealized,
        unrealizedPL: cumulativeUnrealized,
      };
    });
    
    // Filter by days if specified
    if (days) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      const cutoffDateStr = cutoffDate.toISOString().split('T')[0];
      return result.filter((r) => r.date >= cutoffDateStr);
    }
    
    return result;
  }

  /**
   * Calculate last 7 days P&L
   */
  static async calculateLast7DaysPL(
    userId: string,
    assetType?: AssetType
  ): Promise<Array<{ date: string; pl: number }>> {
    const allPositions = await PositionRepository.getAll(userId);
    
    // Filter by asset type if specified
    const filteredPositions = assetType 
      ? allPositions.filter((p) => p.asset_type === assetType)
      : allPositions;
    
    // Get last 7 days
    const dates: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }
    
    // Calculate daily P&L
    const dailyPL = dates.map((date) => {
      let dailyPL = 0;
      
      // Get positions closed on this date
      const closedOnDate = filteredPositions.filter((p) => {
        if (p.status !== 'closed') return false;
        const closedDate = p.closed_at ? new Date(p.closed_at).toISOString().split('T')[0] : null;
        return closedDate === date;
      });
      dailyPL += closedOnDate.reduce((sum, p) => sum + (p.realized_pl || 0), 0);
      
      // For today, include unrealized P&L from open positions
      if (date === dates[dates.length - 1]) {
        const openPositions = filteredPositions.filter((p) => p.status === 'open');
        dailyPL += openPositions.reduce((sum, p) => sum + (p.unrealized_pl || 0), 0);
      }
      
      return { date, pl: dailyPL };
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
    const allPositions = await PositionRepository.getAll(userId);
    
    // Filter by asset type if specified
    const filteredPositions = assetType 
      ? allPositions.filter((p) => p.asset_type === assetType)
      : allPositions;
    
    // Get positions with realized P&L
    const positionsWithRealizedPL = filteredPositions.filter(
      (p) => p.status === 'closed' || (p.status === 'open' && (p.realized_pl || 0) !== 0 && p.current_quantity < p.opening_quantity)
    );
    
    // Group by day of week
    const dayMap = new Map<number, { pl: number; trades: Position[] }>();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    positionsWithRealizedPL.forEach((p) => {
      const date = p.closed_at ? new Date(p.closed_at) : new Date(p.updated_at);
      const dayOfWeek = date.getDay();
      
      if (!dayMap.has(dayOfWeek)) {
        dayMap.set(dayOfWeek, { pl: 0, trades: [] });
      }
      
      const dayData = dayMap.get(dayOfWeek)!;
      dayData.pl += p.realized_pl || 0;
      dayData.trades.push(p);
    });
    
    // Convert to array and calculate win rates
    const result = Array.from(dayMap.entries())
      .map(([dayOfWeek, data]) => {
        const winningTrades = data.trades.filter((p) => (p.realized_pl || 0) > 0);
        const losingTrades = data.trades.filter((p) => (p.realized_pl || 0) < 0);
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
    const allPositions = await PositionRepository.getAll(userId);
    
    // Filter to only options
    const optionPositions = allPositions.filter((p) => p.asset_type === 'option');
    
    // Get positions with realized P&L
    const positionsWithRealizedPL = optionPositions.filter(
      (p) => p.status === 'closed' || (p.status === 'open' && (p.realized_pl || 0) !== 0 && p.current_quantity < p.opening_quantity)
    );
    
    // Separate by option type
    const callPositions = positionsWithRealizedPL.filter((p) => p.option_type === 'call');
    const putPositions = positionsWithRealizedPL.filter((p) => p.option_type === 'put');
    
    // Calculate call metrics
    const callPL = callPositions.reduce((sum, p) => sum + (p.realized_pl || 0), 0);
    const callWinningTrades = callPositions.filter((p) => (p.realized_pl || 0) > 0);
    const callLosingTrades = callPositions.filter((p) => (p.realized_pl || 0) < 0);
    const callWinRate = callPositions.length > 0 ? (callWinningTrades.length / callPositions.length) * 100 : 0;
    
    // Calculate put metrics
    const putPL = putPositions.reduce((sum, p) => sum + (p.realized_pl || 0), 0);
    const putWinningTrades = putPositions.filter((p) => (p.realized_pl || 0) > 0);
    const putLosingTrades = putPositions.filter((p) => (p.realized_pl || 0) < 0);
    const putWinRate = putPositions.length > 0 ? (putWinningTrades.length / putPositions.length) * 100 : 0;
    
    return {
      call: {
        pl: callPL,
        winRate: callWinRate,
        totalTrades: callPositions.length,
        winningTrades: callWinningTrades.length,
        losingTrades: callLosingTrades.length,
      },
      put: {
        pl: putPL,
        winRate: putWinRate,
        totalTrades: putPositions.length,
        winningTrades: putWinningTrades.length,
        losingTrades: putLosingTrades.length,
      },
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
    const allPositions = await PositionRepository.getAll(userId);
    
    // Filter to only options
    const optionPositions = allPositions.filter((p) => p.asset_type === 'option' && p.expiration_date);
    
    // Get positions with realized P&L
    const positionsWithRealizedPL = optionPositions.filter(
      (p) => p.status === 'closed' || (p.status === 'open' && (p.realized_pl || 0) !== 0 && p.current_quantity < p.opening_quantity)
    );
    
    // Separate by expiration status
    const expiredPositions: Position[] = [];
    const closedPositions: Position[] = [];
    
    positionsWithRealizedPL.forEach((p) => {
      if (!p.expiration_date) return;
      
      const expirationDate = new Date(p.expiration_date);
      const closedDate = p.closed_at ? new Date(p.closed_at) : null;
      
      // Determine if expired: status is 'expired' OR closed_at >= expiration_date
      const isExpired = p.status === 'expired' || 
        (closedDate && closedDate >= expirationDate);
      
      if (isExpired) {
        expiredPositions.push(p);
      } else {
        closedPositions.push(p);
      }
    });
    
    // Calculate expired metrics
    const expiredPL = expiredPositions.reduce((sum, p) => sum + (p.realized_pl || 0), 0);
    const expiredWinningTrades = expiredPositions.filter((p) => (p.realized_pl || 0) > 0);
    const expiredLosingTrades = expiredPositions.filter((p) => (p.realized_pl || 0) < 0);
    const expiredWinRate = expiredPositions.length > 0 ? (expiredWinningTrades.length / expiredPositions.length) * 100 : 0;
    
    // Calculate closed metrics
    const closedPL = closedPositions.reduce((sum, p) => sum + (p.realized_pl || 0), 0);
    const closedWinningTrades = closedPositions.filter((p) => (p.realized_pl || 0) > 0);
    const closedLosingTrades = closedPositions.filter((p) => (p.realized_pl || 0) < 0);
    const closedWinRate = closedPositions.length > 0 ? (closedWinningTrades.length / closedPositions.length) * 100 : 0;
    
    return {
      expired: {
        pl: expiredPL,
        winRate: expiredWinRate,
        totalTrades: expiredPositions.length,
        winningTrades: expiredWinningTrades.length,
        losingTrades: expiredLosingTrades.length,
      },
      closed: {
        pl: closedPL,
        winRate: closedWinRate,
        totalTrades: closedPositions.length,
        winningTrades: closedWinningTrades.length,
        losingTrades: closedLosingTrades.length,
      },
    };
  }

  /**
   * Calculate options performance by days to expiration
   */
  static async calculateDaysToExpiration(
    userId: string
  ): Promise<Array<{ dteBucket: string; pl: number; winRate: number; totalTrades: number; winningTrades: number; losingTrades: number }>> {
    const allPositions = await PositionRepository.getAll(userId);
    
    // Filter to only options
    const optionPositions = allPositions.filter((p) => p.asset_type === 'option' && p.expiration_date);
    
    // Get positions with realized P&L
    const positionsWithRealizedPL = optionPositions.filter(
      (p) => p.status === 'closed' || (p.status === 'open' && (p.realized_pl || 0) !== 0 && p.current_quantity < p.opening_quantity)
    );
    
    // Group by DTE bucket
    const bucketMap = new Map<string, Position[]>();
    
    positionsWithRealizedPL.forEach((p) => {
      if (!p.expiration_date || !p.opened_at) return;
      
      const expirationDate = new Date(p.expiration_date);
      const openedDate = new Date(p.opened_at);
      const daysToExp = Math.ceil((expirationDate.getTime() - openedDate.getTime()) / (1000 * 60 * 60 * 24));
      
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
      bucketMap.get(bucket)!.push(p);
    });
    
    // Calculate metrics per bucket
    const result = Array.from(bucketMap.entries())
      .map(([bucket, positions]) => {
        const winningTrades = positions.filter((p) => (p.realized_pl || 0) > 0);
        const losingTrades = positions.filter((p) => (p.realized_pl || 0) < 0);
        const pl = positions.reduce((sum, p) => sum + (p.realized_pl || 0), 0);
        const winRate = positions.length > 0 ? (winningTrades.length / positions.length) * 100 : 0;
        
        return {
          dteBucket: bucket,
          pl,
          winRate,
          totalTrades: positions.length,
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
    const allStrategies = await StrategyRepository.getAll(userId);
    
    // Filter to strategies with realized P&L (closed or partially closed)
    const strategiesWithPL = allStrategies.filter(
      (s) => s.status === 'closed' || (s.status === 'open' && (s.realized_pl || 0) !== 0)
    );
    
    // Group by strategy type
    const strategyMap = new Map<string, typeof allStrategies>();
    
    strategiesWithPL.forEach((s) => {
      if (!strategyMap.has(s.strategy_type)) {
        strategyMap.set(s.strategy_type, []);
      }
      strategyMap.get(s.strategy_type)!.push(s);
    });
    
    // Calculate metrics per strategy type
    const result = Array.from(strategyMap.entries())
      .map(([strategyType, strategies]) => {
        const winningStrategies = strategies.filter((s) => (s.realized_pl || 0) > 0);
        const losingStrategies = strategies.filter((s) => (s.realized_pl || 0) < 0);
        const totalPL = strategies.reduce((sum, s) => sum + (s.realized_pl || 0), 0);
        const winRate = strategies.length > 0 ? (winningStrategies.length / strategies.length) * 100 : 0;
        
        // Calculate profit on risk: P&L / Max Risk
        // For strategies without max_risk, use total_opening_cost as proxy
        const totalRisk = strategies.reduce((sum, s) => {
          const risk = s.max_risk || Math.abs(s.total_opening_cost || 0);
          return sum + risk;
        }, 0);
        const profitOnRisk = totalRisk > 0 ? (totalPL / totalRisk) * 100 : 0;
        
        return {
          strategyType,
          pl: totalPL,
          winRate,
          profitOnRisk,
          totalTrades: strategies.length,
          winningTrades: winningStrategies.length,
          losingTrades: losingStrategies.length,
        };
      })
      .sort((a, b) => b.totalTrades - a.totalTrades); // Sort by trade count
    
    return result;
  }

  /**
   * Calculate entry time performance (for Options and Futures)
   */
  static async calculateEntryTimePerformance(
    userId: string,
    assetType: 'option' | 'futures'
  ): Promise<Array<{ timeBucket: string; pl: number; winRate: number; totalTrades: number; winningTrades: number; losingTrades: number }>> {
    const allPositions = await PositionRepository.getAll(userId);
    
    // Filter to specified asset type
    const filteredPositions = allPositions.filter((p) => p.asset_type === assetType);
    
    // Get positions with realized P&L
    const positionsWithRealizedPL = filteredPositions.filter(
      (p) => p.status === 'closed' || (p.status === 'open' && (p.realized_pl || 0) !== 0 && p.current_quantity < p.opening_quantity)
    );
    
    // Group by entry time (round to 5-minute increments)
    const timeMap = new Map<string, Position[]>();
    
    positionsWithRealizedPL.forEach((p) => {
      if (!p.opened_at) return;
      
      const openedDate = new Date(p.opened_at);
      const hours = openedDate.getHours();
      const minutes = openedDate.getMinutes();
      // Round to nearest 5 minutes
      const roundedMinutes = Math.floor(minutes / 5) * 5;
      const timeBucket = `${String(hours).padStart(2, '0')}:${String(roundedMinutes).padStart(2, '0')}`;
      
      if (!timeMap.has(timeBucket)) {
        timeMap.set(timeBucket, []);
      }
      timeMap.get(timeBucket)!.push(p);
    });
    
    // Calculate metrics per time bucket
    const result = Array.from(timeMap.entries())
      .map(([timeBucket, positions]) => {
        const winningTrades = positions.filter((p) => (p.realized_pl || 0) > 0);
        const losingTrades = positions.filter((p) => (p.realized_pl || 0) < 0);
        const pl = positions.reduce((sum, p) => sum + (p.realized_pl || 0), 0);
        const winRate = positions.length > 0 ? (winningTrades.length / positions.length) * 100 : 0;
        
        return {
          timeBucket,
          pl,
          winRate,
          totalTrades: positions.length,
          winningTrades: winningTrades.length,
          losingTrades: losingTrades.length,
        };
      })
      .sort((a, b) => a.timeBucket.localeCompare(b.timeBucket)); // Sort by time
    
    return result;
  }

  /**
   * Calculate entry time performance by strategy (for Options)
   */
  static async calculateEntryTimeByStrategy(
    userId: string
  ): Promise<Record<string, Array<{ timeBucket: string; pl: number; winRate: number; totalTrades: number; winningTrades: number; losingTrades: number }>>> {
    const allPositions = await PositionRepository.getAll(userId);
    
    // Filter to only options
    const optionPositions = allPositions.filter((p) => p.asset_type === 'option');
    
    // Get positions with realized P&L
    const positionsWithRealizedPL = optionPositions.filter(
      (p) => p.status === 'closed' || (p.status === 'open' && (p.realized_pl || 0) !== 0 && p.current_quantity < p.opening_quantity)
    );
    
    // Get all strategies to map strategy_id to strategy_type
    const allStrategies = await StrategyRepository.getAll(userId);
    const strategyTypeMap = new Map<string, string>();
    allStrategies.forEach((s) => {
      strategyTypeMap.set(s.id, s.strategy_type);
    });
    
    // Group by strategy type and entry time
    const strategyTimeMap = new Map<string, Map<string, Position[]>>();
    
    positionsWithRealizedPL.forEach((p) => {
      if (!p.opened_at) return;
      
      // Get strategy type
      const strategyType = p.strategy_id && strategyTypeMap.has(p.strategy_id)
        ? strategyTypeMap.get(p.strategy_id)!
        : 'single_option';
      
      // Get time bucket
      const openedDate = new Date(p.opened_at);
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
      timeMap.get(timeBucket)!.push(p);
    });
    
    // Calculate metrics per strategy and time bucket
    const result: Record<string, Array<{ timeBucket: string; pl: number; winRate: number; totalTrades: number; winningTrades: number; losingTrades: number }>> = {};
    
    strategyTimeMap.forEach((timeMap, strategyType) => {
      const strategyData = Array.from(timeMap.entries())
        .map(([timeBucket, positions]) => {
          const winningTrades = positions.filter((p) => (p.realized_pl || 0) > 0);
          const losingTrades = positions.filter((p) => (p.realized_pl || 0) < 0);
          const pl = positions.reduce((sum, p) => sum + (p.realized_pl || 0), 0);
          const winRate = positions.length > 0 ? (winningTrades.length / positions.length) * 100 : 0;
          
          return {
            timeBucket,
            pl,
            winRate,
            totalTrades: positions.length,
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
    const initialNetCashFlow = sortedSnapshots[0]?.net_cash_flow || 0;
    
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
      
      // Calculate ROI: (Current Value - Initial Investment) / Initial Investment * 100
      // Use net_cash_flow as the investment amount
      const investment = s.net_cash_flow || initialNetCashFlow;
      const roi = investment !== 0 ? ((portfolioValue - investment) / Math.abs(investment)) * 100 : 0;
      
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
    const allPositions = await PositionRepository.getAll(userId);
    
    // Filter by asset type if specified
    const filteredPositions = assetType 
      ? allPositions.filter((p) => p.asset_type === assetType)
      : allPositions;
    
    // Get positions with realized P&L
    const positionsWithRealizedPL = filteredPositions.filter(
      (p) => p.status === 'closed' || (p.status === 'open' && (p.realized_pl || 0) !== 0 && p.current_quantity < p.opening_quantity)
    );
    
    // Group by date
    const dateMap = new Map<string, { pl: number; trades: Position[] }>();
    
    positionsWithRealizedPL.forEach((p) => {
      const date = p.closed_at ? new Date(p.closed_at) : new Date(p.updated_at);
      const dateStr = date.toISOString().split('T')[0];
      
      if (!dateMap.has(dateStr)) {
        dateMap.set(dateStr, { pl: 0, trades: [] });
      }
      
      const dayData = dateMap.get(dateStr)!;
      dayData.pl += p.realized_pl || 0;
      dayData.trades.push(p);
    });
    
    // Convert to array
    const result = Array.from(dateMap.entries())
      .map(([date, data]) => ({
        date,
        pl: data.pl,
        trades: data.trades.length,
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
    const allPositions = await PositionRepository.getAll(userId);
    
    // Filter to specified asset type
    const filteredPositions = allPositions.filter((p) => p.asset_type === assetType);
    
    // Get positions with realized P&L
    const positionsWithRealizedPL = filteredPositions.filter(
      (p) => p.status === 'closed' || (p.status === 'open' && (p.realized_pl || 0) !== 0 && p.current_quantity < p.opening_quantity)
    );
    
    // Group by holding period
    const periodMap = new Map<string, Position[]>();
    
    positionsWithRealizedPL.forEach((p) => {
      if (!p.opened_at || (!p.closed_at && p.status === 'open')) return;
      
      const openedDate = new Date(p.opened_at);
      const closedDate = p.closed_at ? new Date(p.closed_at) : new Date(p.updated_at);
      const daysHeld = Math.ceil((closedDate.getTime() - openedDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Determine period bucket
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
      periodMap.get(period)!.push(p);
    });
    
    // Calculate metrics per period
    const periodOrder = ['< 1 Day', '1-7 Days', '1-4 Weeks', '1-3 Months', '3+ Months'];
    const result = periodOrder
      .filter((period) => periodMap.has(period))
      .map((period) => {
        const positions = periodMap.get(period)!;
        const winningTrades = positions.filter((p) => (p.realized_pl || 0) > 0);
        const losingTrades = positions.filter((p) => (p.realized_pl || 0) < 0);
        const pl = positions.reduce((sum, p) => sum + (p.realized_pl || 0), 0);
        const winRate = positions.length > 0 ? (winningTrades.length / positions.length) * 100 : 0;
        
        return {
          period,
          pl,
          winRate,
          totalTrades: positions.length,
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
    const allPositions = await PositionRepository.getAll(userId);
    
    // Filter to only futures
    const futuresPositions = allPositions.filter((p) => p.asset_type === 'futures');
    
    // Get positions with realized P&L
    const positionsWithRealizedPL = futuresPositions.filter(
      (p) => p.status === 'closed' || (p.status === 'open' && (p.realized_pl || 0) !== 0 && p.current_quantity < p.opening_quantity)
    );
    
    // Group by contract month
    const monthMap = new Map<string, Position[]>();
    
    positionsWithRealizedPL.forEach((p) => {
      const contractMonth = p.contract_month || 'Unknown';
      
      if (!monthMap.has(contractMonth)) {
        monthMap.set(contractMonth, []);
      }
      monthMap.get(contractMonth)!.push(p);
    });
    
    // Calculate metrics per contract month
    const result = Array.from(monthMap.entries())
      .map(([contractMonth, positions]) => {
        const winningTrades = positions.filter((p) => (p.realized_pl || 0) > 0);
        const losingTrades = positions.filter((p) => (p.realized_pl || 0) < 0);
        const pl = positions.reduce((sum, p) => sum + (p.realized_pl || 0), 0);
        const winRate = positions.length > 0 ? (winningTrades.length / positions.length) * 100 : 0;
        
        return {
          contractMonth,
          pl,
          winRate,
          totalTrades: positions.length,
          winningTrades: winningTrades.length,
          losingTrades: losingTrades.length,
        };
      })
      .sort((a, b) => {
        // Sort by contract month (try to parse date, otherwise alphabetical)
        return a.contractMonth.localeCompare(b.contractMonth);
      });
    
    return result;
  }

  /**
   * Calculate futures margin efficiency
   */
  static async calculateFuturesMarginEfficiency(
    userId: string
  ): Promise<Array<{ symbol: string; pl: number; marginUsed: number; marginEfficiency: number; totalTrades: number }>> {
    const allPositions = await PositionRepository.getAll(userId);
    
    // Filter to only futures
    const futuresPositions = allPositions.filter((p) => p.asset_type === 'futures');
    
    // Get positions with realized P&L
    const positionsWithRealizedPL = futuresPositions.filter(
      (p) => p.status === 'closed' || (p.status === 'open' && (p.realized_pl || 0) !== 0 && p.current_quantity < p.opening_quantity)
    );
    
    // Group by symbol
    const symbolMap = new Map<string, { pl: number; marginUsed: number; trades: Position[] }>();
    
    positionsWithRealizedPL.forEach((p) => {
      const margin = p.margin_requirement || 0;
      const marginUsed = margin * Math.abs(p.opening_quantity);
      
      if (!symbolMap.has(p.symbol)) {
        symbolMap.set(p.symbol, { pl: 0, marginUsed: 0, trades: [] });
      }
      
      const symbolData = symbolMap.get(p.symbol)!;
      symbolData.pl += p.realized_pl || 0;
      symbolData.marginUsed += marginUsed;
      symbolData.trades.push(p);
    });
    
    // Calculate margin efficiency (P&L per dollar of margin)
    const result = Array.from(symbolMap.entries())
      .map(([symbol, data]) => {
        const marginEfficiency = data.marginUsed > 0 ? (data.pl / data.marginUsed) * 100 : 0;
        
        return {
          symbol,
          pl: data.pl,
          marginUsed: data.marginUsed,
          marginEfficiency,
          totalTrades: data.trades.length,
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
    const allPositions = await PositionRepository.getAll(userId);
    
    // Filter to only crypto
    const cryptoPositions = allPositions.filter((p) => p.asset_type === 'crypto');
    
    // Get positions with realized P&L
    const positionsWithRealizedPL = cryptoPositions.filter(
      (p) => p.status === 'closed' || (p.status === 'open' && (p.realized_pl || 0) !== 0 && p.current_quantity < p.opening_quantity)
    );
    
    // Group by symbol (coin)
    const coinMap = new Map<string, Position[]>();
    
    positionsWithRealizedPL.forEach((p) => {
      const coin = p.symbol || 'Unknown';
      
      if (!coinMap.has(coin)) {
        coinMap.set(coin, []);
      }
      coinMap.get(coin)!.push(p);
    });
    
    // Calculate metrics per coin
    const result = Array.from(coinMap.entries())
      .map(([coin, positions]) => {
        const winningTrades = positions.filter((p) => (p.realized_pl || 0) > 0);
        const losingTrades = positions.filter((p) => (p.realized_pl || 0) < 0);
        const pl = positions.reduce((sum, p) => sum + (p.realized_pl || 0), 0);
        const winRate = positions.length > 0 ? (winningTrades.length / positions.length) * 100 : 0;
        
        return {
          coin,
          pl,
          winRate,
          totalTrades: positions.length,
          winningTrades: winningTrades.length,
          losingTrades: losingTrades.length,
        };
      })
      .sort((a, b) => b.totalTrades - a.totalTrades);
    
    return result;
  }
}

