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
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, baggage, sentry-trace',
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
    const query = url.searchParams.get('q');
    const types = url.searchParams.get('types') || 'stock,option,etf'; // Default to stock, option, etf

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'q parameter is required' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    console.log(`[Tradier Symbol Search] Searching for: ${query}`);

    // Tradier lookup endpoint
    const lookupUrl = `${TRADIER_BASE_URL}/markets/lookup?q=${encodeURIComponent(query)}&types=${encodeURIComponent(types)}`;
    
    const response = await fetch(lookupUrl, {
      headers: {
        'Authorization': `Bearer ${TRADIER_ACCESS_TOKEN}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Tradier Symbol Search] API error: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`Tradier API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();

    // Tradier returns: { securities: { security: [...] } } or { securities: { security: {...} } }
    const securities = data.securities?.security;
    if (!securities) {
      return new Response(
        JSON.stringify({ result: [] }),
        {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Normalize to array format
    const securitiesArray = Array.isArray(securities) ? securities : [securities];

    // Transform to our format
    const results = securitiesArray.map((sec: any) => ({
      symbol: sec.symbol || '',
      name: sec.description || sec.symbol || '',
      type: sec.type || 'stock',
      exchange: sec.exchange || '',
      description: sec.description || '',
    }));

    return new Response(
      JSON.stringify({ result: results }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('[Tradier Symbol Search] Error:', error);
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

