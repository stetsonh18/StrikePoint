import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { requireAuth } from '../_shared/auth.ts';

const COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';
const COINGECKO_API_KEY = Deno.env.get('COINGECKO_API_KEY');

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

    if (!COINGECKO_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'CoinGecko API key not configured' }),
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
    const ids = url.searchParams.get('ids');
    const vs_currency = url.searchParams.get('vs_currency') || 'usd';
    const per_page = url.searchParams.get('per_page') || '250';
    const page = url.searchParams.get('page') || '1';
    
    if (!ids) {
      return new Response(
        JSON.stringify({ error: 'ids parameter is required' }),
        { 
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
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
    
    return new Response(
      JSON.stringify(Array.isArray(data) ? data : []),
      { 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('[CoinGecko Markets] Error:', error);
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

