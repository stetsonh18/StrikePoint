import { describe, expect, it } from 'vitest';
import { buildTradierOptionSymbol } from '../positionTransformers';

describe('buildTradierOptionSymbol', () => {
  it('formats whole-dollar strikes with OCC precision', () => {
    const symbol = buildTradierOptionSymbol('AAPL', '2024-03-22', 'call', 180);
    expect(symbol).toBe('AAPL240322C00180000');
  });

  it('handles fractional strikes down to 1/1000', () => {
    const symbol = buildTradierOptionSymbol('amd', '2025-01-17', 'put', 47.5);
    expect(symbol).toBe('AMD250117P00047500');
  });

  it('supports mini contracts with very small strikes', () => {
    const symbol = buildTradierOptionSymbol(' spy ', '2025-01-17', 'call', 0.05);
    expect(symbol).toBe('SPY250117C00000050');
  });
});

