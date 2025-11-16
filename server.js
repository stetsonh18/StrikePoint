/**
 * Express API Server for Market Data Proxy
 *
 * This server acts as a proxy between the frontend and external market data APIs.
 * It provides a stable IP address for API providers that require IP whitelisting
 * (such as MarketData.app).
 *
 * Features:
 * - Secure API key storage (server-side only)
 * - CORS configuration for frontend access
 * - Proxy endpoints for MarketData.app, Finnhub, CoinGecko, and Alpha Vantage
 * - Error handling and request logging
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Ensure fetch is available (Node.js 18+ has it built-in)
if (typeof fetch === 'undefined') {
  console.error('Error: fetch is not available. Please use Node.js 18+ or install node-fetch');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3001;

// API Keys - stored server-side only (NOT exposed to frontend)
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
const MARKETDATA_API_TOKEN = process.env.MARKETDATA_API_TOKEN;
const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY;
const ALPHA_VANTAGE_MCP_URL = process.env.ALPHA_VANTAGE_MCP_URL;

// API Base URLs
const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';
const MARKETDATA_BASE_URL = 'https://api.marketdata.app/v1';
const COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';

// Validate required API keys
const missingKeys = [];
if (!FINNHUB_API_KEY) missingKeys.push('FINNHUB_API_KEY');
if (!MARKETDATA_API_TOKEN) missingKeys.push('MARKETDATA_API_TOKEN');
if (!COINGECKO_API_KEY) missingKeys.push('COINGECKO_API_KEY');

if (missingKeys.length > 0) {
  console.warn(`⚠️  Warning: Missing API keys: ${missingKeys.join(', ')}`);
  console.warn('   Some endpoints may not work. Set these in your .env file.');
}

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * Symbol Search Endpoint
 * GET /api/market-data/symbol-search?keywords=AAPL
 * 
 * Calls Alpha Vantage MCP SYMBOL_SEARCH tool
 */
