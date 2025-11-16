// AI Insights Types
export type InsightType =
  | 'pattern_recognition'
  | 'risk_warning'
  | 'opportunity'
  | 'performance_analysis'
  | 'strategy_suggestion'
  | 'market_condition'
  | 'position_sizing'
  | 'diversification'
  | 'general';

export type InsightPriority = 'low' | 'medium' | 'high' | 'critical';

export interface AIInsight {
  id: string;
  userId: string;
  type: InsightType;
  priority: InsightPriority;
  title: string;
  description: string;
  analysis: string;
  recommendations?: string[];

  // Related data
  relatedSymbols?: string[];
  relatedTradeIds?: string[];
  relatedMetrics?: Record<string, number>;

  // Charts or visualizations
  chartData?: any;

  // Actions
  actionable: boolean;
  actionTaken?: boolean;
  actionDate?: string;

  // AI metadata
  confidence?: number; // 0-100
  generatedAt: string;
  modelVersion?: string;

  // User interaction
  isRead: boolean;
  isDismissed: boolean;
  userRating?: number; // 1-5 stars for feedback
  userNotes?: string;

  createdAt: string;
  updatedAt: string;
}

// Performance Analysis Insight
export interface PerformanceInsight {
  winRate: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number;
  sharpeRatio?: number;
  maxDrawdown: number;
  bestTrade: {
    symbol: string;
    profitLoss: number;
    date: string;
  };
  worstTrade: {
    symbol: string;
    profitLoss: number;
    date: string;
  };
  insights: string[];
  recommendations: string[];
}

// Pattern Recognition
export interface TradingPattern {
  id: string;
  name: string;
  description: string;
  occurrences: number;
  successRate: number;
  avgProfitLoss: number;
  conditions: string[];
  exampleTradeIds: string[];
}

// Market Condition Analysis
export interface MarketCondition {
  date: string;
  condition: 'bullish' | 'bearish' | 'neutral' | 'volatile' | 'ranging';
  confidence: number;
  indicators: {
    name: string;
    value: number;
    signal: 'bullish' | 'bearish' | 'neutral';
  }[];
  description: string;
  tradingRecommendation: string;
}

// Risk Assessment
export interface RiskAssessment {
  overallRisk: 'low' | 'medium' | 'high' | 'extreme';
  riskScore: number; // 0-100
  factors: {
    name: string;
    level: 'low' | 'medium' | 'high';
    description: string;
    recommendation: string;
  }[];
  positionSizing: {
    recommended: number;
    current: number;
    reasoning: string;
  };
  diversificationScore: number; // 0-100
  concentrationRisks: {
    symbol: string;
    percentage: number;
    risk: string;
  }[];
}

// Opportunity Detection
export interface TradingOpportunity {
  id: string;
  symbol: string;
  type: 'entry' | 'exit' | 'adjustment';
  strategy: string;
  description: string;
  reasoning: string;
  setup: {
    entry?: number;
    stopLoss?: number;
    target?: number;
    riskRewardRatio?: number;
  };
  confidence: number;
  timeframe: string;
  expiresAt?: string;
  status: 'active' | 'expired' | 'acted_on' | 'dismissed';
  createdAt: string;
}
