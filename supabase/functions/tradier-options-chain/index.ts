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
    const underlyingSymbol = url.searchParams.get('underlyingSymbol');
    const expiration = url.searchParams.get('expiration');
    const strike = url.searchParams.get('strike');
    const side = url.searchParams.get('side'); // 'call' or 'put'

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

    console.log(`[Tradier Options Chain] Fetching chain for: ${underlyingSymbol}`);

    // Step 1: Get available expirations if not provided
    const expirationDate = expiration;
    let allExpirations: string[] = [];
    
    // For daily expiration symbols (like SPX), generate all trading days instead of using expirations endpoint
    const dailyExpirationSymbols = ['SPX', 'SPXW', 'NDX', 'NDXW', 'RUT', 'RUTW', 'DJX', 'XSP'];
    const isDailyExpiration = dailyExpirationSymbols.includes(underlyingSymbol.toUpperCase());
    
    if (!expirationDate) {
      if (isDailyExpiration) {
        // For daily expiration symbols, generate all trading days for the next 60 days
        // SPX has daily expirations on every trading day
        const today = new Date();
        const tradingDays: string[] = [];
        const currentDate = new Date(today);
        const endDate = new Date(today);
        endDate.setDate(endDate.getDate() + 60);
        
        // Generate dates for next 60 days, skipping weekends
        while (currentDate <= endDate && tradingDays.length < 60) {
          const dayOfWeek = currentDate.getDay();
          // Skip weekends (0 = Sunday, 6 = Saturday)
          if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            const dateStr = currentDate.toISOString().split('T')[0];
            tradingDays.push(dateStr);
          }
          currentDate.setDate(currentDate.getDate() + 1);
        }
        
        allExpirations = tradingDays;
      } else {
        // For non-daily symbols, use the expirations endpoint
        const expirationsUrl = `${TRADIER_BASE_URL}/markets/options/expirations?symbol=${encodeURIComponent(underlyingSymbol)}`;
        const expResponse = await fetch(expirationsUrl, {
          headers: {
            'Authorization': `Bearer ${TRADIER_ACCESS_TOKEN}`,
            'Accept': 'application/json'
          }
        });

        if (expResponse.ok) {
          const expData = await expResponse.json();
          const expirations = expData.expirations?.date || [];
          allExpirations = Array.isArray(expirations) ? expirations : [expirations];
          
          // Sort expirations
          allExpirations = allExpirations.sort();
          
          // Limit to next 60 days worth of expirations to avoid too many API calls
          const today = new Date();
          const cutoffDate = new Date(today);
          cutoffDate.setDate(cutoffDate.getDate() + 60);
          
          allExpirations = allExpirations.filter((exp: string) => {
            const expDate = new Date(exp);
            return expDate <= cutoffDate;
          });
        }
      }
    } else {
      allExpirations = [expirationDate];
    }

    if (allExpirations.length === 0) {
      throw new Error('No expiration dates available for this symbol');
    }

    // Step 2: Get options chain for all expirations (or just the specified one)
    let allOptions: any[] = [];

    // Fetch chains in parallel batches to avoid rate limits
    // For daily expirations, we'll fetch in batches of 10
    const batchSize = isDailyExpiration ? 10 : allExpirations.length;
    
    for (let i = 0; i < allExpirations.length; i += batchSize) {
      const batch = allExpirations.slice(i, i + batchSize);
      
      // Fetch all chains in this batch in parallel
      const batchPromises = batch.map(async (expDate: string) => {
        const chainUrl = `${TRADIER_BASE_URL}/markets/options/chains?symbol=${encodeURIComponent(underlyingSymbol)}&expiration=${expDate}&greeks=true`;
        try {
          const response = await fetch(chainUrl, {
            headers: {
              'Authorization': `Bearer ${TRADIER_ACCESS_TOKEN}`,
              'Accept': 'application/json'
            }
          });

          if (response.ok) {
            const data = await response.json();
            // Tradier returns: { options: { option: [...] } }
            const options = Array.isArray(data.options?.option) ? data.options.option : (data.options?.option ? [data.options.option] : []);
            return options;
          } else {
            console.warn(`[Tradier Options Chain] Failed to fetch chain for expiration ${expDate}: ${response.status}`);
            return [];
          }
        } catch (error) {
          console.warn(`[Tradier Options Chain] Error fetching chain for expiration ${expDate}:`, error);
          return [];
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      allOptions = allOptions.concat(batchResults.flat());
      
      // Small delay between batches to avoid rate limiting
      if (i + batchSize < allExpirations.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    if (allOptions.length === 0) {
      const errorText = `No options data returned for ${underlyingSymbol}`;
      console.error(`[Tradier Options Chain] ${errorText}`);
      throw new Error(errorText);
    }

    // Transform and filter
    const chain: Record<string, any[]> = {};
    const expirationsSet = new Set<string>();

    allOptions.forEach((option: any) => {
      // Apply filters
      if (strike && option.strike !== parseFloat(strike)) return;
      if (side && option.option_type !== side) return;

      const exp = option.expiration_date;
      if (!exp) return;

      expirationsSet.add(exp);

      if (!chain[exp]) {
        chain[exp] = [];
      }

      // Transform to our format
      const entry = {
        symbol: option.symbol || '',
        underlying: underlyingSymbol,
        expiration: exp,
        strike: option.strike || 0,
        option_type: option.option_type || 'call',
        bid: option.bid || 0,
        ask: option.ask || 0,
        last: option.last || 0,
        volume: option.volume || 0,
        open_interest: option.open_interest || 0,
        implied_volatility: option.greeks?.smv_vol,
        delta: option.greeks?.delta,
        gamma: option.greeks?.gamma,
        theta: option.greeks?.theta,
        vega: option.greeks?.vega,
        rho: option.greeks?.rho,
      };

      chain[exp].push(entry);
    });

    // Sort entries by strike within each expiration
    Object.keys(chain).forEach((exp) => {
      chain[exp].sort((a, b) => a.strike - b.strike);
    });

    // Get underlying price (from quote)
    let underlyingPrice = 0;
    try {
      const quoteUrl = `${TRADIER_BASE_URL}/markets/quotes?symbols=${encodeURIComponent(underlyingSymbol)}`;
      const quoteResponse = await fetch(quoteUrl, {
        headers: {
          'Authorization': `Bearer ${TRADIER_ACCESS_TOKEN}`,
          'Accept': 'application/json'
        }
      });
      if (quoteResponse.ok) {
        const quoteData = await quoteResponse.json();
        const quote = Array.isArray(quoteData.quotes?.quote) ? quoteData.quotes.quote[0] : quoteData.quotes?.quote;
        underlyingPrice = quote?.last || 0;
      }
    } catch (e) {
      console.warn('Could not fetch underlying price:', e);
    }

    const transformed = {
      underlying: underlyingSymbol,
      underlying_price: underlyingPrice,
      expirations: Array.from(expirationsSet).sort(),
      chain,
      last_updated: new Date().toISOString(),
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
    console.error('[Tradier Options Chain] Error:', error);
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
