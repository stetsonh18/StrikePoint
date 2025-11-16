import { PositionRepository, StrategyRepository } from '../repositories';
import type { Position, StrategyInsert, Strategy, StrategyType } from '@/domain/types';

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
    console.log('Starting strategy detection for user:', userId);

    // Get all open positions without a strategy
    const unmatchedPositions = await PositionRepository.getAll(userId, {
      status: 'open',
    });

    const positionsWithoutStrategy = unmatchedPositions.filter((p) => !p.strategy_id);

    console.log(`Found ${positionsWithoutStrategy.length} positions without strategies`);

    // Group positions by underlying symbol and expiration date
    const groupedBySymbol = this.groupPositionsBySymbol(positionsWithoutStrategy);

    let strategiesCreated = 0;
    let positionsGrouped = 0;

    // Analyze each group for strategy patterns
    for (const [symbol, positions] of Object.entries(groupedBySymbol)) {
      // Group by expiration date for same-expiration strategies
      const byExpiration = this.groupByExpiration(positions);

      for (const [expiration, expirationPositions] of Object.entries(byExpiration)) {
        const result = await this.detectStrategyPattern(userId, symbol, expirationPositions);
        if (result) {
          strategiesCreated += result.strategiesCreated;
          positionsGrouped += result.positionsGrouped;
        }
      }
    }

    console.log(
      `Strategy detection complete: ${strategiesCreated} strategies created, ${positionsGrouped} positions grouped`
    );

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

    // Try to detect specific patterns
    const detected =
      (await this.detectIronCondor(userId, symbol, optionPositions)) ||
      (await this.detectVerticalSpread(userId, symbol, optionPositions)) ||
      (await this.detectStraddle(userId, symbol, optionPositions)) ||
      (await this.detectStrangle(userId, symbol, optionPositions)) ||
      (await this.detectButterfly(userId, symbol, optionPositions));

    if (detected) {
      strategiesCreated += detected.strategiesCreated;
      positionsGrouped += detected.positionsGrouped;
    } else {
      // No pattern detected - create individual strategies
      for (const position of optionPositions) {
        await this.createSinglePositionStrategy(userId, position, 'single_option');
        strategiesCreated++;
        positionsGrouped++;
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
      const strategy = await this.createStrategy(
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
   * Create a strategy from positions
   */
  private static async createStrategy(
    userId: string,
    strategyType: StrategyType,
    symbol: string,
    positions: Position[],
    direction: 'bullish' | 'bearish' | 'neutral' | null
  ): Promise<Strategy> {
    const legs = positions.map((p) => ({
      strike: p.strike_price,
      expiration: p.expiration_date,
      optionType: p.option_type,
      side: p.side,
      quantity: p.opening_quantity,
      openingPrice: p.average_opening_price,
    }));

    const totalOpeningCost = positions.reduce((sum, p) => sum + p.total_cost_basis, 0);
    const earliestOpen = positions.reduce(
      (earliest, p) => (p.opened_at < earliest ? p.opened_at : earliest),
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
      leg_count: positions.length,
      legs: legs as any,
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
      closed_at: null,
    };

    const strategy = await StrategyRepository.create(strategyInsert);

    // Link positions to strategy
    for (const position of positions) {
      await PositionRepository.update(position.id, { strategy_id: strategy.id });
    }

    console.log(`Created ${strategyType} strategy for ${symbol}:`, strategy.id);

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
    const legs = [
      {
        strike: position.strike_price,
        expiration: position.expiration_date,
        optionType: position.option_type,
        side: position.side,
        quantity: position.opening_quantity,
        openingPrice: position.average_opening_price,
      },
    ];

    const strategyInsert: StrategyInsert = {
      user_id: userId,
      strategy_type: strategyType,
      underlying_symbol: position.symbol,
      direction: null,
      leg_count: 1,
      legs: legs as any,
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
      closed_at: null,
    };

    const strategy = await StrategyRepository.create(strategyInsert);

    // Link position to strategy
    await PositionRepository.update(position.id, { strategy_id: strategy.id });

    return strategy;
  }
}
