import { PositionRepository } from '@/infrastructure/repositories/position.repository';
import { StrategyRepository } from '@/infrastructure/repositories/strategy.repository';
import type { Position } from '@/domain/types';

type RealizedPosition = Awaited<ReturnType<typeof PositionRepository.getRealizedPLByDateRange>>[number];
type RealizedPositionLike = Pick<
  Position,
  'realized_pl'
  | 'asset_type'
  | 'status'
  | 'total_cost_basis'
  | 'side'
  | 'opening_quantity'
  | 'average_opening_price'
  | 'multiplier'
  | 'current_quantity'
  | 'total_closing_amount'
> & {
  strategy_id?: string | null;
};

function getFallbackCostBasis(position: RealizedPositionLike): number | null {
  const openingQuantity = position.opening_quantity ?? 0;
  const averageOpeningPrice = position.average_opening_price ?? 0;
  if (!openingQuantity || !averageOpeningPrice) {
    return null;
  }

  const multiplier = Number(position.multiplier || 100);
  const rawCostBasis = Math.abs(openingQuantity * averageOpeningPrice * multiplier);
  return position.side === 'short' ? rawCostBasis : -rawCostBasis;
}

export function getAdjustedPositionRealizedPL(position: RealizedPositionLike): number {
  let realizedPL = Number(position.realized_pl || 0);

  const isFinalizedStatus = position.status === 'expired' || position.status === 'closed';
  const isFullyClosed = (position.current_quantity ?? 0) === 0;
  const closingAmount = position.total_closing_amount ?? 0;

  if (
    position.asset_type === 'option' &&
    isFinalizedStatus &&
    isFullyClosed &&
    closingAmount === 0 &&
    realizedPL === 0
  ) {
    const fallbackCostBasis = getFallbackCostBasis(position);
    const totalCostBasis = Number(position.total_cost_basis || 0);
    if (totalCostBasis !== 0) {
      realizedPL = totalCostBasis;
    } else if (fallbackCostBasis !== null) {
      realizedPL = fallbackCostBasis;
    }
  }

  return realizedPL;
}

export async function getRealizedPLForDateRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<number> {
  const [realizedPositions, realizedStrategies] = await Promise.all([
    PositionRepository.getRealizedPLByDateRange(userId, startDate, endDate),
    StrategyRepository.getRealizedPLByDateRange(userId, startDate, endDate),
  ]);

  const strategyPositionPLMap = new Map<string, number>();
  realizedPositions.forEach((position) => {
    if (!position.strategy_id) return;
    const adjustedPL = getAdjustedPositionRealizedPL(position);
    strategyPositionPLMap.set(
      position.strategy_id,
      (strategyPositionPLMap.get(position.strategy_id) ?? 0) + adjustedPL
    );
  });

  const excludedStrategyIds = new Set<string>();
  let strategyPL = 0;
  realizedStrategies.forEach((strategy) => {
    const strategyRealizedPL = Number(strategy.realized_pl || 0);
    if (strategyRealizedPL !== 0) {
      strategyPL += strategyRealizedPL;
      excludedStrategyIds.add(strategy.id);
    }
  });

  const positionPL = realizedPositions
    .filter((position) => !position.strategy_id || !excludedStrategyIds.has(position.strategy_id))
    .reduce((sum, position) => sum + getAdjustedPositionRealizedPL(position), 0);

  return positionPL + strategyPL;
}
