import { PositionRepository, StrategyRepository } from '../repositories';
import { logger } from '@/shared/utils/logger';
import type { Position, StrategyInsert, Strategy, StrategyType, StrategyLeg } from '@/domain/types';

/**
 * Strategy Detection Service
 * Analyzes positions to identify multi-leg option strategies
 */
export class StrategyDetectionService {
  /**
   * Detect and create strategies from unmatched positions
   */
  static async detectStrategies(userId: string): Promise<{
    strategiesCreated: number;
    positionsGrouped: number;
  }> {
    logger.debug('Starting strategy detection', { userId });

    // Get all open positions without a strategy
    const unmatchedPositions = await PositionRepository.getAll(userId, {
      status: 'open',
    });

    const positionsWithoutStrategy = unmatchedPositions.filter((p) => !p.strategy_id);

    logger.debug('Positions without strategies', { count: positionsWithoutStrategy.length, userId });

    // Group positions by underlying symbol and expiration date
    const groupedBySymbol = this.groupPositionsBySymbol(positionsWithoutStrategy);

    let strategiesCreated = 0;
    let positionsGrouped = 0;

    // Analyze each group for strategy patterns
    for (const [symbol, positions] of Object.entries(groupedBySymbol)) {
      // First, try to detect cross-expiration strategies (calendar, diagonal)
      const crossExpirationResult = await this.detectCrossExpirationStrategies(userId, symbol, positions);
      if (crossExpirationResult) {
        strategiesCreated += crossExpirationResult.strategiesCreated;
        positionsGrouped += crossExpirationResult.positionsGrouped;
        // Remove detected positions from the pool
        const remainingPositions = positions.filter(
          (p) => !crossExpirationResult.detectedPositionIds.includes(p.id)
        );
        if (remainingPositions.length === 0) continue;
        // Continue with remaining positions
        const byExpiration = this.groupByExpiration(remainingPositions);
        for (const expirationPositions of Object.values(byExpiration)) {
          const result = await this.detectStrategyPattern(userId, symbol, expirationPositions);
          if (result) {
            strategiesCreated += result.strategiesCreated;
            positionsGrouped += result.positionsGrouped;
          }
        }
      } else {
        // Group by expiration date for same-expiration strategies
        const byExpiration = this.groupByExpiration(positions);
        for (const expirationPositions of Object.values(byExpiration)) {
          const result = await this.detectStrategyPattern(userId, symbol, expirationPositions);
          if (result) {
            strategiesCreated += result.strategiesCreated;
            positionsGrouped += result.positionsGrouped;
          }
        }
      }
    }

    logger.info('Strategy detection complete', {
      strategiesCreated,
      positionsGrouped,
      userId,
    });

    return {
      strategiesCreated,
      positionsGrouped,
    };
  }

  /**
   * Group positions by underlying symbol
   */
  private static groupPositionsBySymbol(
    positions: Position[]
  ): Record<string, Position[]> {
    const grouped: Record<string, Position[]> = {};

    for (const position of positions) {
      if (!grouped[position.symbol]) {
        grouped[position.symbol] = [];
      }
      grouped[position.symbol].push(position);
    }

    return grouped;
  }

  /**
   * Group positions by expiration date
   */
  private static groupByExpiration(positions: Position[]): Record<string, Position[]> {
    const grouped: Record<string, Position[]> = {};

    for (const position of positions) {
      const key = position.expiration_date || 'stock';
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(position);
    }

    return grouped;
  }

