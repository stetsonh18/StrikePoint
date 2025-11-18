import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_MODEL = Deno.env.get('OPENAI_MODEL') || 'gpt-4o-mini'; // Default to cost-effective model
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// Validate environment variables
function validateEnvironmentVariables(): { valid: boolean; error?: string } {
  if (!OPENAI_API_KEY) {
    return { valid: false, error: 'OPENAI_API_KEY not configured' };
  }
  if (!SUPABASE_URL) {
    return { valid: false, error: 'SUPABASE_URL not configured' };
  }
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    return { valid: false, error: 'SUPABASE_SERVICE_ROLE_KEY not configured' };
  }
  return { valid: true };
}

interface InsightResponse {
  type: 'risk_warning' | 'opportunity' | 'pattern' | 'performance' | 'strategy';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  analysis: string;
  recommendations: string[];
  related_symbols?: string[];
  confidence: number;
  actionable: boolean;
  expires_at?: string;
}

/**
 * Generate AI insights using OpenAI API
 */
async function generateInsightsWithOpenAI(
  portfolioSummary: string,
  insightType: string
): Promise<InsightResponse[]> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const systemPrompts: Record<string, string> = {
    risk_warning: `You are an expert financial analyst identifying portfolio risks. Focus on concentration risk, expiring options, large losses, leverage, and cash management issues.`,
    opportunity: `You are an expert financial analyst identifying trading opportunities. Focus on performance patterns, diversification opportunities, and strategic positions.`,
    pattern: `You are an expert behavioral finance analyst. Identify trading patterns, behavioral biases, and recurring tendencies in the user's trading activity.`,
    performance: `You are an expert portfolio analyst. Analyze overall performance, asset type performance, win rates, and risk-adjusted returns.`,
    strategy: `You are an expert trading strategist. Provide strategic recommendations for portfolio optimization, risk management, and long-term success.`,
  };

  const userPrompts: Record<string, string> = {
    risk_warning: `Analyze this portfolio and identify 2-5 risk warnings. Focus on:\n- High concentration (>20% in one symbol)\n- Options expiring in next 7 days\n- Large unrealized losses (>$500 or >20%)\n- Leveraged positions\n- Low cash balance or over-trading\n\n${portfolioSummary}`,
    opportunity: `Analyze this portfolio and identify 2-5 opportunities. Focus on:\n- Symbols with strong momentum\n- Underrepresented sectors\n- Successful patterns to replicate\n- Diversification opportunities\n- Tax optimization\n\n${portfolioSummary}`,
    pattern: `Analyze this portfolio and identify 2-4 trading patterns. Focus on:\n- Win rate patterns by asset type\n- Holding period patterns\n- Position sizing patterns\n- Most traded symbols\n- Profitable vs unprofitable behaviors\n\n${portfolioSummary}`,
    performance: `Analyze this portfolio's performance. Focus on:\n- Overall returns and trends\n- Performance by asset type\n- Win rate and avg win vs loss\n- Best/worst positions\n- Fee impact\n\n${portfolioSummary}`,
    strategy: `Provide 2-4 strategic recommendations. Focus on:\n- Portfolio rebalancing\n- Position sizing optimization\n- Risk management strategies\n- Tax optimization\n- Cash management\n\n${portfolioSummary}`,
  };

  const systemPrompt = systemPrompts[insightType] || systemPrompts.risk_warning;
  const userPrompt = userPrompts[insightType] || userPrompts.risk_warning;

  // Note: gpt-4o-mini and gpt-4o support response_format json_object
  // If this fails, OpenAI will return an error which we'll handle
  const requestBody: any = {
    model: OPENAI_MODEL,
    max_tokens: 4096,
    temperature: 0.7,
    messages: [
      {
        role: 'system',
        content: `${systemPrompt}\n\nIMPORTANT: Return ONLY a valid JSON object with an "insights" array. The response must be: {"insights": [...]}. Each insight must have: type, priority, title, description, analysis, recommendations (array), related_symbols (array), confidence (0-100), actionable (boolean), expires_at (ISO date or null). Do not include markdown code blocks or any text outside the JSON object.`,
      },
      {
        role: 'user',
        content: userPrompt,
      },
    ],
  };

  // Add JSON mode for supported models (gpt-4o, gpt-4o-mini, gpt-4-turbo, etc.)
  // This ensures structured JSON output
  if (OPENAI_MODEL.includes('gpt-4')) {
    requestBody.response_format = { type: 'json_object' };
    console.log('[Generate Insights] Using JSON mode for model:', OPENAI_MODEL);
  } else {
    console.log('[Generate Insights] Model may not support JSON mode, relying on prompt:', OPENAI_MODEL);
  }

  console.log('[Generate Insights] Making OpenAI API request:', {
    model: OPENAI_MODEL,
    url: OPENAI_API_URL,
    hasApiKey: !!OPENAI_API_KEY,
    messageCount: requestBody.messages.length,
    systemPromptLength: systemPrompt.length,
    userPromptLength: userPrompt.length,
  });

  let response: Response;
  try {
    response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });
    console.log('[Generate Insights] OpenAI API response received:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries()),
    });
  } catch (fetchError) {
    console.error('[Generate Insights] Fetch error (network/connection):', fetchError);
    const errorMessage = fetchError instanceof Error ? fetchError.message : String(fetchError);
    throw new Error(`Failed to connect to OpenAI API: ${errorMessage}`);
  }

  let responseText: string;
  try {
    responseText = await response.text();
    console.log('[Generate Insights] OpenAI API response text length:', responseText.length);
    console.log('[Generate Insights] OpenAI API response text (first 500 chars):', responseText.substring(0, 500));
  } catch (textError) {
    console.error('[Generate Insights] Failed to read response text:', textError);
    const errorMessage = textError instanceof Error ? textError.message : String(textError);
    throw new Error(`Failed to read OpenAI API response: ${errorMessage}`);
  }

  if (!response.ok) {
    console.error('[Generate Insights] OpenAI API error response:', {
      status: response.status,
      statusText: response.statusText,
      body: responseText,
    });
    let errorDetails: any;
    try {
      errorDetails = JSON.parse(responseText);
      console.error('[Generate Insights] Parsed error details:', errorDetails);
    } catch (parseError) {
      console.error('[Generate Insights] Could not parse error response as JSON');
    }
    const errorMessage = errorDetails?.error?.message || errorDetails?.message || responseText || 'Unknown error';
    throw new Error(`OpenAI API error (${response.status}): ${errorMessage}`);
  }

  let data: any;
  try {
    data = JSON.parse(responseText);
    console.log('[Generate Insights] Parsed OpenAI response structure:', {
      hasChoices: !!data.choices,
      choicesLength: data.choices?.length || 0,
      hasUsage: !!data.usage,
      model: data.model,
    });
  } catch (parseError) {
    console.error('[Generate Insights] Failed to parse OpenAI response as JSON:', {
      responseText: responseText.substring(0, 1000),
      error: parseError,
    });
    const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
    throw new Error(`Failed to parse OpenAI API response as JSON: ${errorMessage}`);
  }

  if (!data.choices || data.choices.length === 0) {
    console.error('[Generate Insights] No choices in OpenAI response:', JSON.stringify(data, null, 2));
    throw new Error('No choices in OpenAI API response');
  }

  const content = data.choices[0]?.message?.content;
  console.log('[Generate Insights] Extracted content from response:', {
    hasContent: !!content,
    contentLength: content?.length || 0,
    contentPreview: content?.substring(0, 200) || 'N/A',
  });

  if (!content) {
    console.error('[Generate Insights] No content in OpenAI response:', {
      response: JSON.stringify(data, null, 2),
    });
    throw new Error('No content in OpenAI API response');
  }

  // Parse the response - handle potential markdown code blocks
  let jsonContent = content.trim();
  console.log('[Generate Insights] Raw JSON content (first 500 chars):', jsonContent.substring(0, 500));

  // Remove markdown code blocks if present
  if (jsonContent.startsWith('```json')) {
    console.log('[Generate Insights] Removing ```json code block markers');
    jsonContent = jsonContent.replace(/^```json\s*/, '').replace(/```\s*$/, '');
  } else if (jsonContent.startsWith('```')) {
    console.log('[Generate Insights] Removing ``` code block markers');
    jsonContent = jsonContent.replace(/^```\s*/, '').replace(/```\s*$/, '');
  }

  let parsed: any;
  try {
    parsed = JSON.parse(jsonContent);
    console.log('[Generate Insights] Successfully parsed JSON:', {
      hasInsights: !!parsed.insights,
      insightsIsArray: Array.isArray(parsed.insights),
      parsedIsArray: Array.isArray(parsed),
      keys: Object.keys(parsed),
    });
  } catch (parseError) {
    console.error('[Generate Insights] JSON parse error:', {
      error: parseError,
      jsonContent: jsonContent.substring(0, 1000),
      jsonContentLength: jsonContent.length,
    });
    const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
    throw new Error(`Failed to parse insights JSON: ${errorMessage}. Content preview: ${jsonContent.substring(0, 200)}`);
  }

  // Handle both object with "insights" key and direct array
  let insights: InsightResponse[];
  if (parsed.insights && Array.isArray(parsed.insights)) {
    insights = parsed.insights;
    console.log('[Generate Insights] Using insights from parsed.insights array, count:', insights.length);
  } else if (Array.isArray(parsed)) {
    insights = parsed;
    console.log('[Generate Insights] Using parsed as direct array, count:', insights.length);
  } else {
    insights = [parsed];
    console.log('[Generate Insights] Wrapping single object in array');
  }

  if (!Array.isArray(insights) || insights.length === 0) {
    console.error('[Generate Insights] Invalid insights format:', {
      parsed,
      insights,
      type: typeof insights,
      isArray: Array.isArray(insights),
    });
    throw new Error('Invalid insights format: expected array but got ' + typeof insights);
  }

  console.log('[Generate Insights] Successfully extracted insights:', {
    count: insights.length,
    types: insights.map(i => i.type),
  });

  return insights;
}

