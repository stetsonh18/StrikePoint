import { PositionRepository } from '@/infrastructure/repositories/position.repository';
import { StrategyRepository } from '@/infrastructure/repositories/strategy.repository';
import type { Position } from '@/domain/types';

type RealizedPosition = Awaited<ReturnType<typeof PositionRepository.getRealizedPLByDateRange>>[number];
type RealizedPositionLike = Pick<Position, 'realized_pl' | 'asset_type' | 'status' | 'total_cost_basis'> & {
  strategy_id?: string | null;
};

export function getAdjustedPositionRealizedPL(position: RealizedPositionLike): number {
  let realizedPL = position.realized_pl || 0;

  if (
    position.asset_type === 'option' &&
    position.status === 'expired' &&
    realizedPL === 0 &&
    position.total_cost_basis &&
    position.total_cost_basis !== 0
  ) {
    realizedPL = position.total_cost_basis;
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
