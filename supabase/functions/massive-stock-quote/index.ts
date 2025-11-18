import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const MASSIVE_BASE_URL = 'https://api.massive.com';
const MASSIVE_API_KEY = Deno.env.get('MASSIVE_API_KEY');

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
    if (!MASSIVE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Massive API key not configured' }),
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

    console.log(`[Massive Stock Quote] Fetching quote for: ${symbol}`);

    // Massive.io (formerly Polygon.io) stock snapshot endpoint
    // https://massive.com/docs/rest/stocks/snapshots/single-ticker-snapshot
    const quoteUrl = `${MASSIVE_BASE_URL}/v2/snapshot/locale/us/markets/stocks/tickers/${encodeURIComponent(symbol)}`;
    const response = await fetch(quoteUrl, {
      headers: {
        'Authorization': `Bearer ${MASSIVE_API_KEY}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Massive Stock Quote] API error for ${symbol}: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`Massive API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();

    // Transform Massive.io response to match our interface
    // Massive returns: { status, ticker: { day: {...}, min: {...}, prevDay: {...} } }
    const ticker = data.ticker;
    if (!ticker) {
      throw new Error('Invalid response from Massive API');
    }

    const transformed = {
      symbol: symbol,
      s: 'ok',
      last: [ticker.day?.c || ticker.min?.c || 0],
      volume: [ticker.day?.v || 0],
      change: [ticker.day?.c ? ticker.day.c - ticker.prevDay.c : 0],
      changepct: [ticker.todaysChangePerc || 0],
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
    console.error('[Massive Stock Quote] Error:', error);
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