app.get('/api/market-data/symbol-search', async (req, res) => {
  try {
    const { keywords } = req.query;
    
    if (!keywords) {
      return res.status(400).json({ error: 'keywords parameter is required' });
    }

    console.log(`[Symbol Search] Calling MCP server for keywords: ${keywords}`);
    
    // Call Alpha Vantage MCP server
    const mcpResponse = await fetch(ALPHA_VANTAGE_MCP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'SYMBOL_SEARCH',
          arguments: {
            keywords: keywords
          }
        },
        id: 1
      })
    });
    
    if (!mcpResponse.ok) {
      const errorText = await mcpResponse.text();
      console.error(`[Symbol Search] MCP HTTP Error ${mcpResponse.status}:`, errorText);
      throw new Error(`MCP server error: ${mcpResponse.status} - ${errorText}`);
    }

    const mcpData = await mcpResponse.json();
    console.log('[Symbol Search] MCP Response:', JSON.stringify(mcpData).substring(0, 500));
    
    // Check for MCP errors
    if (mcpData.error) {
      console.error('[Symbol Search] MCP error:', mcpData.error);
      return res.json({ bestMatches: [] });
    }
    
    // Extract the result from MCP response
    // MCP tools/call response format: { jsonrpc: '2.0', result: { content: [...] }, id: 1 }
    let bestMatches = [];
    
    if (mcpData.result) {
      // The result might be in different formats depending on MCP server implementation
      if (mcpData.result.content) {
        // If content is a string, parse it
        if (typeof mcpData.result.content === 'string') {
          try {
            const parsed = JSON.parse(mcpData.result.content);
            bestMatches = parsed.bestMatches || parsed;
          } catch (e) {
            // If it's not JSON, try to extract from text
            console.warn('[Symbol Search] Could not parse MCP content as JSON');
          }
        } else if (Array.isArray(mcpData.result.content)) {
          bestMatches = mcpData.result.content;
        } else if (mcpData.result.content.bestMatches) {
          bestMatches = mcpData.result.content.bestMatches;
        } else {
          bestMatches = mcpData.result.content;
        }
      } else if (mcpData.result.bestMatches) {
        bestMatches = mcpData.result.bestMatches;
      } else if (Array.isArray(mcpData.result)) {
        bestMatches = mcpData.result;
      }
    }
    
    // Check for Alpha Vantage API errors in the data
    if (bestMatches && typeof bestMatches === 'object' && !Array.isArray(bestMatches)) {
      if (bestMatches['Error Message']) {
        console.warn('[Symbol Search] Alpha Vantage API error:', bestMatches['Error Message']);
        return res.json({ bestMatches: [] });
      }
      
      if (bestMatches['Note']) {
        console.warn('[Symbol Search] Alpha Vantage API rate limit:', bestMatches['Note']);
        return res.json({ bestMatches: [] });
      }
    }

    console.log(`[Symbol Search] Returning ${Array.isArray(bestMatches) ? bestMatches.length : 0} matches`);
    res.json({ bestMatches: Array.isArray(bestMatches) ? bestMatches : [] });
  } catch (error) {
    console.error('[Symbol Search] Error:', error);
    console.error('[Symbol Search] Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * Stock Quote Endpoint
 * GET /api/market-data/quote/:symbol
 * 
 * Calls Alpha Vantage MCP GLOBAL_QUOTE tool
 */
app.get('/api/market-data/quote/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    
    if (!symbol) {
      return res.status(400).json({ error: 'symbol parameter is required' });
    }

    console.log(`[Quote] Calling MCP server for symbol: ${symbol}`);
    
    // Call Alpha Vantage MCP server
    const mcpResponse = await fetch(ALPHA_VANTAGE_MCP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'GLOBAL_QUOTE',
          arguments: {
            symbol: symbol
          }
        },
        id: 1
      })
    });
    
    if (!mcpResponse.ok) {
      throw new Error(`MCP server error: ${mcpResponse.status}`);
    }

    const mcpData = await mcpResponse.json();
    console.log('[Quote] MCP Response:', JSON.stringify(mcpData).substring(0, 500));
    
    // Check for MCP errors
    if (mcpData.error) {
      console.error('[Quote] MCP error:', mcpData.error);
      res.setHeader('Content-Type', 'text/csv');
      return res.send(`symbol,open,high,low,price,volume,latestDay,previousClose,change,changePercent\n${symbol},0,0,0,0,0,2025-01-01,0,0,0%`);
    }
    
    // Extract CSV data from MCP response
    let csvData = '';
    
    if (mcpData.result) {
      if (mcpData.result.content) {
        csvData = typeof mcpData.result.content === 'string' 
          ? mcpData.result.content 
          : JSON.stringify(mcpData.result.content);
      } else if (typeof mcpData.result === 'string') {
        csvData = mcpData.result;
      } else {
        // Convert result to CSV if needed
        csvData = JSON.stringify(mcpData.result);
      }
    }
    
    // Check for API errors in CSV
    if (csvData.includes('Error Message') || csvData.includes('Invalid API call')) {
      console.warn(`[Quote] Alpha Vantage API error for ${symbol}`);
      res.setHeader('Content-Type', 'text/csv');
      return res.send(`symbol,open,high,low,price,volume,latestDay,previousClose,change,changePercent\n${symbol},0,0,0,0,0,2025-01-01,0,0,0%`);
    }

    res.setHeader('Content-Type', 'text/csv');
    res.send(csvData || `symbol,open,high,low,price,volume,latestDay,previousClose,change,changePercent\n${symbol},0,0,0,0,0,2025-01-01,0,0,0%`);
  } catch (error) {
    console.error(`[Quote] Error getting quote for ${symbol}:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// FINNHUB API ENDPOINTS
// ============================================================================

/**
 * Stock Symbol Search (Finnhub)
 * GET /api/finnhub/symbol-search?keywords=AAPL
 */
app.get('/api/finnhub/symbol-search', async (req, res) => {
  try {
    if (!FINNHUB_API_KEY) {
      return res.status(503).json({ error: 'Finnhub API key not configured' });
    }

    const { keywords } = req.query;
    
    if (!keywords) {
      return res.status(400).json({ error: 'keywords parameter is required' });
    }

    console.log(`[Finnhub Symbol Search] Searching for: ${keywords}`);
    
    const apiUrl = `${FINNHUB_BASE_URL}/search?q=${encodeURIComponent(keywords)}&token=${FINNHUB_API_KEY}`;
    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(`Finnhub API error: ${response.status}`);
    }

    const data = await response.json();

    // Check for API errors
    if (data.error) {
      console.warn('[Finnhub Symbol Search] API error:', data.error);
      return res.json({ result: [] });
    }

    res.json(data);
  } catch (error) {
    console.error('[Finnhub Symbol Search] Error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * Market News (Finnhub)
 * GET /api/finnhub/news?category=general&minId=123
 */
app.get('/api/finnhub/news', async (req, res) => {
  try {
    if (!FINNHUB_API_KEY) {
      return res.status(503).json({ error: 'Finnhub API key not configured' });
    }

    const { category = 'general', minId } = req.query;
    
    const params = new URLSearchParams({
      category,
      token: FINNHUB_API_KEY,
    });
    
    if (minId) {
      params.append('minId', minId.toString());
    }

    const apiUrl = `${FINNHUB_BASE_URL}/news?${params.toString()}`;
    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(`Finnhub API error: ${response.status}`);
    }

    const data = await response.json();

    // Check for API errors
    if (data.error) {
      console.warn('[Finnhub News] API error:', data.error);
      return res.json([]);
    }

    res.json(Array.isArray(data) ? data : []);
  } catch (error) {
    console.error('[Finnhub News] Error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    });
  }
});

// ============================================================================
// MARKETDATA.APP API ENDPOINTS
// ============================================================================

/**
 * Stock Quote (MarketData.app)
 * GET /api/marketdata/quote/:symbol
 */
app.get('/api/marketdata/quote/:symbol', async (req, res) => {
  try {
    if (!MARKETDATA_API_TOKEN) {
      return res.status(503).json({ error: 'MarketData API token not configured' });
    }

    const { symbol } = req.params;
    
    if (!symbol) {
      return res.status(400).json({ error: 'symbol parameter is required' });
    }

    console.log(`[MarketData Quote] Fetching quote for: ${symbol}`);
    
    const quoteUrl = `${MARKETDATA_BASE_URL}/stocks/quotes/${encodeURIComponent(symbol)}/`;
    const response = await fetch(quoteUrl, {
      headers: {
        'Authorization': `Bearer ${MARKETDATA_API_TOKEN}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`MarketData API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error(`[MarketData Quote] Error for ${req.params.symbol}:`, error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    });
  }
});

// ============================================================================
// COINGECKO API ENDPOINTS
// ============================================================================

/**
 * Crypto Search (CoinGecko)
 * GET /api/coingecko/search?query=bitcoin
 */
app.get('/api/coingecko/search', async (req, res) => {
  try {
    if (!COINGECKO_API_KEY) {
      return res.status(503).json({ error: 'CoinGecko API key not configured' });
    }

    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: 'query parameter is required' });
    }

    console.log(`[CoinGecko Search] Searching for: ${query}`);
    
    const apiUrl = `${COINGECKO_BASE_URL}/search?query=${encodeURIComponent(query)}`;
    const response = await fetch(apiUrl, {
      headers: {
        'x-cg-demo-api-key': COINGECKO_API_KEY,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('[CoinGecko Search] Error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * Crypto Market Data (CoinGecko)
 * GET /api/coingecko/markets?ids=bitcoin,ethereum&vs_currency=usd
 */
app.get('/api/coingecko/markets', async (req, res) => {
  try {
    if (!COINGECKO_API_KEY) {
      return res.status(503).json({ error: 'CoinGecko API key not configured' });
    }

    const { ids, vs_currency = 'usd', per_page = 250, page = 1 } = req.query;
    
    if (!ids) {
      return res.status(400).json({ error: 'ids parameter is required' });
    }

    console.log(`[CoinGecko Markets] Fetching data for: ${ids}`);
    
    const params = new URLSearchParams({
      vs_currency,
      ids: ids.toString(),
      order: 'market_cap_desc',
      per_page: per_page.toString(),
      page: page.toString(),
      sparkline: 'false'
    });

    const apiUrl = `${COINGECKO_BASE_URL}/coins/markets?${params.toString()}`;
    const response = await fetch(apiUrl, {
      headers: {
        'x-cg-demo-api-key': COINGECKO_API_KEY,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    res.json(Array.isArray(data) ? data : []);
  } catch (error) {
    console.error('[CoinGecko Markets] Error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    });
  }
});

// ============================================================================
// ALPHA VANTAGE MCP ENDPOINTS (if configured)
// ============================================================================

/**
 * Symbol Search Endpoint (Alpha Vantage MCP)
 * GET /api/market-data/symbol-search?keywords=AAPL
 * 
 * Calls Alpha Vantage MCP SYMBOL_SEARCH tool
 */
app.get('/api/market-data/symbol-search', async (req, res) => {
  try {
    if (!ALPHA_VANTAGE_MCP_URL) {
      return res.status(503).json({ error: 'Alpha Vantage MCP URL not configured' });
    }

    const { keywords } = req.query;
    
    if (!keywords) {
      return res.status(400).json({ error: 'keywords parameter is required' });
    }

    console.log(`[Symbol Search] Calling MCP server for keywords: ${keywords}`);
    
    // Call Alpha Vantage MCP server
    const mcpResponse = await fetch(ALPHA_VANTAGE_MCP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'SYMBOL_SEARCH',
          arguments: {
            keywords: keywords
          }
        },
        id: 1
      })
    });
    
    if (!mcpResponse.ok) {
      const errorText = await mcpResponse.text();
      console.error(`[Symbol Search] MCP HTTP Error ${mcpResponse.status}:`, errorText);
      throw new Error(`MCP server error: ${mcpResponse.status} - ${errorText}`);
    }

    const mcpData = await mcpResponse.json();
    console.log('[Symbol Search] MCP Response:', JSON.stringify(mcpData).substring(0, 500));
    
    // Check for MCP errors
    if (mcpData.error) {
      console.error('[Symbol Search] MCP error:', mcpData.error);
      return res.json({ bestMatches: [] });
    }
    
    // Extract the result from MCP response
    let bestMatches = [];
    
    if (mcpData.result) {
      if (mcpData.result.content) {
        if (typeof mcpData.result.content === 'string') {
          try {
            const parsed = JSON.parse(mcpData.result.content);
            bestMatches = parsed.bestMatches || parsed;
          } catch (e) {
            console.warn('[Symbol Search] Could not parse MCP content as JSON');
          }
        } else if (Array.isArray(mcpData.result.content)) {
          bestMatches = mcpData.result.content;
        } else if (mcpData.result.content.bestMatches) {
          bestMatches = mcpData.result.content.bestMatches;
        } else {
          bestMatches = mcpData.result.content;
        }
      } else if (mcpData.result.bestMatches) {
        bestMatches = mcpData.result.bestMatches;
      } else if (Array.isArray(mcpData.result)) {
        bestMatches = mcpData.result;
      }
    }
    
    // Check for Alpha Vantage API errors in the data
    if (bestMatches && typeof bestMatches === 'object' && !Array.isArray(bestMatches)) {
      if (bestMatches['Error Message']) {
        console.warn('[Symbol Search] Alpha Vantage API error:', bestMatches['Error Message']);
        return res.json({ bestMatches: [] });
      }
      
      if (bestMatches['Note']) {
        console.warn('[Symbol Search] Alpha Vantage API rate limit:', bestMatches['Note']);
        return res.json({ bestMatches: [] });
      }
    }

    console.log(`[Symbol Search] Returning ${Array.isArray(bestMatches) ? bestMatches.length : 0} matches`);
    res.json({ bestMatches: Array.isArray(bestMatches) ? bestMatches : [] });
  } catch (error) {
    console.error('[Symbol Search] Error:', error);
    console.error('[Symbol Search] Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * Stock Quote Endpoint (Alpha Vantage MCP)
 * GET /api/market-data/quote/:symbol
 * 
 * Calls Alpha Vantage MCP GLOBAL_QUOTE tool
 */
app.get('/api/market-data/quote/:symbol', async (req, res) => {
  try {
    if (!ALPHA_VANTAGE_MCP_URL) {
      return res.status(503).json({ error: 'Alpha Vantage MCP URL not configured' });
    }

    const { symbol } = req.params;
    
    if (!symbol) {
      return res.status(400).json({ error: 'symbol parameter is required' });
    }

    console.log(`[Quote] Calling MCP server for symbol: ${symbol}`);
    
    // Call Alpha Vantage MCP server
    const mcpResponse = await fetch(ALPHA_VANTAGE_MCP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'GLOBAL_QUOTE',
          arguments: {
            symbol: symbol
          }
        },
        id: 1
      })
    });
    
    if (!mcpResponse.ok) {
      throw new Error(`MCP server error: ${mcpResponse.status}`);
    }

    const mcpData = await mcpResponse.json();
    console.log('[Quote] MCP Response:', JSON.stringify(mcpData).substring(0, 500));
    
    // Check for MCP errors
    if (mcpData.error) {
      console.error('[Quote] MCP error:', mcpData.error);
      res.setHeader('Content-Type', 'text/csv');
      return res.send(`symbol,open,high,low,price,volume,latestDay,previousClose,change,changePercent\n${symbol},0,0,0,0,0,2025-01-01,0,0,0%`);
    }
    
    // Extract CSV data from MCP response
    let csvData = '';
    
    if (mcpData.result) {
      if (mcpData.result.content) {
        csvData = typeof mcpData.result.content === 'string' 
          ? mcpData.result.content 
          : JSON.stringify(mcpData.result.content);
      } else if (typeof mcpData.result === 'string') {
        csvData = mcpData.result;
      } else {
        csvData = JSON.stringify(mcpData.result);
      }
    }
    
    // Check for API errors in CSV
    if (csvData.includes('Error Message') || csvData.includes('Invalid API call')) {
      console.warn(`[Quote] Alpha Vantage API error for ${symbol}`);
      res.setHeader('Content-Type', 'text/csv');
      return res.send(`symbol,open,high,low,price,volume,latestDay,previousClose,change,changePercent\n${symbol},0,0,0,0,0,2025-01-01,0,0,0%`);
    }

    res.setHeader('Content-Type', 'text/csv');
    res.send(csvData || `symbol,open,high,low,price,volume,latestDay,previousClose,change,changePercent\n${symbol},0,0,0,0,0,2025-01-01,0,0,0%`);
  } catch (error) {
    console.error(`[Quote] Error getting quote for ${req.params.symbol}:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// MARKETDATA.APP OPTIONS ENDPOINTS
// ============================================================================

/**
 * Options Chain Endpoint (MarketData.app)
 * GET /api/marketdata/options/chain?underlyingSymbol=AAPL&expiration=2025-01-17&strike=150&side=call
 *
 * Query parameters:
 * - underlyingSymbol (required): The underlying stock symbol
 * - expiration (optional): Filter by expiration date (YYYY-MM-DD)
 * - strike (optional): Filter by strike price
 * - side (optional): Filter by 'call' or 'put'
 */
app.get('/api/marketdata/options/chain', async (req, res) => {
  try {
    if (!MARKETDATA_API_TOKEN) {
      return res.status(503).json({ error: 'MarketData API token not configured' });
    }

    const { underlyingSymbol, expiration, strike, side } = req.query;

    if (!underlyingSymbol) {
      return res.status(400).json({ error: 'underlyingSymbol parameter is required' });
    }

    console.log(`[MarketData Options Chain] Fetching chain for: ${underlyingSymbol}`);

    // Build MarketData.app options chain URL
    const params = new URLSearchParams();
    if (expiration) params.append('expiration', expiration);
    if (strike) params.append('strike', strike.toString());
    if (side) params.append('side', side);

    const chainUrl = `${MARKETDATA_BASE_URL}/options/chain/${encodeURIComponent(underlyingSymbol)}/?${params.toString()}`;
    const response = await fetch(chainUrl, {
      headers: {
        'Authorization': `Bearer ${MARKETDATA_API_TOKEN}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[MarketData Options Chain] API error: ${response.status}`, errorText);
      throw new Error(`MarketData API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error(`[MarketData Options Chain] Error:`, error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * Option Quote Endpoint (MarketData.app)
 * GET /api/marketdata/options/quote/:optionSymbol
 *
 * Example: /api/marketdata/options/quote/AAPL271217C00300000
 */
app.get('/api/marketdata/options/quote/:optionSymbol', async (req, res) => {
  try {
    if (!MARKETDATA_API_TOKEN) {
      return res.status(503).json({ error: 'MarketData API token not configured' });
    }

    const { optionSymbol } = req.params;

    if (!optionSymbol) {
      return res.status(400).json({ error: 'optionSymbol parameter is required' });
    }

    console.log(`[MarketData Option Quote] Fetching quote for: ${optionSymbol}`);

    const quoteUrl = `${MARKETDATA_BASE_URL}/options/quotes/${encodeURIComponent(optionSymbol)}/`;
    const response = await fetch(quoteUrl, {
      headers: {
        'Authorization': `Bearer ${MARKETDATA_API_TOKEN}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[MarketData Option Quote] API error: ${response.status}`, errorText);
      throw new Error(`MarketData API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error(`[MarketData Option Quote] Error for ${req.params.optionSymbol}:`, error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

app.listen(PORT, () => {
  console.log(`🚀 Market Data API server running on http://localhost:${PORT}`);
  console.log(`\n📡 Available Endpoints:`);
  console.log(`   GET /api/health`);
  console.log(`\n   Stock Data (MarketData.app):`);
  console.log(`   GET /api/marketdata/quote/:symbol`);
  console.log(`\n   Options Data (MarketData.app):`);
  console.log(`   GET /api/marketdata/options/chain?underlyingSymbol=SYMBOL`);
  console.log(`   GET /api/marketdata/options/quote/:optionSymbol`);
  console.log(`\n   Symbol Search (Finnhub):`);
  console.log(`   GET /api/finnhub/symbol-search?keywords=SYMBOL`);
  console.log(`   GET /api/finnhub/news?category=general`);
  console.log(`\n   Crypto Data (CoinGecko):`);
  console.log(`   GET /api/coingecko/search?query=CRYPTO`);
  console.log(`   GET /api/coingecko/markets?ids=bitcoin,ethereum`);
  if (ALPHA_VANTAGE_MCP_URL) {
    console.log(`\n   Alpha Vantage MCP:`);
    console.log(`   GET /api/market-data/symbol-search?keywords=SYMBOL`);
    console.log(`   GET /api/market-data/quote/:symbol`);
  }
  console.log(`\n🔐 API Keys Status:`);
  console.log(`   ${FINNHUB_API_KEY ? '✅' : '❌'} Finnhub API Key`);
  console.log(`   ${MARKETDATA_API_TOKEN ? '✅' : '❌'} MarketData API Token`);
  console.log(`   ${COINGECKO_API_KEY ? '✅' : '❌'} CoinGecko API Key`);
  console.log(`   ${ALPHA_VANTAGE_MCP_URL ? '✅' : '❌'} Alpha Vantage MCP URL`);
  console.log(`\n💡 Set environment variables in .env file to configure API keys`);
});

