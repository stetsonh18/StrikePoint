// News Types
export type NewsCategory = 'market' | 'company' | 'crypto' | 'economy' | 'earnings' | 'regulatory' | 'analyst' | 'general';
export type NewsSentiment = 'bullish' | 'bearish' | 'neutral';

export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  content?: string;
  author?: string;
  source: string;
  sourceUrl: string;
  publishedAt: string;
  imageUrl?: string;
  category: NewsCategory;
  sentiment?: NewsSentiment;
  symbols?: string[]; // Related tickers
  keywords?: string[];
  isFavorite?: boolean;
  createdAt: string;
}

export interface NewsFilter {
  category?: NewsCategory;
  sentiment?: NewsSentiment;
  symbols?: string[];
  sources?: string[];
  dateFrom?: string;
  dateTo?: string;
  searchQuery?: string;
}

export interface NewsFeed {
  articles: NewsArticle[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
