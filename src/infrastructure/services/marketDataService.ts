/**
 * Market Data Service
 * Handles fetching real-time market data
 * - Symbol Search: Finnhub API (via Supabase Edge Functions)
 * - Stock Quotes: MarketData.app API (via Supabase Edge Functions)
 *
 * All API calls go through Supabase Edge Functions to keep API keys secure.
 * API keys are stored in Supabase Secrets and never exposed to the frontend.
 */

// Get Supabase URL and construct Edge Functions base URL
import { env } from '@/shared/utils/envValidation';
import { logger } from '@/shared/utils/logger';
import { supabase } from '../api/supabase';

const supabaseUrl = env.supabaseUrl;
const EDGE_FUNCTIONS_BASE_URL = supabaseUrl
  ? `${supabaseUrl}/functions/v1`
  : '/functions/v1';

async function getEdgeAuthHeaders() {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) {
    throw new Error('You must be signed in to access market data.');
  }

  return {
    Authorization: `Bearer ${data.session.access_token}`,
    'Content-Type': 'application/json',
  };
}

export interface SymbolSearchResult {
  symbol: string;
  name: string;
  type: string;
  region: string;
  currency?: string;
}

/**
 * Search for symbols using Tradier API
 * Documentation: https://documentation.tradier.com/brokerage-api/markets/get-lookup
 */
export async function searchSymbolsTradier(query: string): Promise<SymbolSearchResult[]> {
  if (!query || query.length < 1) {
    return [];
  }

  try {
    // Call Supabase Edge Function (Tradier API key is handled server-side)
    const apiUrl = `${EDGE_FUNCTIONS_BASE_URL}/tradier-symbol-search?q=${encodeURIComponent(query)}&types=stock,option,etf`;
    const headers = await getEdgeAuthHeaders();
    const response = await fetch(apiUrl, { headers });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('[searchSymbolsTradier] Backend API Error', new Error(errorText));
      throw new Error(`Backend API error: ${response.status}`);
    }

    const data = await response.json();

    // Check for API errors
    if (data.error) {
      console.warn('[searchSymbolsTradier] Backend API error:', data.error);
      return [];
    }

    // Parse Tradier response format
    // Response: { result: [...] }
    if (data.result && Array.isArray(data.result)) {
      const results = data.result
        .map((item: any) => ({
          symbol: (item.symbol as string) || '',
          name: (item.name as string) || (item.description as string) || (item.symbol as string) || '',
          type: (item.type as string) || 'stock',
          region: item.exchange ? 'United States' : 'United States',
          currency: 'USD',
        }))
        .filter((r: SymbolSearchResult) => r.symbol && r.name); // Filter out invalid entries

      return results;
    }

    return [];
  } catch (error) {
    logger.error('[searchSymbolsTradier] Error searching symbols', error);
    return [];
  }
}

interface StockQuote {
  symbol: string;
  open: number;
  high: number;
  low: number;
  price: number;
  volume: number;
  latestDay: string;
  previousClose: number;
  change: number;
  changePercent: string;
}

/**
 * Search for stock symbols using Finnhub API Symbol Search
 * Documentation: https://finnhub.io/docs/api/symbol-search
 */
export async function searchSymbols(keywords: string): Promise<SymbolSearchResult[]> {
  if (!keywords || keywords.length < 1) {
    return [];
  }

  try {
    // Call Supabase Edge Function (API key is handled server-side)
    const apiUrl = `${EDGE_FUNCTIONS_BASE_URL}/finnhub-symbol-search?keywords=${encodeURIComponent(keywords)}`;
    const headers = await getEdgeAuthHeaders();
    const response = await fetch(apiUrl, { headers });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('[searchSymbols] Backend API Error', new Error(errorText));
      throw new Error(`Backend API error: ${response.status}`);
    }

    const data = await response.json();

    // Check for API errors
    if (data.error) {
      console.warn('[searchSymbols] Backend API error:', data.error);
      return [];
    }

    // Parse Finnhub response format
    // Response: { count: number, result: [...] }
    if (data.result && Array.isArray(data.result)) {
      // Filter for US stocks primarily, but include others
      const results = data.result
        .map((item: any) => {
          // Determine region based on symbol suffix or type
          let region = 'United States';
          const symbol = (item.symbol as string) || '';

          if (symbol.includes('.TO')) region = 'Canada';
          else if (symbol.includes('.L') || symbol.includes('.LON')) region = 'United Kingdom';
          else if (symbol.includes('.HK')) region = 'Hong Kong';
          else if (symbol.includes('.SS') || symbol.includes('.SZ')) region = 'China';
          else if (symbol.includes('.T')) region = 'Japan';
          else if (symbol.includes('.AX')) region = 'Australia';
          else if (symbol.includes('.DE') || symbol.includes('.F')) region = 'Germany';

          return {
            symbol: item.displaySymbol || symbol, // Use displaySymbol for cleaner display
            name: item.description || '',
            type: item.type || 'Common Stock',
            region: region,
            currency: region === 'United States' ? 'USD' : undefined,
          };
        })
        .filter((r: SymbolSearchResult) => r.symbol && r.name); // Filter out invalid entries

      return results;
    }

    return [];
  } catch (error) {
    logger.error('[searchSymbols] Error searching symbols', error);
    return [];
  }
}

