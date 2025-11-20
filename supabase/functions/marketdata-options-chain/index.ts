import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { requireAuth } from '../_shared/auth.ts';

const MARKETDATA_BASE_URL = 'https://api.marketdata.app/v1';
const MARKETDATA_API_TOKEN = Deno.env.get('MARKETDATA_API_TOKEN');

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  try {
    const auth = await requireAuth(req, { requireActiveSubscription: true });
    if (auth instanceof Response) {
      return auth;
    }

    if (!MARKETDATA_API_TOKEN) {
      return new Response(
        JSON.stringify({ error: 'MarketData API token not configured' }),
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
    
    // Get underlying symbol from query parameter
    const underlyingSymbol = url.searchParams.get('underlyingSymbol');
    
    if (!underlyingSymbol) {
      return new Response(
        JSON.stringify({ error: 'underlyingSymbol parameter is required' }),
        { 
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // MarketData.app options chain endpoint
    // Documentation: https://www.marketdata.app/docs/api/options/chains
    const chainUrl = `${MARKETDATA_BASE_URL}/options/chains/${encodeURIComponent(underlyingSymbol)}/`;
    
    console.log(`[MarketData Options Chain] Fetching chain for: ${underlyingSymbol}`);
    
    const response = await fetch(chainUrl, {
      headers: {
        'Authorization': `Bearer ${MARKETDATA_API_TOKEN}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[MarketData Options Chain] API error for ${underlyingSymbol}: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`MarketData API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    
    return new Response(
      JSON.stringify(data),
      { 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('[MarketData Options Chain] Error:', error);
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