  /**
   * Detect strategy pattern from a group of positions
   */
  private static async detectStrategyPattern(
    userId: string,
    symbol: string,
    positions: Position[]
  ): Promise<{ strategiesCreated: number; positionsGrouped: number } | null> {
    // Skip if only stocks or cash positions
    const optionPositions = positions.filter((p) => p.asset_type === 'option');
    if (optionPositions.length === 0) {
      // Create single stock position strategies
      for (const stockPos of positions.filter((p) => p.asset_type === 'stock')) {
        await this.createSinglePositionStrategy(userId, stockPos, 'single_option');
      }
      return { strategiesCreated: positions.length, positionsGrouped: positions.length };
    }

    // Detect multi-leg strategies
    let strategiesCreated = 0;
    let positionsGrouped = 0;

    // Try to detect specific patterns (order matters - more complex first)
    const detected =
      (await this.detectIronButterfly(userId, symbol, optionPositions)) ||
      (await this.detectIronCondor(userId, symbol, optionPositions)) ||
      (await this.detectButterfly(userId, symbol, optionPositions)) ||
      (await this.detectRatioSpread(userId, symbol, optionPositions)) ||
      (await this.detectVerticalSpread(userId, symbol, optionPositions)) ||
      (await this.detectStraddle(userId, symbol, optionPositions)) ||
      (await this.detectStrangle(userId, symbol, optionPositions));

    if (detected) {
      strategiesCreated += detected.strategiesCreated;
      positionsGrouped += detected.positionsGrouped;
    } else {
      // No specific pattern detected - try to group positions that should be together
      // Group positions with same symbol, expiration, option type, and opposite sides
      // This handles cases like credit/debit spreads that might not match exact patterns
      const grouped = await this.groupSimilarPositions(userId, symbol, optionPositions);
      if (grouped.strategiesCreated > 0) {
        strategiesCreated += grouped.strategiesCreated;
        positionsGrouped += grouped.positionsGrouped;
      } else {
        // No pattern detected - create individual strategies
        for (const position of optionPositions) {
          await this.createSinglePositionStrategy(userId, position, 'single_option');
          strategiesCreated++;
          positionsGrouped++;
        }
      }
    }

    return { strategiesCreated, positionsGrouped };
  }

  /**
   * Detect Iron Condor: Bull put spread + Bear call spread
   */
  private static async detectIronCondor(
    userId: string,
    symbol: string,
    positions: Position[]
  ): Promise<{ strategiesCreated: number; positionsGrouped: number } | null> {
    if (positions.length !== 4) return null;

    // Sort by strike price
    const sorted = positions.sort((a, b) => (a.strike_price || 0) - (b.strike_price || 0));

    // Check pattern: Short put, Long put (lower), Long call (higher), Short call
    const [p1, p2, p3, p4] = sorted;

    if (
      p1.option_type === 'put' &&
      p1.side === 'long' &&
      p2.option_type === 'put' &&
      p2.side === 'short' &&
      p3.option_type === 'call' &&
      p3.side === 'short' &&
      p4.option_type === 'call' &&
      p4.side === 'long'
    ) {
      // Valid iron condor
      await this.createStrategy(
        userId,
        'iron_condor',
        symbol,
        positions,
        'neutral'
      );
      return { strategiesCreated: 1, positionsGrouped: 4 };
    }

    return null;
  }

  /**
   * Detect Vertical Spread: Long + Short same type, different strikes
   */
  private static async detectVerticalSpread(
    userId: string,
    symbol: string,
    positions: Position[]
  ): Promise<{ strategiesCreated: number; positionsGrouped: number } | null> {
    if (positions.length !== 2) return null;

    const [p1, p2] = positions;

    // Check if same option type but different sides
    if (
      p1.option_type === p2.option_type &&
      p1.side !== p2.side &&
      p1.strike_price !== p2.strike_price
    ) {
      // Determine direction
      const isDebit = p1.side === 'long' || p2.side === 'long';
      const direction =
        p1.option_type === 'call'
          ? isDebit
            ? 'bullish'
            : 'bearish'
          : isDebit
          ? 'bearish'
          : 'bullish';

      await this.createStrategy(userId, 'vertical_spread', symbol, positions, direction);
      return { strategiesCreated: 1, positionsGrouped: 2 };
    }

    return null;
  }