/**
 * Get real-time quote for a stock symbol using Tradier API
 * Documentation: https://documentation.tradier.com/brokerage-api/markets/get-quotes
 */
export async function getStockQuote(symbol: string): Promise<StockQuote | null> {
  if (!symbol) {
    return null;
  }

  try {
    // Call Supabase Edge Function for Tradier (access token is handled server-side)
    const quoteUrl = `${EDGE_FUNCTIONS_BASE_URL}/tradier-stock-quote/${encodeURIComponent(symbol)}`;
    const headers = await getEdgeAuthHeaders();
    const response = await fetch(quoteUrl, { headers });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`[getStockQuote] API error for ${symbol}: ${response.status} ${response.statusText}`, new Error(errorText));
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Check for error in response
    if (data.error) {
      logger.error(`[getStockQuote] Error in response for ${symbol}`, new Error(String(data.error)));
      throw new Error(data.error);
    }

    // Validate response status
    if (data.s !== 'ok') {
      logger.error(`[getStockQuote] Invalid response status for ${symbol}`, new Error(String(data.s)));
      throw new Error(`Invalid response status: ${data.s}`);
    }

    // Extract data with proper type safety
    const price = data.last?.[0] ?? 0;
    const volume = data.volume?.[0] ?? 0;
    const change = data.change?.[0] ?? 0;
    const changepct = data.changepct?.[0] ?? 0;
    const previousClose = price - change;

    return {
      symbol,
      open: price,
      high: price,
      low: price,
      price,
      volume,
      latestDay: new Date().toISOString().split('T')[0],
      previousClose,
      change,
      changePercent: `${changepct.toFixed(2)}%`,
    };
  } catch (error) {
    logger.error(`[getStockQuote] Error fetching quote for ${symbol}`, error);
    // Return null to allow graceful degradation in UI
    return null;
  }
}

/**
 * Get real-time quotes for multiple stock symbols
 */
export async function getStockQuotes(symbols: string[]): Promise<Record<string, StockQuote>> {
  if (symbols.length === 0) {
    return {};
  }

  // Fetch quotes in parallel
  const quotePromises = symbols.map(async (symbol) => {
    const quote = await getStockQuote(symbol);
    return { symbol, quote };
  });

  const results = await Promise.all(quotePromises);

  const quotes: Record<string, StockQuote> = {};
  results.forEach(({ symbol, quote }) => {
    if (quote) {
      quotes[symbol] = quote;
    }
  });

  return quotes;
}

export interface MarketNewsArticle {
  id: number;
  category: string;
  datetime: number; // Unix timestamp
  headline: string;
  image: string;
  related: string;
  source: string;
  summary: string;
  url: string;
}

// Category mapping from Finnhub to app categories
const categoryMap: Record<string, string> = {
  'general': 'general',
  'forex': 'market',
  'crypto': 'crypto',
  'merger': 'company',
};

/**
 * Get market news from Finnhub API
 * Documentation: https://finnhub.io/docs/api/general-news
 * Returns articles mapped to NewsArticle interface
 */
export async function getMarketNews(category: string = 'general', minId?: number): Promise<import('@/domain/types').NewsArticle[]> {
  try {
    // Map app category to Finnhub category
    const matchingCategory = Object.entries(categoryMap).find(([, appCat]) => appCat === category);
    const finnhubCategory = matchingCategory?.[0] || category;

    const params = new URLSearchParams({
      category: finnhubCategory,
    });

    if (minId) {
      params.append('minId', minId.toString());
    }

    // Call Supabase Edge Function (API key is handled server-side)
    const apiUrl = `${EDGE_FUNCTIONS_BASE_URL}/finnhub-news?${params.toString()}`;
    const headers = await getEdgeAuthHeaders();
    const response = await fetch(apiUrl, { headers });

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`);
    }

    const data = await response.json();

    // Check for API errors
    if (data.error) {
      console.warn('[getMarketNews] Backend API error:', data.error);
      return [];
    }

    // Parse and map to NewsArticle interface
    if (Array.isArray(data)) {
      return data.map((article: any) => {
        // Parse related symbols (comma-separated string)
        const symbols = article.related
          ? article.related.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0)
          : [];

        // Convert Unix timestamp to ISO string
        const publishedAt = article.datetime
          ? new Date(article.datetime * 1000).toISOString()
          : new Date().toISOString();

        // Map category
        const mappedCategory = categoryMap[article.category] || 'general';

        return {
          id: String(article.id || Date.now()),
          title: article.headline || '',
          summary: article.summary || '',
          source: article.source || '',
          sourceUrl: article.url || '',
          publishedAt,
          imageUrl: article.image || undefined,
          category: mappedCategory as import('@/domain/types').NewsCategory,
          symbols: symbols.length > 0 ? symbols : undefined,
          createdAt: new Date().toISOString(),
        };
      });
    }

    return [];
  } catch (error) {
    logger.error('[getMarketNews] Error fetching market news', error);
    return [];
  }
}

export type { StockQuote };

