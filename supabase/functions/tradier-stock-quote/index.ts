import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { requireAuth } from '../_shared/auth.ts';

const TRADIER_BASE_URL = 'https://api.tradier.com/v1';
const TRADIER_ACCESS_TOKEN = Deno.env.get('TRADIER_ACCESS_TOKEN');

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    const auth = await requireAuth(req, { requireActiveSubscription: true });
    if (auth instanceof Response) {
      return auth;
    }

    if (!TRADIER_ACCESS_TOKEN) {
      return new Response(
        JSON.stringify({ error: 'Tradier access token not configured' }),
        {
          status: 503,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const symbol = pathParts[pathParts.length - 1];

    if (!symbol) {
      return new Response(
        JSON.stringify({ error: 'symbol parameter is required' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    console.log(`[Tradier Stock Quote] Fetching quote for: ${symbol}`);

    // Tradier quotes endpoint
    const quoteUrl = `${TRADIER_BASE_URL}/markets/quotes?symbols=${encodeURIComponent(symbol)}&greeks=false`;
    const response = await fetch(quoteUrl, {
      headers: {
        'Authorization': `Bearer ${TRADIER_ACCESS_TOKEN}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Tradier Stock Quote] API error for ${symbol}: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`Tradier API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();

    // Tradier returns: { quotes: { quote: {...} } } or { quotes: { quote: [...] } }
    const quote = Array.isArray(data.quotes?.quote) ? data.quotes.quote[0] : data.quotes?.quote;

    if (!quote) {
      throw new Error('No quote data returned from Tradier');
    }

    // Transform to match our app's format (similar to MarketData.app)
    const transformed = {
      symbol: quote.symbol,
      s: 'ok',
      last: [quote.last || 0],
      volume: [quote.volume || 0],
      change: [quote.change || 0],
      changepct: [quote.change_percentage || 0],
      open: quote.open,
      high: quote.high,
      low: quote.low,
      close: quote.close,
      prevclose: quote.prevclose,
      bid: quote.bid,
      ask: quote.ask,
    };

    return new Response(
      JSON.stringify(transformed),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('[Tradier Stock Quote] Error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error.message
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});
