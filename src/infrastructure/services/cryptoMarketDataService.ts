/**
 * Crypto Market Data Service
 * Handles fetching real-time cryptocurrency data from CoinGecko API
 * Documentation: https://docs.coingecko.com/v3.0.1/reference/introduction
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
    throw new Error('You must be signed in to view crypto data.');
  }

  return {
    Authorization: `Bearer ${data.session.access_token}`,
    'Content-Type': 'application/json',
  };
}

const coinIdCache = new Map<string, string | null>();
const inflightCoinIdRequests = new Map<string, Promise<string | null>>();

const normalizeSymbol = (symbol: string) => symbol.trim().toUpperCase();

export interface CryptoSearchResult {
  id: string;           // CoinGecko ID (e.g., 'bitcoin')
  symbol: string;       // Symbol (e.g., 'BTC')
  name: string;         // Name (e.g., 'Bitcoin')
  market_cap_rank?: number;
  thumb?: string;       // Small image URL
  large?: string;       // Large image URL
}

export interface CryptoQuote {
  id: string;
  symbol: string;
  name: string;
  image?: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  circulating_supply: number;
  total_supply: number;
  max_supply: number | null;
  ath: number;           // All-time high
  ath_change_percentage: number;
  ath_date: string;
  atl: number;           // All-time low
  atl_change_percentage: number;
  atl_date: string;
  last_updated: string;
}

/**
 * Search for cryptocurrencies using CoinGecko API
 * Documentation: https://docs.coingecko.com/v3.0.1/reference/search
 */
export async function searchCrypto(query: string): Promise<CryptoSearchResult[]> {
  if (!query || query.length < 1) {
    return [];
  }

  try {
    // Call Supabase Edge Function (API key is handled server-side)
    const apiUrl = `${EDGE_FUNCTIONS_BASE_URL}/coingecko-search?query=${encodeURIComponent(query)}`;
    const headers = await getEdgeAuthHeaders();
    const response = await fetch(apiUrl, { headers });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('[searchCrypto] Backend API Error', new Error(errorText));
      throw new Error(`Backend API error: ${response.status}`);
    }

    const data = await response.json();

    // Parse CoinGecko response format
    // Response: { coins: [...], exchanges: [...], categories: [...], nfts: [...] }
    if (data.coins && Array.isArray(data.coins)) {
      const results: CryptoSearchResult[] = data.coins.map((coin: any) => ({
        id: coin.id || '',
        symbol: (coin.symbol || '').toUpperCase(),
        name: coin.name || '',
        market_cap_rank: coin.market_cap_rank,
        thumb: coin.thumb,
        large: coin.large,
      })).filter((r: CryptoSearchResult) => r.id && r.symbol && r.name);

      return results;
    }

    return [];
  } catch (error) {
    logger.error('[searchCrypto] Error searching crypto', error);
    return [];
  }
}

/**
 * Get real-time quote for a cryptocurrency using CoinGecko API
 * We need to use the coin ID, not the symbol
 * Documentation: https://docs.coingecko.com/v3.0.1/reference/coins-markets
 */
export async function getCryptoQuote(coinId: string): Promise<CryptoQuote | null> {
  if (!coinId) {
    return null;
  }

  try {
    // Call Supabase Edge Function (API key is handled server-side)
    const apiUrl = `${EDGE_FUNCTIONS_BASE_URL}/coingecko-markets?ids=${encodeURIComponent(coinId)}&vs_currency=usd&per_page=1&page=1`;
    const headers = await getEdgeAuthHeaders();
    const response = await fetch(apiUrl, { headers });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Response is an array with one item
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error(`No data found for ${coinId}`);
    }

    const coin = data[0];

    return {
      id: coin.id || coinId,
      symbol: (coin.symbol || '').toUpperCase(),
      name: coin.name || '',
      image: coin.image || undefined,
      current_price: coin.current_price || 0,
      market_cap: coin.market_cap || 0,
      market_cap_rank: coin.market_cap_rank || 0,
      total_volume: coin.total_volume || 0,
      high_24h: coin.high_24h || 0,
      low_24h: coin.low_24h || 0,
      price_change_24h: coin.price_change_24h || 0,
      price_change_percentage_24h: coin.price_change_percentage_24h || 0,
      circulating_supply: coin.circulating_supply || 0,
      total_supply: coin.total_supply || 0,
      max_supply: coin.max_supply,
      ath: coin.ath || 0,
      ath_change_percentage: coin.ath_change_percentage || 0,
      ath_date: coin.ath_date || '',
      atl: coin.atl || 0,
      atl_change_percentage: coin.atl_change_percentage || 0,
      atl_date: coin.atl_date || '',
      last_updated: coin.last_updated || new Date().toISOString(),
    };
  } catch (error) {
    logger.error(`[getCryptoQuote] Error fetching quote for ${coinId}`, error);
    return null;
  }
}