  /**
   * Group similar positions that should be together (fallback for positions that don't match exact patterns)
   * Groups positions with same symbol, expiration, option type, and opposite sides
   */
  private static async groupSimilarPositions(
    userId: string,
    symbol: string,
    positions: Position[]
  ): Promise<{ strategiesCreated: number; positionsGrouped: number }> {
    if (positions.length < 2) {
      return { strategiesCreated: 0, positionsGrouped: 0 };
    }

    let strategiesCreated = 0;
    let positionsGrouped = 0;
    const processed = new Set<string>();

    // Group by expiration and option type
    const groups: Record<string, Position[]> = {};
    for (const pos of positions) {
      if (processed.has(pos.id)) continue;
      
      const key = `${pos.expiration_date || 'no-exp'}_${pos.option_type || 'no-type'}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(pos);
    }

    // For each group, try to find pairs with opposite sides
    for (const group of Object.values(groups)) {
      if (group.length < 2) continue;

      // Find pairs with opposite sides
      const longPositions = group.filter(p => p.side === 'long');
      const shortPositions = group.filter(p => p.side === 'short');

      // If we have both long and short positions, group them together
      if (longPositions.length > 0 && shortPositions.length > 0) {
        // Only group if positions have different strikes (vertical spread)
        // or if they're the only positions in the group (might be a spread with same strike opened separately)
        const hasDifferentStrikes = new Set(group.map(p => p.strike_price)).size > 1;
        
        // Group if they have different strikes (vertical spread) or if there are exactly 2 positions
        if (hasDifferentStrikes || group.length === 2) {
          // Create a strategy with all positions in this group
          // Determine strategy type based on option type and net debit/credit
          const strategyType: StrategyType = 'vertical_spread';
          
          // Check if it's a credit or debit spread
          // Long positions have negative cost basis (debit), short positions have positive (credit)
          // Net = sum of all cost bases (negative for debit, positive for credit)
          const totalCost = group.reduce((sum, p) => {
            // For long positions, cost_basis is negative (debit paid)
            // For short positions, cost_basis is positive (credit received)
            return sum + (p.total_cost_basis || 0);
          }, 0);
          const isCredit = totalCost > 0; // Positive total means net credit received
          
          // Determine direction
          let direction: 'bullish' | 'bearish' | 'neutral' = 'neutral';
          if (group[0].option_type === 'call') {
            direction = isCredit ? 'bearish' : 'bullish'; // Credit call spread is bearish, debit is bullish
          } else if (group[0].option_type === 'put') {
            direction = isCredit ? 'bullish' : 'bearish'; // Credit put spread is bullish, debit is bearish
          }

          await this.createStrategy(userId, strategyType, symbol, group, direction);
          strategiesCreated++;
          positionsGrouped += group.length;
          
          // Mark all positions as processed
          group.forEach(p => processed.add(p.id));
        }
      }
    }

    return { strategiesCreated, positionsGrouped };
  }

  /**
   * Detect Straddle: Long/Short call + put at same strike
   */
  private static async detectStraddle(
    userId: string,
    symbol: string,
    positions: Position[]
  ): Promise<{ strategiesCreated: number; positionsGrouped: number } | null> {
    if (positions.length !== 2) return null;

    const [p1, p2] = positions;

    // Check if one call and one put at same strike
    if (
      p1.strike_price === p2.strike_price &&
      p1.side === p2.side &&
      ((p1.option_type === 'call' && p2.option_type === 'put') ||
        (p1.option_type === 'put' && p2.option_type === 'call'))
    ) {
      const direction = p1.side === 'long' ? 'neutral' : 'neutral';
      await this.createStrategy(userId, 'straddle', symbol, positions, direction);
      return { strategiesCreated: 1, positionsGrouped: 2 };
    }

    return null;
  }

  /**
   * Detect Strangle: Long/Short call + put at different strikes
   */
  private static async detectStrangle(
    userId: string,
    symbol: string,
    positions: Position[]
  ): Promise<{ strategiesCreated: number; positionsGrouped: number } | null> {
    if (positions.length !== 2) return null;

    const [p1, p2] = positions;

    // Check if one call and one put at different strikes
    if (
      p1.strike_price !== p2.strike_price &&
      p1.side === p2.side &&
      ((p1.option_type === 'call' && p2.option_type === 'put') ||
        (p1.option_type === 'put' && p2.option_type === 'call'))
    ) {
      const direction = p1.side === 'long' ? 'neutral' : 'neutral';
      await this.createStrategy(userId, 'strangle', symbol, positions, direction);
      return { strategiesCreated: 1, positionsGrouped: 2 };
    }

    return null;
  }

  /**
   * Detect Butterfly: 3 strikes, 1-2-1 ratio
   */
  private static async detectButterfly(
    userId: string,
    symbol: string,
    positions: Position[]
  ): Promise<{ strategiesCreated: number; positionsGrouped: number } | null> {
    if (positions.length !== 3) return null;

    // Sort by strike
    const sorted = positions.sort((a, b) => (a.strike_price || 0) - (b.strike_price || 0));

    // Check if all same type and 1-2-1 quantity ratio
    const [p1, p2, p3] = sorted;
    if (
      p1.option_type === p2.option_type &&
      p2.option_type === p3.option_type &&
      p1.current_quantity === p3.current_quantity &&
      p2.current_quantity === p1.current_quantity * 2
    ) {
      await this.createStrategy(userId, 'butterfly', symbol, positions, 'neutral');
      return { strategiesCreated: 1, positionsGrouped: 3 };
    }

    return null;
  }

  /**
   * Detect Iron Butterfly: Straddle + wings (4 legs, same expiration)
   * Pattern: Long put (lower strike), Short put (middle), Short call (middle), Long call (higher strike)
   */
  private static async detectIronButterfly(
    userId: string,
    symbol: string,
    positions: Position[]
  ): Promise<{ strategiesCreated: number; positionsGrouped: number } | null> {
    if (positions.length !== 4) return null;

    // All must have same expiration
    const expirations = new Set(positions.map((p) => p.expiration_date).filter((e): e is string => e !== null));
    if (expirations.size !== 1) return null;

    // Sort by strike price
    const sorted = positions.sort((a, b) => (a.strike_price || 0) - (b.strike_price || 0));
    const [p1, p2, p3, p4] = sorted;

    const allHaveStrikes = [p1, p2, p3, p4].every((p) => typeof p.strike_price === 'number');
    if (!allHaveStrikes) {
      return null;
    }

    const p1Strike = p1.strike_price as number;
    const p2Strike = p2.strike_price as number;
    const p3Strike = p3.strike_price as number;
    const p4Strike = p4.strike_price as number;

    // Check for iron butterfly pattern
    // Pattern 1: Long put, Short put, Short call, Long call (all at middle strike for short legs)
    if (
      p1.option_type === 'put' &&
      p1.side === 'long' &&
      p2.option_type === 'put' &&
      p2.side === 'short' &&
      p2Strike === p3Strike && // Middle strike
      p3.option_type === 'call' &&
      p3.side === 'short' &&
      p4.option_type === 'call' &&
      p4.side === 'long' &&
      p1Strike < p2Strike &&
      p4Strike > p3Strike
    ) {
      await this.createStrategy(userId, 'iron_butterfly', symbol, positions, 'neutral');
      return { strategiesCreated: 1, positionsGrouped: 4 };
    }

    return null;
  }

  /**
   * Detect Calendar Spread (Horizontal Spread): Same strike, different expirations
   */
  private static async detectCalendarSpread(
    userId: string,
    symbol: string,
    positions: Position[]
  ): Promise<{ strategiesCreated: number; positionsGrouped: number; detectedPositionIds: string[] } | null> {
    if (positions.length !== 2) return null;

    const [p1, p2] = positions;

    // Check if same option type, same strike, different expirations, opposite sides
    if (
      p1.option_type === p2.option_type &&
      p1.strike_price === p2.strike_price &&
      p1.expiration_date !== p2.expiration_date &&
      p1.expiration_date !== null &&
      p2.expiration_date !== null &&
      p1.side !== p2.side
    ) {
      await this.createStrategy(userId, 'calendar_spread', symbol, positions, 'neutral');
      return { strategiesCreated: 1, positionsGrouped: 2, detectedPositionIds: [p1.id, p2.id] };
    }

    return null;
  }

  /**
   * Detect Diagonal Spread: Different strikes AND different expirations
   */
  private static async detectDiagonalSpread(
    userId: string,
    symbol: string,
    positions: Position[]
  ): Promise<{ strategiesCreated: number; positionsGrouped: number; detectedPositionIds: string[] } | null> {
    if (positions.length !== 2) return null;

    const [p1, p2] = positions;

    // Check if same option type, different strikes, different expirations, opposite sides
    if (
      p1.option_type === p2.option_type &&
      p1.strike_price !== p2.strike_price &&
      p1.expiration_date !== p2.expiration_date &&
      p1.expiration_date !== null &&
      p2.expiration_date !== null &&
      p1.side !== p2.side
    ) {
      // Determine direction based on strike and expiration
      const isCall = p1.option_type === 'call';
      const longLeg = p1.side === 'long' ? p1 : p2;
      const shortLeg = p1.side === 'short' ? p1 : p2;
      
      // For calls: bullish if long leg has lower strike, bearish if higher strike
      // For puts: bullish if long leg has higher strike, bearish if lower strike
      let direction: 'bullish' | 'bearish' | 'neutral' = 'neutral';
      if (isCall) {
        direction = (longLeg.strike_price || 0) < (shortLeg.strike_price || 0) ? 'bullish' : 'bearish';
      } else {
        direction = (longLeg.strike_price || 0) > (shortLeg.strike_price || 0) ? 'bullish' : 'bearish';
      }

      await this.createStrategy(userId, 'diagonal_spread', symbol, positions, direction);
      return { strategiesCreated: 1, positionsGrouped: 2, detectedPositionIds: [p1.id, p2.id] };
    }

    return null;
  }

  /**
   * Detect Ratio Spread: Unequal quantities (e.g., 1-2, 2-3, etc.)
   */
  private static async detectRatioSpread(
    userId: string,
    symbol: string,
    positions: Position[]
  ): Promise<{ strategiesCreated: number; positionsGrouped: number } | null> {
    if (positions.length !== 2) return null;

    const [p1, p2] = positions;

    // Check if same option type, same expiration, different strikes, opposite sides, unequal quantities
    if (
      p1.option_type === p2.option_type &&
      p1.expiration_date === p2.expiration_date &&
      p1.strike_price !== p2.strike_price &&
      p1.side !== p2.side &&
      p1.current_quantity !== p2.current_quantity
    ) {
      // Determine direction
      const isDebit = p1.side === 'long' || p2.side === 'long';
      const direction =
        p1.option_type === 'call'
          ? isDebit
            ? 'bullish'
            : 'bearish'
          : isDebit
          ? 'bearish'
          : 'bullish';

      await this.createStrategy(userId, 'ratio_spread', symbol, positions, direction);
      return { strategiesCreated: 1, positionsGrouped: 2 };
    }

    return null;
  }

  /**
   * Detect cross-expiration strategies (calendar and diagonal spreads)
   * Checks all pairs of positions for cross-expiration patterns
   */
  private static async detectCrossExpirationStrategies(
    userId: string,
    symbol: string,
    positions: Position[]
  ): Promise<{ strategiesCreated: number; positionsGrouped: number; detectedPositionIds: string[] } | null> {
    const optionPositions = positions.filter((p) => p.asset_type === 'option');
    if (optionPositions.length < 2) return null;

    // Try all pairs for calendar and diagonal spreads
    for (let i = 0; i < optionPositions.length; i++) {
      for (let j = i + 1; j < optionPositions.length; j++) {
        const pair = [optionPositions[i], optionPositions[j]];
        
        // Try calendar spread first (more specific - same strike)
        const calendarResult = await this.detectCalendarSpread(userId, symbol, pair);
        if (calendarResult) return calendarResult;

        // Try diagonal spread
        const diagonalResult = await this.detectDiagonalSpread(userId, symbol, pair);
        if (diagonalResult) return diagonalResult;
      }
    }

    return null;
  }

  /**
   * Create a strategy from positions
   */
  private static async createStrategy(
    userId: string,
    strategyType: StrategyType,
    symbol: string,
    positions: Position[],
    direction: 'bullish' | 'bearish' | 'neutral' | null
  ): Promise<Strategy> {
    const legs: StrategyLeg[] = positions.map((p) => ({
      strike: p.strike_price,
      expiration: p.expiration_date,
      option_type: p.option_type,
      side: p.side,
      quantity: p.opening_quantity,
      opening_price: p.average_opening_price,
      position_id: p.id,
    }));

    const totalOpeningCost = positions.reduce((sum, p) => sum + p.total_cost_basis, 0);
    const earliestOpen = positions.reduce(
      (earliest, p) => {
        return new Date(p.opened_at) < new Date(earliest) ? p.opened_at : earliest;
      },
      positions[0].opened_at
    );

    // Find primary expiration (most common or earliest)
    const expirations = positions
      .map((p) => p.expiration_date)
      .filter((e): e is string => e !== null);
    const primaryExpiration = expirations.length > 0 ? expirations[0] : null;

    const strategyInsert: StrategyInsert = {
      user_id: userId,
      strategy_type: strategyType,
      underlying_symbol: symbol,
      direction,
      entry_time: null,
      leg_count: positions.length,
      legs,
      opened_at: earliestOpen,
      expiration_date: primaryExpiration,
      total_opening_cost: totalOpeningCost,
      total_closing_proceeds: 0,
      realized_pl: 0,
      unrealized_pl: 0,
      max_risk: null, // TODO: Calculate based on strategy type
      max_profit: null, // TODO: Calculate based on strategy type
      breakeven_points: [],
      status: 'open',
      notes: null,
      tags: [],
      is_adjustment: false,
      original_strategy_id: null,
      adjusted_from_strategy_id: null,
    };

    const strategy = await StrategyRepository.create(strategyInsert);

    // Link positions to strategy
    for (const position of positions) {
      await PositionRepository.update(position.id, { strategy_id: strategy.id });
    }

    logger.debug('Created strategy', { strategyType, symbol, strategyId: strategy.id });

    return strategy;
  }

  /**
   * Create a single-position strategy
   */
  private static async createSinglePositionStrategy(
    userId: string,
    position: Position,
    strategyType: StrategyType
  ): Promise<Strategy> {
    const legs: StrategyLeg[] = [
      {
        strike: position.strike_price,
        expiration: position.expiration_date,
        option_type: position.option_type,
        side: position.side,
        quantity: position.opening_quantity,
        opening_price: position.average_opening_price,
        position_id: position.id,
      },
    ];

    const strategyInsert: StrategyInsert = {
      user_id: userId,
      strategy_type: strategyType,
      underlying_symbol: position.symbol,
      direction: null,
      entry_time: null,
      leg_count: 1,
      legs,
      opened_at: position.opened_at,
      expiration_date: position.expiration_date,
      total_opening_cost: position.total_cost_basis,
      total_closing_proceeds: 0,
      realized_pl: 0,
      unrealized_pl: 0,
      max_risk: null,
      max_profit: null,
      breakeven_points: [],
      status: 'open',
      notes: null,
      tags: [],
      is_adjustment: false,
      original_strategy_id: null,
      adjusted_from_strategy_id: null,
    };

    const strategy = await StrategyRepository.create(strategyInsert);

    // Link position to strategy
    await PositionRepository.update(position.id, { strategy_id: strategy.id });

    return strategy;
  }
}
