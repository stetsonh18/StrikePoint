import { PositionRepository } from '../repositories/position.repository';
import { StrategyRepository } from '../repositories/strategy.repository';
import { logger } from '@/shared/utils/logger';

/**
 * Utility helpers for multi-leg strategy lifecycle actions.
 * Handles coordinated cleanup of strategies, their legs, and dependent data.
 */
export class StrategyManagementService {
  /**
   * Delete an entire strategy and all of its associated positions.
   * Deleting positions cascades to transactions, cash transactions, and linked journal entries.
   */
  static async deleteStrategyWithPositions(userId: string, strategyId: string): Promise<void> {
    try {
      const strategyPositions = await PositionRepository.getAll(userId, { strategy_id: strategyId });

      for (const position of strategyPositions) {
        await PositionRepository.delete(position.id);
      }

      await StrategyRepository.delete(strategyId);
      logger.info('[StrategyManagementService] Deleted strategy and positions', {
        strategyId,
        deletedLegs: strategyPositions.length,
      });
    } catch (error) {
      logger.error('Failed to delete strategy with positions', error, { strategyId, userId });
      throw error;
    }
  }
}
