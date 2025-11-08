export interface TradeStatistics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakevenTrades: number;
  winRate: number;
  totalProfitLoss: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number;
  largestWin: number;
  largestLoss: number;
}

export interface PerformanceMetrics {
  daily: TradeStatistics;
  weekly: TradeStatistics;
  monthly: TradeStatistics;
  allTime: TradeStatistics;
}
