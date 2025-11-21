import { requireAuth } from '../_shared/auth.ts';
import { fetchPortfolioContext, buildPortfolioPrompt } from '../_shared/strategy.ts';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const OPENAI_API_URL = Deno.env.get('OPENAI_API_URL') ?? 'https://api.openai.com/v1/chat/completions';
const OPENAI_MODEL = Deno.env.get('OPENAI_MODEL') ?? 'gpt-4o-mini';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, baggage, sentry-trace',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

interface AlignmentAIResponse {
  alignment_score?: number;
  alignmentScore?: number;
  verdict?: string;
  summary?: string;
  focus_areas?: string[];
  breaches?: Array<{
    rule: string;
    evidence?: string;
    severity?: 'info' | 'warning' | 'critical';
    recommendation?: string;
  }>;
  action_items?: Array<{
    priority: 'high' | 'medium' | 'low';
    description: string;
    timeframe?: string;
  }>;
  strengths?: string[];
}

interface DbStrategyPlan {
  id: string;
  plan_name: string;
  asset_type: string;
  strategy_style?: string | null;
  status: string;
  time_horizon?: string | null;
  trade_frequency?: string | null;
  risk_per_trade_percent?: number | null;
  max_capital_allocation_percent?: number | null;
  max_concurrent_positions?: number | null;
  guardrails?: JsonValue;
  entry_rules?: JsonValue;
  exit_rules?: JsonValue;
  risk_management_rules?: JsonValue;
}

interface AlignmentRequestPayload {
  planId?: string;
  plan_id?: string;
}

function sanitizeJson(content: string): AlignmentAIResponse {
  let normalized = content.trim();
  if (normalized.startsWith('```')) {
    normalized = normalized.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/, '');
  }
  return JSON.parse(normalized);
}

async function callOpenAI(systemPrompt: string, userPrompt: string): Promise<AlignmentAIResponse> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.3,
      response_format: { type: 'json_object' },
      max_tokens: 1800,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI request failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const content: string | undefined = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('OpenAI response missing content');
  }

  return sanitizeJson(content);
}

function summarizePlan(plan: DbStrategyPlan): string {
  const parts: string[] = [];
  parts.push(`Plan Name: ${plan.plan_name}`);
  parts.push(`Asset Type: ${plan.asset_type}`);
  parts.push(`Strategy Style: ${plan.strategy_style ?? 'n/a'}`);
  parts.push(`Status: ${plan.status}`);
  parts.push(`Time Horizon: ${plan.time_horizon ?? 'n/a'}`);
  parts.push(`Trade Frequency: ${plan.trade_frequency ?? 'n/a'}`);
  parts.push(`Risk Per Trade: ${plan.risk_per_trade_percent ?? 'n/a'}`);
  parts.push(`Max Capital Allocation: ${plan.max_capital_allocation_percent ?? 'n/a'}`);
  parts.push(`Max Concurrent Positions: ${plan.max_concurrent_positions ?? 'n/a'}`);
  if (plan.guardrails) {
    parts.push(`Guardrails: ${JSON.stringify(plan.guardrails)}`);
  }
  if (plan.entry_rules) {
    parts.push(`Entry Rules: ${JSON.stringify(plan.entry_rules)}`);
  }
  if (plan.exit_rules) {
    parts.push(`Exit Rules: ${JSON.stringify(plan.exit_rules)}`);
  }
  if (plan.risk_management_rules) {
    parts.push(`Risk Management: ${JSON.stringify(plan.risk_management_rules)}`);
  }
  return parts.join('\n');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const auth = await requireAuth(req, { requireActiveSubscription: true });
  if (auth instanceof Response) {
    return auth;
  }

  const { adminClient, user } = auth;

  let payload: AlignmentRequestPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const planId = payload.planId || payload.plan_id;
  if (!planId) {
    return new Response(JSON.stringify({ error: 'planId is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { data: plan, error: planError } = await adminClient
      .from('trading_strategy_plans')
      .select('*')
      .eq('id', planId)
      .eq('user_id', user.id)
      .maybeSingle<DbStrategyPlan>();

    if (planError) {
      throw planError;
    }

    if (!plan) {
      return new Response(JSON.stringify({ error: 'Strategy plan not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const portfolioContext = await fetchPortfolioContext(adminClient, user.id);
    const portfolioSummary = buildPortfolioPrompt(portfolioContext);
    const planSummary = summarizePlan(plan);

    const systemPrompt = `
    You are an expert trading coach and risk manager. Your goal is to evaluate if a user's recent trading activity aligns with their defined strategy plan.
    
    You will be provided with:
    1. The user's Strategy Plan (Guardrails, Entry/Exit Rules, Risk Management).
    2. The user's Portfolio Context (Current balances, open positions, AND RECENT CLOSED TRADES performance).
    
    CRITICAL INSTRUCTION:
    - You MUST check the 'recentPerformance' section in the Portfolio Context. This contains data on CLOSED trades (realized P/L, win rate, trade count).
    - If 'recentPerformance' shows executed trades (trade_count > 0), you MUST use this as evidence of trading activity. Do NOT say "no trades executed" if there are closed trades in 'recentPerformance'.
    - Compare their actual trading behavior (from both open positions and recent closed trades) against their stated rules.
    - If they have no open positions but have closed trades, evaluate the closed trades against their rules.
    
    Output a JSON object with the following structure:
    {
      "alignment_score": number (0-100),
      "breaches": [
        {
          "rule": "string (the specific rule violated)",
          "severity": "critical" | "warning" | "info",
          "evidence": "string (specific trade or metric that proves the breach)",
          "recommendation": "string (how to fix it)"
        }
      ],
      "action_items": [
        {
          "priority": "high" | "medium" | "low",
          "description": "string",
          "timeframe": "string (e.g., 'Immediate', 'Next Trade', 'Weekly')"
        }
      ],
      "focus_areas": ["string", "string"],
      "summary": "string (2-3 sentences summarizing their discipline)"
    }
    `.trim();

    const userPrompt = `
User: ${user.id}
Strategy Plan:
${planSummary}

Portfolio Context:
${portfolioSummary}
    `.trim();

    const aiResult = await callOpenAI(systemPrompt, userPrompt);
    const alignmentScore = Math.max(
      0,
      Math.min(100, Number(aiResult.alignment_score ?? aiResult.alignmentScore ?? 0))
    );

    const { data: snapshot, error: snapshotError } = await adminClient
      .from('strategy_alignment_snapshots')
      .insert({
        plan_id: plan.id,
        user_id: user.id,
        asset_type: plan.asset_type,
        alignment_score: alignmentScore,
        focus_areas: aiResult.focus_areas ?? [],
        breaches: aiResult.breaches ?? [],
        action_items: aiResult.action_items ?? [],
        portfolio_metrics: {
          snapshot: portfolioContext.snapshot,
          exposures: portfolioContext.exposures,
          totals: portfolioContext.totals,
        },
        cash_metrics: portfolioContext.cash ?? null,
        ai_prompt: { systemPrompt, userPrompt },
        ai_response: aiResult,
      })
      .select('*')
      .single();

    if (snapshotError) {
      throw snapshotError;
    }

    // Update the plan with the latest alignment check
    await adminClient
      .from('trading_strategy_plans')
      .update({
        last_alignment_check: new Date().toISOString(),
        alignment_score: alignmentScore,
      })
      .eq('id', plan.id);

    return new Response(JSON.stringify(snapshot), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
