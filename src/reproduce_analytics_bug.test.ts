import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PerformanceMetricsService } from './src/infrastructure/services/performanceMetricsService';
import { PositionRepository } from './src/infrastructure/repositories/position.repository';
import { StrategyRepository } from './src/infrastructure/repositories/strategy.repository';

// Mock the repositories
vi.mock('./src/infrastructure/repositories/position.repository', () => ({
    PositionRepository: {
        getAll: vi.fn(),
    },
}));

vi.mock('./src/infrastructure/repositories/strategy.repository', () => ({
    StrategyRepository: {
        getAll: vi.fn(),
    },
}));

describe('PerformanceMetricsService - Day of Week Timezone Issue', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should correctly categorize a Friday trade (UTC afternoon, PST morning)', async () => {
        // Friday Nov 24 2023 20:00:00 UTC
        // PST (UTC-8): Friday Nov 24 12:00:00
        const fridayTrade = {
            id: '1',
            user_id: 'user1',
            status: 'closed',
            closed_at: '2023-11-24T20:00:00Z',
            realized_pl: 100,
            opened_at: '2023-11-24T10:00:00Z',
            current_quantity: 0,
            initial_quantity: 1,
            side: 'long',
            symbol: 'AAPL',
            asset_type: 'stock',
        };

        vi.mocked(PositionRepository.getAll).mockResolvedValue([fridayTrade] as any);
        vi.mocked(StrategyRepository.getAll).mockResolvedValue([]);

        const result = await PerformanceMetricsService.calculateDayOfWeekPerformance('user1');
        const friday = result.find(d => d.dayOfWeek === 'Friday');

        console.log('Friday result (UTC afternoon):', friday);
        expect(friday?.pl).toBe(100);
    });

    it('should correctly categorize a Friday trade (UTC late night, PST afternoon)', async () => {
        // Saturday Nov 25 2023 02:00:00 UTC
        // PST (UTC-8): Friday Nov 24 18:00:00
        const fridayLateTrade = {
            id: '2',
            user_id: 'user1',
            status: 'closed',
            closed_at: '2023-11-25T02:00:00Z',
            realized_pl: 200,
            opened_at: '2023-11-24T10:00:00Z',
            current_quantity: 0,
            initial_quantity: 1,
            side: 'long',
            symbol: 'AAPL',
            asset_type: 'stock',
        };

        vi.mocked(PositionRepository.getAll).mockResolvedValue([fridayLateTrade] as any);
        vi.mocked(StrategyRepository.getAll).mockResolvedValue([]);

        const result = await PerformanceMetricsService.calculateDayOfWeekPerformance('user1');
        const friday = result.find(d => d.dayOfWeek === 'Friday');
        const saturday = result.find(d => d.dayOfWeek === 'Saturday');

        console.log('Friday result (UTC late night/Sat morning):', friday);
        console.log('Saturday result (UTC late night/Sat morning):', saturday);

        // If running in PST, this should be Friday.
        // If running in UTC, this should be Saturday.
        // We want to see what happens in the test environment.
    });
});
