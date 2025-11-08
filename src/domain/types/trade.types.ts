export type TradeDirection = 'long' | 'short';
export type TradeStatus = 'open' | 'closed';
export type TradeOutcome = 'win' | 'loss' | 'breakeven';

export interface Trade {
  id: string;
  userId: string;
  symbol: string;
  direction: TradeDirection;
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  entryDate: string;
  exitDate?: string;
  status: TradeStatus;
  outcome?: TradeOutcome;
  profitLoss?: number;
  notes?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}