/**
 * Get real-time quotes for multiple cryptocurrencies by their IDs
 */
export async function getCryptoQuotes(coinIds: string[]): Promise<Record<string, CryptoQuote>> {
  if (coinIds.length === 0) {
    return {};
  }

  try {
    // Call backend proxy endpoint (API key is handled server-side)
    const idsParam = coinIds.join(',');
    const apiUrl = `${EDGE_FUNCTIONS_BASE_URL}/coingecko-markets?ids=${encodeURIComponent(idsParam)}&vs_currency=usd&per_page=${coinIds.length}&page=1`;
    const headers = await getEdgeAuthHeaders();
    const response = await fetch(apiUrl, { headers });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    const quotes: Record<string, CryptoQuote> = {};

    if (Array.isArray(data)) {
      data.forEach((coin: any) => {
        const quote: CryptoQuote = {
          id: coin.id || '',
          symbol: (coin.symbol || '').toUpperCase(),
          name: coin.name || '',
          image: coin.image || undefined,
          current_price: coin.current_price || 0,
          market_cap: coin.market_cap || 0,
          market_cap_rank: coin.market_cap_rank || 0,
          total_volume: coin.total_volume || 0,
          high_24h: coin.high_24h || 0,
          low_24h: coin.low_24h || 0,
          price_change_24h: coin.price_change_24h || 0,
          price_change_percentage_24h: coin.price_change_percentage_24h || 0,
          circulating_supply: coin.circulating_supply || 0,
          total_supply: coin.total_supply || 0,
          max_supply: coin.max_supply,
          ath: coin.ath || 0,
          ath_change_percentage: coin.ath_change_percentage || 0,
          ath_date: coin.ath_date || '',
          atl: coin.atl || 0,
          atl_change_percentage: coin.atl_change_percentage || 0,
          atl_date: coin.atl_date || '',
          last_updated: coin.last_updated || new Date().toISOString(),
        };

        // Use symbol as key for easy lookup
        quotes[quote.symbol] = quote;
      });
    }

    return quotes;
  } catch (error) {
    logger.error('[getCryptoQuotes] Error fetching quotes', error);
    return {};
  }
}

/**
 * Get CoinGecko ID from symbol
 * This is a helper function since CoinGecko uses IDs instead of symbols
 */
export async function getCoinIdFromSymbol(symbol: string): Promise<string | null> {
  const normalizedSymbol = normalizeSymbol(symbol);
  if (!normalizedSymbol) {
    return null;
  }

  if (coinIdCache.has(normalizedSymbol)) {
    return coinIdCache.get(normalizedSymbol) || null;
  }

  const inflight = inflightCoinIdRequests.get(normalizedSymbol);
  if (inflight) {
    return inflight;
  }

  const requestPromise = (async () => {
    try {
      const searchResults = await searchCrypto(normalizedSymbol);

      // Find exact symbol match (case-insensitive)
      const exactMatch = searchResults.find(
        (result) => normalizeSymbol(result.symbol) === normalizedSymbol
      );

      if (exactMatch) {
        coinIdCache.set(normalizedSymbol, exactMatch.id);
        return exactMatch.id;
      }

      if (searchResults.length > 0) {
        const fallbackId = searchResults[0].id;
        coinIdCache.set(normalizedSymbol, fallbackId);
        return fallbackId;
      }

      coinIdCache.set(normalizedSymbol, null);
      return null;
    } catch (error) {
      logger.error('[getCoinIdFromSymbol] Error', error);
      coinIdCache.set(normalizedSymbol, null);
      throw error;
    } finally {
      inflightCoinIdRequests.delete(normalizedSymbol);
    }
  })().catch(() => null);

  inflightCoinIdRequests.set(normalizedSymbol, requestPromise);
  return requestPromise;
}