/**
 * Aggregate user data for AI analysis
 */
async function aggregateUserData(userId: string, supabase: any) {
  console.log(`[Generate Insights] Starting data aggregation for user ${userId}`);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgoDate = thirtyDaysAgo.toISOString().split('T')[0]; // Convert to YYYY-MM-DD format

  // Fetch all data in parallel
  console.log('[Generate Insights] Fetching positions, transactions, and cash transactions...');
  const [positionsResult, transactionsResult, cashTransactionsResult] = await Promise.all([
    supabase.from('positions').select('*').eq('user_id', userId),
    supabase.from('transactions').select('*').eq('user_id', userId).gte('activity_date', thirtyDaysAgoDate),
    supabase.from('cash_transactions').select('*').eq('user_id', userId),
  ]);

  if (positionsResult.error) {
    console.error('[Generate Insights] Positions query error:', positionsResult.error);
    throw new Error(`Database error (positions): ${positionsResult.error.message || JSON.stringify(positionsResult.error)}`);
  }
  if (transactionsResult.error) {
    console.error('[Generate Insights] Transactions query error:', transactionsResult.error);
    throw new Error(`Database error (transactions): ${transactionsResult.error.message || JSON.stringify(transactionsResult.error)}`);
  }
  if (cashTransactionsResult.error) {
    console.error('[Generate Insights] Cash transactions query error:', cashTransactionsResult.error);
    throw new Error(`Database error (cash_transactions): ${cashTransactionsResult.error.message || JSON.stringify(cashTransactionsResult.error)}`);
  }

  console.log(`[Generate Insights] Fetched ${positionsResult.data?.length || 0} positions, ${transactionsResult.data?.length || 0} transactions, ${cashTransactionsResult.data?.length || 0} cash transactions`);

  const positions = positionsResult.data || [];
  const transactions = transactionsResult.data || [];
  const cashTransactions = cashTransactionsResult.data || [];

  // Separate open and closed positions
  const openPositions = positions.filter((p: any) => p.status === 'open');
  const closedPositions = positions.filter((p: any) => p.status === 'closed');

  // Calculate metrics
  const totalUnrealizedPL = openPositions.reduce((sum: number, p: any) => sum + (p.unrealized_pl || 0), 0);
  const totalRealizedPL = closedPositions.reduce((sum: number, p: any) => sum + (p.realized_pl || 0), 0);

  const netCashFlow = cashTransactions
    .filter((tx: any) => !['FUTURES_MARGIN', 'FUTURES_MARGIN_RELEASE'].includes(tx.transaction_code))
    .reduce((sum: number, tx: any) => sum + (tx.amount || 0), 0);

  const totalFees = cashTransactions
    .filter((tx: any) => tx.transaction_code === 'FEE')
    .reduce((sum: number, tx: any) => sum + Math.abs(tx.amount || 0), 0);

  // Calculate market value by asset type
  const byAssetType: Record<string, any> = {};
  openPositions.forEach((p: any) => {
    const assetType = p.asset_type || 'unknown';
    if (!byAssetType[assetType]) {
      byAssetType[assetType] = { count: 0, marketValue: 0, unrealizedPL: 0 };
    }
    byAssetType[assetType].count++;

    const costBasis = Math.abs(p.total_cost_basis || 0);
    const unrealizedPL = p.unrealized_pl || 0;
    const marketValue = assetType === 'futures' ? unrealizedPL : costBasis + unrealizedPL;

    byAssetType[assetType].marketValue += marketValue;
    byAssetType[assetType].unrealizedPL += unrealizedPL;
  });

  const totalMarketValue = Object.values(byAssetType).reduce((sum: number, a: any) => sum + a.marketValue, 0);

  // Count positions by type
  const stockCount = openPositions.filter((p: any) => p.asset_type === 'stock').length;
  const optionCount = openPositions.filter((p: any) => p.asset_type === 'option').length;
  const cryptoCount = openPositions.filter((p: any) => p.asset_type === 'crypto').length;
  const futuresCount = openPositions.filter((p: any) => p.asset_type === 'futures').length;

  // Find expiring options
  const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const expiringOptions = openPositions.filter((p: any) => {
    if (p.asset_type !== 'option' || !p.expiration_date) return false;
    const expDate = new Date(p.expiration_date);
    return expDate >= new Date() && expDate <= sevenDaysFromNow;
  });

  // Find large unrealized losses
  const largeUnrealizedLosses = openPositions.filter((p: any) => {
    const unrealizedPL = p.unrealized_pl || 0;
    const costBasis = Math.abs(p.total_cost_basis || 0);
    const percentLoss = costBasis > 0 ? (unrealizedPL / costBasis) * 100 : 0;
    return unrealizedPL < -500 || percentLoss < -20;
  });

  // Calculate concentration
  const positionsBySymbol: Record<string, number> = {};
  openPositions.forEach((p: any) => {
    if (p.symbol) {
      const costBasis = Math.abs(p.total_cost_basis || 0);
      const unrealizedPL = p.unrealized_pl || 0;
      const marketValue = p.asset_type === 'futures' ? unrealizedPL : costBasis + unrealizedPL;
      positionsBySymbol[p.symbol] = (positionsBySymbol[p.symbol] || 0) + marketValue;
    }
  });

  const concentration = Object.entries(positionsBySymbol)
    .map(([symbol, value]) => ({
      symbol,
      percentage: totalMarketValue > 0 ? ((value as number) / totalMarketValue) * 100 : 0,
    }))
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 5);

  // Most traded symbols
  const symbolCounts: Record<string, number> = {};
  transactions.forEach((t: any) => {
    const symbol = t.underlying_symbol || t.instrument;
    if (symbol) {
      symbolCounts[symbol] = (symbolCounts[symbol] || 0) + 1;
    }
  });

  const mostTradedSymbols = Object.entries(symbolCounts)
    .map(([symbol, count]) => ({ symbol, count }))
    .sort((a, b) => (b.count as number) - (a.count as number))
    .slice(0, 5);

  // Win rate
  const recentClosedPositions = closedPositions.filter((p: any) => {
    if (!p.closed_at) return false;
    return new Date(p.closed_at) >= thirtyDaysAgo;
  });
  const winningTrades = recentClosedPositions.filter((p: any) => (p.realized_pl || 0) > 0).length;
  const winRate = recentClosedPositions.length > 0 ? (winningTrades / recentClosedPositions.length) * 100 : 0;

  // Build summary
  const summary = `
# Portfolio Summary

## Overview
- Total Portfolio Value: $${(netCashFlow + totalMarketValue).toFixed(2)}
- Net Cash Flow: $${netCashFlow.toFixed(2)}
- Total Unrealized P&L: $${totalUnrealizedPL.toFixed(2)}
- Total Realized P&L: $${totalRealizedPL.toFixed(2)}
- Total Fees Paid: $${totalFees.toFixed(2)}

## Open Positions (${openPositions.length})
- Total Market Value: $${totalMarketValue.toFixed(2)}
- Stocks: ${stockCount} positions
- Options: ${optionCount} positions
- Crypto: ${cryptoCount} positions
- Futures: ${futuresCount} positions

### By Asset Type
${Object.entries(byAssetType).map(([type, data]: [string, any]) =>
  `- ${type}: ${data.count} positions, Market Value: $${data.marketValue.toFixed(2)}, P&L: $${data.unrealizedPL.toFixed(2)}`
).join('\n')}

## Recent Performance (Last 30 Days)
- Closed Positions: ${recentClosedPositions.length}
- Win Rate: ${winRate.toFixed(1)}%
- Recent Transactions: ${transactions.length}

### Most Traded Symbols
${mostTradedSymbols.map((s: any) => `- ${s.symbol}: ${s.count} trades`).join('\n')}

## Risk Metrics
- Concentration (Top Holdings):
${concentration.map((c: any) => `  - ${c.symbol}: ${c.percentage.toFixed(1)}%`).join('\n')}
- Expiring Options (Next 7 Days): ${expiringOptions.length}
- Large Unrealized Losses: ${largeUnrealizedLosses.length}
`.trim();

  return summary;
}

