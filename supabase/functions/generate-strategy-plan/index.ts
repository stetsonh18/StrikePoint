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

const SUPPORTED_ASSET_TYPES = ['stock', 'option', 'crypto', 'futures'];

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

interface StrategyQuestion {
  question: string;
  answer: string;
  assetType?: string;
}

interface StrategyPlanAIResponse {
  plan_name?: string;
  summary?: string;
  mission_statement?: string;
  objectives?: string[];
  position_sizing?: {
    risk_per_trade_percent?: number;
    max_capital_allocation_percent?: number;
    cash_buffer_percent?: number;
    max_concurrent_positions?: number;
  };
  entry_criteria?: string[];
  exit_criteria?: string[];
  risk_management?: Record<string, JsonValue>;
  playbook?: Record<string, JsonValue>;
  mindset?: Record<string, JsonValue>;
  checklist?: string[] | Record<string, JsonValue>;
  routines?: Record<string, JsonValue>;
  guardrails?: Record<string, JsonValue>;
  focus_areas?: string[];
  prompts?: Record<string, JsonValue>;
}

interface StrategyPlanRequestPayload {
  assetType: string;
  strategyStyle?: string;
  planName?: string;
  timeHorizon?: string;
  tradeFrequency?: string;
  riskTolerance?: string;
  makePrimary?: boolean;
  questions?: StrategyQuestion[];
  [key: string]: unknown;
}

async function callOpenAI(systemPrompt: string, userPrompt: string) {
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
      temperature: 0.4,
      max_tokens: 2200,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userPrompt,
        },
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
    throw new Error('OpenAI response did not include any content');
  }

  let normalized = content.trim();
  if (normalized.startsWith('```')) {
    normalized = normalized.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/, '');
  }

  return JSON.parse(normalized) as StrategyPlanAIResponse;
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

  let payload: StrategyPlanRequestPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const assetType = String(payload.assetType || '').toLowerCase();
  if (!SUPPORTED_ASSET_TYPES.includes(assetType)) {
    return new Response(JSON.stringify({ error: 'Unsupported asset type' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const strategyStyle = payload.strategyStyle ? String(payload.strategyStyle) : undefined;
  const planName =
    payload.planName ||
    `${assetType.charAt(0).toUpperCase() + assetType.slice(1)} ${strategyStyle ?? 'Strategy'} ${new Date()
      .toISOString()
      .split('T')[0]}`;
  const questions: StrategyQuestion[] = Array.isArray(payload.questions) ? payload.questions : [];

  try {
    const portfolioContext = await fetchPortfolioContext(adminClient, user.id);
    const contextSummary = buildPortfolioPrompt(portfolioContext);

    const questionSummary =
      questions.length === 0
        ? 'No additional questionnaire responses were provided.'
        : questions
            .map(
              (item, index) =>
                `${index + 1}. ${item.question.trim()}: ${item.answer.trim()}${
                  item.assetType ? ` (asset focus: ${item.assetType})` : ''
                }`
            )
            .join('\n');

    const systemPrompt = `
You are an elite trading psychologist and strategist. Design a concise but extremely actionable strategy plan for a ${assetType} trader.
Always return valid JSON with keys:
- plan_name (string)
- summary (string)
- objectives (array of strings)
- position_sizing (object with risk_per_trade_percent, max_capital_allocation_percent, cash_buffer_percent, max_concurrent_positions)
- entry_criteria (array of strings)
- exit_criteria (array of strings)
- risk_management (object describing guardrails)
- playbook (object with phases such as pre_market, execution, post_market)
- mindset (object with affirmations or emotional guardrails)
- checklist (array of strings)
- routines (object with morning, intraday, evening steps)
- guardrails (object with rules, breach_triggers, focusAreas)
- focus_areas (array of strings highlighting what AI insights should monitor)
Numbers should be realistic based on the provided portfolio context and cash profile. Keep JSON concise, no markdown.
    `.trim();

    const userPrompt = `
User ID: ${user.id}
Asset Type: ${assetType}
Strategy Style: ${strategyStyle ?? 'unspecified'}
Time Horizon: ${payload.timeHorizon ?? 'unspecified'}
Trade Frequency: ${payload.tradeFrequency ?? 'unspecified'}
Risk Tolerance: ${payload.riskTolerance ?? 'unspecified'}

Portfolio Context:
${contextSummary}

Questionnaire:
${questionSummary}
    `.trim();

    const aiPlan = await callOpenAI(systemPrompt, userPrompt);

    const planSummary = aiPlan.summary ?? aiPlan.mission_statement ?? `Strategy guidance for ${assetType}`;
    const positionSizing = aiPlan.position_sizing ?? {};
    const entryRules = aiPlan.entry_criteria ?? [];
    const exitRules = aiPlan.exit_criteria ?? [];
    const fallbackRiskPercent =
      portfolioContext.riskBudget.portfolioValue > 0
        ? Number(
            (
              (portfolioContext.riskBudget.recommendedRiskPerTrade / portfolioContext.riskBudget.portfolioValue) *
              100
            ).toFixed(3)
          )
        : 1;

    const isPrimary = Boolean(payload.makePrimary);
    if (isPrimary) {
      await adminClient
        .from('trading_strategy_plans')
        .update({ is_primary: false })
        .eq('user_id', user.id)
        .eq('asset_type', assetType);
    }

    const { data: insertedPlan, error: insertError } = await adminClient
      .from('trading_strategy_plans')
      .insert({
        user_id: user.id,
        asset_type: assetType,
        plan_name: planName,
        description: planSummary,
        strategy_style: strategyStyle ?? null,
        time_horizon: payload.timeHorizon ?? null,
        trade_frequency: payload.tradeFrequency ?? null,
        risk_per_trade_percent: Number(positionSizing.risk_per_trade_percent) || fallbackRiskPercent,
        max_capital_allocation_percent: Number(positionSizing.max_capital_allocation_percent) || null,
        cash_buffer_percent: Number(positionSizing.cash_buffer_percent) || 20,
        max_concurrent_positions: Number(positionSizing.max_concurrent_positions) || null,
        status: 'draft',
        ai_prompt_context: {
          systemPrompt,
          userPrompt,
          questionnaire: questions,
          inputs: payload,
          portfolioContext,
        },
        ai_response: aiPlan,
        entry_rules: entryRules,
        exit_rules: exitRules,
        risk_management_rules: aiPlan.risk_management ?? null,
        playbook: aiPlan.playbook ?? null,
        mindset_notes: aiPlan.mindset ?? null,
        checklist: aiPlan.checklist ?? null,
        routines: aiPlan.routines ?? null,
        guardrails: aiPlan.guardrails ?? null,
        portfolio_snapshot: portfolioContext.snapshot ?? null,
        cash_snapshot: portfolioContext.cash ?? null,
        alignment_focus: aiPlan.focus_areas ?? null,
        alignment_score: null,
        is_primary: isPrimary,
        generated_with_ai: true,
      })
      .select('*')
      .single();

    if (insertError) {
      console.error('Failed to insert strategy plan', insertError);
      return new Response(JSON.stringify({ error: 'Failed to save plan', details: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        plan: insertedPlan,
        aiPlan,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Strategy plan generation failed', error);
    return new Response(
      JSON.stringify({
        error: 'Strategy creation failed',
        message: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

