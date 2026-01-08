/**
 * Tests for automatic strategy update when all positions are closed
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PositionRepository } from '../position.repository';
import { StrategyRepository } from '../strategy.repository';
import { supabase } from '../../api/supabase';

// Mock the dependencies
vi.mock('../../api/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('../strategy.repository', () => ({
  StrategyRepository: {
    update: vi.fn(),
  },
}));

describe('PositionRepository - Strategy Auto-Update', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update strategy when last position is closed', async () => {
    const strategyId = 'strategy-123';
    const positionId = 'position-1';

    // Mock the position being closed
    const mockPosition = {
      id: positionId,
      strategy_id: strategyId,
      status: 'open',
      current_quantity: 10,
      realized_pl: 0,
      total_cost_basis: 100,
      total_closing_amount: 0,
      closing_transaction_ids: [],
    };

    // Mock the updated position after closing
    const mockUpdatedPosition = {
      ...mockPosition,
      status: 'closed',
      current_quantity: 0,
      realized_pl: 50,
      total_closing_amount: 150,
      closed_at: '2026-01-06T20:00:00Z',
      closing_transaction_ids: ['tx-1'],
    };

    // Mock all positions in the strategy (2 legs, both now closed)
    const mockAllPositions = [
      {
        id: 'position-1',
        status: 'closed',
        realized_pl: 50,
        closed_at: '2026-01-06T20:00:00Z',
        total_cost_basis: 100,
        total_closing_amount: 150,
      },
      {
        id: 'position-2',
        status: 'closed',
        realized_pl: 30,
        closed_at: '2026-01-06T19:30:00Z',
        total_cost_basis: 80,
        total_closing_amount: 110,
      },
    ];

    // Setup mocks
    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockResolvedValue({ data: mockAllPositions, error: null });
    const mockUpdate = vi.fn().mockResolvedValue({ data: mockUpdatedPosition, error: null });
    const mockGetById = vi.fn().mockResolvedValue(mockPosition);

    (supabase.from as any).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      update: mockUpdate,
    });

    // Mock PositionRepository.getById
    vi.spyOn(PositionRepository, 'getById').mockResolvedValue(mockPosition as any);
    vi.spyOn(PositionRepository, 'update').mockResolvedValue(mockUpdatedPosition as any);

    // Call closePosition (this should trigger strategy update)
    await PositionRepository.closePosition(
      positionId,
      10, // closing all shares
      'tx-1',
      150,
      50,
      '2026-01-06T20:00:00Z'
    );

    // Verify StrategyRepository.update was called with correct values
    expect(StrategyRepository.update).toHaveBeenCalledWith(strategyId, {
      status: 'closed',
      realized_pl: 80, // 50 + 30 from both legs
      unrealized_pl: 0,
      closed_at: '2026-01-06T20:00:00Z', // Latest of the two close dates
      total_opening_cost: 180, // 100 + 80
      total_closing_proceeds: 260, // 150 + 110
    });
  });

  it('should not update strategy if not all positions are closed', async () => {
    const strategyId = 'strategy-123';
    const positionId = 'position-1';

    const mockPosition = {
      id: positionId,
      strategy_id: strategyId,
      status: 'open',
      current_quantity: 10,
    };

    const mockUpdatedPosition = {
      ...mockPosition,
      status: 'closed',
      current_quantity: 0,
      closed_at: '2026-01-06T20:00:00Z',
    };

    // Mock all positions - one closed, one still open
    const mockAllPositions = [
      {
        id: 'position-1',
        status: 'closed',
        realized_pl: 50,
        closed_at: '2026-01-06T20:00:00Z',
      },
      {
        id: 'position-2',
        status: 'open', // Still open!
        realized_pl: 0,
        closed_at: null,
      },
    ];

    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockResolvedValue({ data: mockAllPositions, error: null });

    (supabase.from as any).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
    });

    vi.spyOn(PositionRepository, 'getById').mockResolvedValue(mockPosition as any);
    vi.spyOn(PositionRepository, 'update').mockResolvedValue(mockUpdatedPosition as any);

    await PositionRepository.closePosition(
      positionId,
      10,
      'tx-1',
      150,
      50,
      '2026-01-06T20:00:00Z'
    );

    // Strategy should NOT be updated because position-2 is still open
    expect(StrategyRepository.update).not.toHaveBeenCalled();
  });

  it('should set strategy status to "expired" if any leg expired', async () => {
    const strategyId = 'strategy-123';

    const mockAllPositions = [
      {
        id: 'position-1',
        status: 'expired', // Expired!
        realized_pl: 50,
        closed_at: '2026-01-06T20:00:00Z',
        total_cost_basis: 100,
        total_closing_amount: 150,
      },
      {
        id: 'position-2',
        status: 'closed',
        realized_pl: 30,
        closed_at: '2026-01-06T19:30:00Z',
        total_cost_basis: 80,
        total_closing_amount: 110,
      },
    ];

    const mockUpdatedPosition = {
      id: 'position-1',
      strategy_id: strategyId,
      status: 'expired',
    };

    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockResolvedValue({ data: mockAllPositions, error: null });

    (supabase.from as any).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
    });

    vi.spyOn(PositionRepository, 'getById').mockResolvedValue({ strategy_id: strategyId } as any);
    vi.spyOn(PositionRepository, 'update').mockResolvedValue(mockUpdatedPosition as any);

    await PositionRepository.updateStatus('position-1', 'expired', '2026-01-06T20:00:00Z');

    // Strategy status should be 'expired', not 'closed'
    expect(StrategyRepository.update).toHaveBeenCalledWith(
      strategyId,
      expect.objectContaining({
        status: 'expired',
      })
    );
  });
});