Deno.serve(async (req) => {
  console.log('[Generate Insights] Function invoked');
  
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
      },
    });
  }

  // Validate environment variables at function start
  const envValidation = validateEnvironmentVariables();
  if (!envValidation.valid) {
    console.error('[Generate Insights] Environment validation failed:', envValidation.error);
    return new Response(
      JSON.stringify({ 
        error: 'Configuration error',
        message: envValidation.error,
        type: 'environment'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
        },
      }
    );
  }

  console.log('[Generate Insights] Environment variables validated');

  try {
    // Get user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[Generate Insights] Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
          },
        }
      );
    }

    console.log('[Generate Insights] Creating Supabase client...');
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const token = authHeader.replace('Bearer ', '');
    
    console.log('[Generate Insights] Authenticating user...');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('[Generate Insights] Authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: authError?.message }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
          },
        }
      );
    }

    console.log(`[Generate Insights] User authenticated: ${user.id}`);

    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      console.error('[Generate Insights] Failed to parse request body:', parseError);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid request body',
          type: 'request_parsing'
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
          },
        }
      );
    }

    const insightType = body.insightType || 'risk_warning';
    console.log(`[Generate Insights] Generating ${insightType} insights for user ${user.id}`);

    // Aggregate user data
    let portfolioSummary: string;
    try {
      portfolioSummary = await aggregateUserData(user.id, supabase);
      console.log('[Generate Insights] Data aggregation completed');
    } catch (dataError) {
      console.error('[Generate Insights] Data aggregation failed:', dataError);
      const errorMessage = dataError instanceof Error ? dataError.message : String(dataError);
      return new Response(
        JSON.stringify({
          error: 'Data aggregation failed',
          message: errorMessage,
          type: 'database'
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
          },
        }
      );
    }

    // Generate insights with OpenAI
    let insights: InsightResponse[];
    try {
      console.log('[Generate Insights] Calling OpenAI API...');
      insights = await generateInsightsWithOpenAI(portfolioSummary, insightType);
      console.log(`[Generate Insights] Successfully generated ${insights.length} insights from OpenAI`);
      console.log('[Generate Insights] Raw insights from OpenAI:', JSON.stringify(insights, null, 2));
    } catch (openaiError) {
      console.error('[Generate Insights] OpenAI API call failed:', openaiError);
      
      // Extract detailed error information
      let errorMessage = 'Unknown error';
      let errorType = 'openai_api';
      let errorDetails: any = null;
      
      if (openaiError instanceof Error) {
        errorMessage = openaiError.message;
        errorDetails = {
          name: openaiError.name,
          stack: openaiError.stack,
        };
        
        // Check if it's a specific OpenAI error pattern
        if (errorMessage.includes('OpenAI API error')) {
          errorType = 'openai_api';
        } else if (errorMessage.includes('Failed to parse')) {
          errorType = 'parsing_error';
        } else if (errorMessage.includes('Failed to connect')) {
          errorType = 'network_error';
        }
      } else {
        errorMessage = String(openaiError);
      }
      
      console.error('[Generate Insights] Error details:', {
        errorMessage,
        errorType,
        errorDetails,
        fullError: openaiError,
      });
      
      return new Response(
        JSON.stringify({
          error: 'AI generation failed',
          message: errorMessage,
          type: errorType,
          details: errorDetails,
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
          },
        }
      );
    }

    // Validate and normalize insights before inserting
    const validTypes = ['risk_warning', 'opportunity', 'pattern', 'performance', 'strategy'];
    const validPriorities = ['critical', 'high', 'medium', 'low'];
    
    const insightsToInsert = insights.map((insight: InsightResponse) => {
      // Normalize type - handle variations from AI
      let normalizedType = insight.type;
      if (typeof normalizedType === 'string') {
        normalizedType = normalizedType.toLowerCase().trim();
        // Handle common variations
        if (normalizedType === 'risk warning' || normalizedType === 'riskwarning') {
          normalizedType = 'risk_warning';
        }
      }
      
      // Validate type
      if (!validTypes.includes(normalizedType)) {
        console.error('[Generate Insights] Invalid insight type:', insight.type, '-> normalized:', normalizedType);
        // Default to risk_warning if invalid
        normalizedType = 'risk_warning';
      }
      
      // Normalize priority
      let normalizedPriority = insight.priority;
      if (typeof normalizedPriority === 'string') {
        normalizedPriority = normalizedPriority.toLowerCase().trim();
      }
      
      // Validate priority
      if (!validPriorities.includes(normalizedPriority)) {
        console.error('[Generate Insights] Invalid priority:', insight.priority, '-> normalized:', normalizedPriority);
        // Default to medium if invalid
        normalizedPriority = 'medium';
      }
      
      // Ensure confidence is within valid range
      let confidence = insight.confidence;
      if (typeof confidence !== 'number' || isNaN(confidence)) {
        confidence = 50; // Default confidence
      }
      confidence = Math.max(0, Math.min(100, confidence)); // Clamp to 0-100
      
      console.log('[Generate Insights] Normalized insight:', {
        originalType: insight.type,
        normalizedType,
        originalPriority: insight.priority,
        normalizedPriority,
        confidence,
      });
      
      return {
        user_id: user.id,
        type: normalizedType,
        priority: normalizedPriority,
        title: insight.title || 'Untitled Insight',
        description: insight.description || '',
        analysis: insight.analysis || '',
        recommendations: Array.isArray(insight.recommendations) ? insight.recommendations : [],
        related_symbols: Array.isArray(insight.related_symbols) ? insight.related_symbols : [],
        confidence: confidence,
        actionable: typeof insight.actionable === 'boolean' ? insight.actionable : false,
        expires_at: insight.expires_at || null,
        generated_at: new Date().toISOString(),
      };
    });

    console.log('[Generate Insights] Inserting insights into database...');
    const { data: insertedInsights, error: insertError } = await supabase
      .from('ai_insights')
      .insert(insightsToInsert)
      .select();

    if (insertError) {
      console.error('[Generate Insights] Database insert error:', insertError);
      const errorMessage = insertError.message || JSON.stringify(insertError);
      return new Response(
        JSON.stringify({
          error: 'Database insert failed',
          message: errorMessage,
          type: 'database_insert'
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
          },
        }
      );
    }

    console.log(`[Generate Insights] Successfully generated and stored ${insertedInsights?.length || 0} insights`);

    return new Response(
      JSON.stringify({
        success: true,
        insights: insertedInsights,
        count: insertedInsights?.length || 0,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
        },
      }
    );
  } catch (error) {
    console.error('[Generate Insights] Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: errorMessage,
        type: 'unexpected',
        ...(errorStack && { stack: errorStack })
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
        },
      }
    );
  }
});
