import "jsr:@supabase/functions-js/edge-runtime.d.ts";

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
    const pathParts = url.pathname.split('/');
    const optionSymbol = pathParts[pathParts.length - 1];
    
    if (!optionSymbol) {
      return new Response(
        JSON.stringify({ error: 'option symbol parameter is required' }),
        { 
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    const quoteUrl = `${MARKETDATA_BASE_URL}/options/quotes/${encodeURIComponent(optionSymbol)}/`;
    
    console.log(`[MarketData Options Quote] Fetching quote for: ${optionSymbol}`);
    
    const response = await fetch(quoteUrl, {
      headers: {
        'Authorization': `Bearer ${MARKETDATA_API_TOKEN}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[MarketData Options Quote] API error for ${optionSymbol}: ${response.status} ${response.statusText}`, errorText);
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
    console.error('[MarketData Options Quote] Error:', error);
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

