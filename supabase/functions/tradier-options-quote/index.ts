import "jsr:@supabase/functions-js/edge-runtime.d.ts";

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

    console.log(`[Tradier Options Quote] Fetching quote for: ${optionSymbol}`);

    // Tradier quotes endpoint - same as stock quotes but works with option symbols
    // According to Tradier docs: https://docs.tradier.com/reference/brokerage-api-markets-get-quotes
    // Format should be OCC symbology: {underlying}{YYMMDD}{C|P}{strike_in_cents_8digits}
    // Example: AAPL250118C00195000 (AAPL, Jan 18, 2025, Call, $195.00)
    const quoteUrl = `${TRADIER_BASE_URL}/markets/quotes?symbols=${encodeURIComponent(optionSymbol)}&greeks=true`;
    const response = await fetch(quoteUrl, {
      headers: {
        'Authorization': `Bearer ${TRADIER_ACCESS_TOKEN}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Tradier Options Quote] API error for ${optionSymbol}: ${response.status} ${response.statusText}`, errorText);
      
      // If Tradier returns 404 or 400, return 404 (option not found)
      if (response.status === 404 || response.status === 400) {
        return new Response(
          JSON.stringify({
            error: 'Option quote not available',
            message: `Tradier API returned ${response.status} for ${optionSymbol}. This option may not exist, may be expired, or may not be available in Tradier's system.`,
            symbol: optionSymbol
          }),
          {
            status: 404,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      }
      
      throw new Error(`Tradier API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();

    // Log the raw response for debugging
    console.log(`[Tradier Options Quote] Raw response for ${optionSymbol}:`, JSON.stringify(data));

    // Tradier returns: { quotes: { quote: {...} } } or { quotes: { quote: [...] } }
    // Sometimes Tradier returns { quotes: null } or { quotes: { quote: null } } when option doesn't exist
    const quote = Array.isArray(data.quotes?.quote) ? data.quotes.quote[0] : data.quotes?.quote;

    if (!quote) {
      // Provide more detailed error information
      const errorDetails = {
        symbol: optionSymbol,
        responseStructure: {
          hasQuotes: !!data.quotes,
          quotesType: typeof data.quotes,
          quoteValue: data.quotes?.quote,
          fullResponse: data
        }
      };
      console.error(`[Tradier Options Quote] No quote data for ${optionSymbol}:`, JSON.stringify(errorDetails));
      
      // For SPX options, suggest trying SPXW (weekly) if it's not already SPXW
      let suggestion = '';
      if (optionSymbol.startsWith('SPX') && !optionSymbol.startsWith('SPXW')) {
        const spxwSymbol = optionSymbol.replace('SPX', 'SPXW');
        suggestion = ` For SPX options, you might need to use SPXW (weekly) format. Try: ${spxwSymbol}`;
      }
      
      // Return a more informative error that the frontend can handle gracefully
      return new Response(
        JSON.stringify({
          error: 'Option quote not available',
          message: `Tradier API returned no quote data for ${optionSymbol}. This option may not exist, may be expired, or may not be available in Tradier's system.${suggestion}`,
          symbol: optionSymbol,
          details: errorDetails
        }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Transform to match our app's expected option quote format
    const transformed = {
      symbol: quote.symbol,
      underlying: quote.underlying || quote.root_symbol,
      expiration: quote.expiration_date,
      strike: quote.strike,
      option_type: quote.option_type,
      bid: quote.bid,
      ask: quote.ask,
      last: quote.last,
      volume: quote.volume,
      open_interest: quote.open_interest,
      implied_volatility: quote.greeks?.smv_vol,
      delta: quote.greeks?.delta,
      gamma: quote.greeks?.gamma,
      theta: quote.greeks?.theta,
      vega: quote.greeks?.vega,
      rho: quote.greeks?.rho,
      intrinsic_value: quote.intrinsic_value,
      extrinsic_value: quote.extrinsic_value,
      time_value: quote.time_value,
      in_the_money: quote.in_the_money,
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
    console.error('[Tradier Options Quote] Error:', error);
    
    // If the error message indicates no quote data, return 404 instead of 500
    const errorMessage = error?.message || '';
    if (errorMessage.includes('No quote data') || errorMessage.includes('quote not available')) {
      const url = new URL(req.url);
      const pathParts = url.pathname.split('/');
      const optionSymbol = pathParts[pathParts.length - 1];
      
      return new Response(
        JSON.stringify({
          error: 'Option quote not available',
          message: `No quote data returned from Tradier for ${optionSymbol}. This option may not exist, may be expired, or may not be available in Tradier's system.`,
          symbol: optionSymbol
        }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }
    
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: errorMessage
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
