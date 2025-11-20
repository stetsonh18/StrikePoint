import { requireAuth } from '../_shared/auth.ts';
import { fetchPortfolioContext, buildPortfolioPrompt } from '../_shared/strategy.ts';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const OPENAI_API_URL = Deno.env.get('OPENAI_API_URL') ?? 'https://api.openai.com/v1/chat/completions';
const OPENAI_MODEL = Deno.env.get('OPENAI_MODEL') ?? 'gpt-4o-mini';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

interface AlignmentAIResponse {
  alignment_score?: number;
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
  } catch (_error) {
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
You are an accountability coach that enforces strict trading playbooks.
Compare the stored strategy plan with current portfolio and cash data.
Return JSON with:
  - alignment_score (0-100 integer)
  - verdict (string)
  - summary (string)
  - focus_areas (array of strings)
  - breaches (array of { rule, evidence, severity, recommendation })
  - action_items (array of { priority, description, timeframe })
  - strengths (array of strings)
When assessing alignment, weigh guardrails, risk limits, and exposure concentration. Flag missing data gently.
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

    const { error: updateError } = await adminClient
      .from('trading_strategy_plans')
      .update({
        alignment_score: alignmentScore,
        alignment_focus: aiResult.focus_areas ?? [],
        last_alignment_check: new Date().toISOString(),
      })
      .eq('id', plan.id);

    if (updateError) {
      throw updateError;
    }

    return new Response(
      JSON.stringify({
        snapshot,
        aiResult,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Strategy alignment evaluation failed', error);
    return new Response(
      JSON.stringify({
        error: 'Alignment evaluation failed',
        message: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

