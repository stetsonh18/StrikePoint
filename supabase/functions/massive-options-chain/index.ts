import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { requireAuth } from '../_shared/auth.ts';

const MASSIVE_BASE_URL = 'https://api.massive.com';
const MASSIVE_API_KEY = Deno.env.get('MASSIVE_API_KEY');

// Massive.io API types
interface MassiveOptionDetails {
  ticker?: string;
  expiration_date?: string;
  strike_price?: number;
  contract_type?: 'call' | 'put';
}

interface MassiveOptionDay {
  close?: number;
  volume?: number;
}

interface MassiveOptionQuote {
  bid?: number;
  ask?: number;
}

interface MassiveOptionGreeks {
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
}

interface MassiveOptionContract {
  details?: MassiveOptionDetails;
  day?: MassiveOptionDay;
  last_quote?: MassiveOptionQuote;
  open_interest?: number;
  implied_volatility?: number;
  greeks?: MassiveOptionGreeks;
}

interface MassiveOptionsResponse {
  status?: string;
  results?: MassiveOptionContract[];
  next_url?: string;
  underlying_price?: number;
}

interface OptionChainEntry {
  symbol: string;
  underlying: string;
  expiration: string;
  strike: number;
  option_type: 'call' | 'put';
  bid: number;
  ask: number;
  last: number;
  volume: number;
  open_interest: number;
  implied_volatility?: number;
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
}

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

    console.log(`[Massive Options Chain] Fetching chain for: ${underlyingSymbol}`);

    // Build Massive.io options chain URL
    // https://massive.com/docs/rest/options/snapshots/option-chain-snapshot
    const params = new URLSearchParams({
      'underlying.ticker': underlyingSymbol,
    });

    if (expiration) {
      params.append('expiration_date', expiration);
    }
    if (strike) {
      params.append('strike_price', strike);
    }
    if (side) {
      params.append('contract_type', side);
    }

    const chainUrl = `${MASSIVE_BASE_URL}/v3/snapshot/options/${encodeURIComponent(underlyingSymbol)}?${params.toString()}`;

    const response = await fetch(chainUrl, {
      headers: {
        'Authorization': `Bearer ${MASSIVE_API_KEY}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Massive Options Chain] API error for ${underlyingSymbol}: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`Massive API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json() as MassiveOptionsResponse;

    // Transform Massive.io response format
    // Massive returns: { status, results: [...], next_url }
    const results = data.results || [];

    // Group by expiration
    const chain: Record<string, OptionChainEntry[]> = {};
    const expirationsSet = new Set<string>();

    results.forEach((contract) => {
      const exp = contract.details?.expiration_date;
      if (!exp) return;

      expirationsSet.add(exp);

      if (!chain[exp]) {
        chain[exp] = [];
      }

      // Transform to our format
      const entry: OptionChainEntry = {
        symbol: contract.details?.ticker || '',
        underlying: underlyingSymbol,
        expiration: exp,
        strike: contract.details?.strike_price || 0,
        option_type: (contract.details?.contract_type || 'call') as 'call' | 'put',
        bid: contract.day?.close || contract.last_quote?.bid || 0,
        ask: contract.last_quote?.ask || 0,
        last: contract.day?.close || 0,
        volume: contract.day?.volume || 0,
        open_interest: contract.open_interest || 0,
        implied_volatility: contract.implied_volatility,
        delta: contract.greeks?.delta,
        gamma: contract.greeks?.gamma,
        theta: contract.greeks?.theta,
        vega: contract.greeks?.vega,
      };

      chain[exp].push(entry);
    });

    // Sort entries by strike within each expiration
    Object.keys(chain).forEach((exp) => {
      chain[exp].sort((a, b) => a.strike - b.strike);
    });

    const transformed = {
      underlying: underlyingSymbol,
      underlying_price: data.underlying_price,
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
    console.error('[Massive Options Chain] Error:', error);
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
