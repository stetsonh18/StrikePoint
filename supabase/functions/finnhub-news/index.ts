import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';
const FINNHUB_API_KEY = Deno.env.get('FINNHUB_API_KEY');

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
    if (!FINNHUB_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Finnhub API key not configured' }),
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
    const category = url.searchParams.get('category') || 'general';
    const minId = url.searchParams.get('minId');
    
    const params = new URLSearchParams({
      category,
      token: FINNHUB_API_KEY,
    });
    
    if (minId) {
      params.append('minId', minId);
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
      return new Response(
        JSON.stringify([]),
        { 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

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
    console.error('[Finnhub News] Error:', error);
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

