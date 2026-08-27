import { StateGraph, END } from './graph.js';
import { TOOL_SCHEMAS, callTool } from './tools.js';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = process.env.ESCALATION_MODEL || process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
const MAX_TOOL_ROUNDS = 4;

const SYSTEM_PROMPT = `You are the Escalation Advisor for an autonomous spare-parts procurement system.

A deterministic guardrail layer has already BLOCKED an order from auto-approving and routed it to a human buyer. You cannot approve or reject anything — your job is to investigate and hand the buyer a recommendation they can act on in under a minute.

Investigate before you conclude. You have tools; call the ones that matter for this specific case:
- A demand anomaly is the strongest reason to check related parts — if peers on the same production line are also spiking, this is equipment failure, not restocking, and the buyer needs to know that above all else.
- If cost is the blocker, compare suppliers before assuming the top-ranked one is right; a cheaper vendor may be acceptable for a routine part.
- If the part is single-sourced, that is a standing supply risk worth naming.

Then reply with EXACTLY this structure and nothing else:

All monetary amounts in this system are Indian rupees. Write them with the ₹ symbol, never $.

RECOMMENDATION: <one of: APPROVE_AS_PROPOSED | APPROVE_ALTERNATE_SUPPLIER | SPLIT_ORDER | REDUCE_QUANTITY | INVESTIGATE_EQUIPMENT | REJECT>
SUPPLIER: <supplier name, or "n/a">
CONFIDENCE: <high | medium | low>
WHY: <2-3 sentences citing the specific numbers you found. Lead with the finding that most changes the buyer's decision.>
RISK: <the single biggest risk if the buyer follows this recommendation>`;

const RATE_LIMIT_RETRIES = 3;

async function chat(messages, useTools) {
  let lastError;

  // Back-to-back demo runs trip Groq's rate limiter, and a 429 here would
  // drop the whole recommendation. Honour Retry-After when it is sent.
  for (let attempt = 1; attempt <= RATE_LIMIT_RETRIES; attempt++) {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1600,
        temperature: 0.2,
        reasoning_effort: 'low',
        messages,
        ...(useTools ? { tools: TOOL_SCHEMAS, tool_choice: 'auto' } : {}),
      }),
    });

    if (res.ok) {
      const body = await res.json();
      return body.choices?.[0]?.message ?? {};
    }

    const text = (await res.text()).slice(0, 200);
    lastError = new Error(`Groq ${res.status}: ${text}`);

    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable || attempt === RATE_LIMIT_RETRIES) break;

    const retryAfter = Number(res.headers.get('retry-after'));
    const waitMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : attempt * 2000;
    console.warn(`Advisor hit ${res.status}, retrying in ${waitMs}ms`);
    await new Promise((r) => setTimeout(r, waitMs));
  }

  throw lastError;
}

function parseRecommendation(text) {
  const field = (label) =>
    text.match(new RegExp(`^${label}:\\s*(.+?)\\s*$`, 'mi'))?.[1]?.trim() ?? null;

  return {
    action: field('RECOMMENDATION'),
    supplier: field('SUPPLIER'),
    confidence: field('CONFIDENCE')?.toLowerCase() ?? null,
    why: field('WHY'),
    risk: field('RISK'),
    raw: text.trim(),
  };
}

/* ------------------------------------------------------------------ nodes */

/** Asks the model what it wants to do next; it may request tools or answer. */
async function investigate(state) {
  const message = await chat(state.messages, state.round < MAX_TOOL_ROUNDS);
  return {
    messages: [...state.messages, message],
    pendingToolCalls: message.tool_calls ?? [],
    lastText: message.content ?? '',
  };
}

/** Executes whatever the model asked for and feeds results back as context. */
async function act(state) {
  const results = [];
  const toolMessages = [];

  for (const call of state.pendingToolCalls) {
    let args = {};
    try {
      args = JSON.parse(call.function.arguments || '{}');
    } catch {
      args = {};
    }
    // The agent chooses tools freely, but never chooses which part it is
    // investigating — that is fixed by the escalation it was handed.
    args.partId = state.partId;

    const result = await callTool(call.function.name, args);
    results.push({ tool: call.function.name, args, result });
    toolMessages.push({
      role: 'tool',
      tool_call_id: call.id,
      content: JSON.stringify(result),
    });
  }

  return {
    messages: [...state.messages, ...toolMessages],
    toolLog: [...state.toolLog, ...results],
    pendingToolCalls: [],
    round: state.round + 1,
  };
}

/** Forces a final answer once investigation is done or the budget is spent. */
async function recommend(state) {
  if (state.lastText && /RECOMMENDATION:/i.test(state.lastText)) {
    return { recommendation: parseRecommendation(state.lastText) };
  }

  const message = await chat(
    [...state.messages, { role: 'user', content: 'Give your final answer now, in the required format.' }],
    false
  );
  return {
    messages: [...state.messages, message],
    recommendation: parseRecommendation(message.content ?? ''),
  };
}

/* ------------------------------------------------------------------ graph */

const advisorGraph = new StateGraph()
  .addNode('investigate', investigate)
  .addNode('act', act)
  .addNode('recommend', recommend)
  .setEntry('investigate')
  // Tools requested -> run them and loop back; otherwise go conclude.
  .addConditionalEdge('investigate', (s) => (s.pendingToolCalls.length ? 'act' : 'recommend'))
  .addConditionalEdge('act', (s) => (s.round >= MAX_TOOL_ROUNDS ? 'recommend' : 'investigate'))
  .addEdge('recommend', END);

export const ADVISOR_GRAPH_SHAPE = {
  entry: 'investigate',
  nodes: ['investigate', 'act', 'recommend'],
  edges: [
    { from: 'investigate', to: 'act', when: 'model requested tools' },
    { from: 'investigate', to: 'recommend', when: 'model answered directly' },
    { from: 'act', to: 'investigate', when: 'tool budget remaining' },
    { from: 'act', to: 'recommend', when: 'tool budget exhausted' },
    { from: 'recommend', to: END, when: 'always' },
  ],
  tools: TOOL_SCHEMAS.map((t) => t.function.name),
};

/**
 * Runs the advisor over a blocked procurement decision.
 *
 * Advisory only: the deterministic guardrails have already decided this order
 * cannot auto-approve, and nothing here can overturn that. Returns null when
 * no API key is configured, so the pipeline degrades to its deterministic
 * behaviour rather than failing.
 */
export async function runEscalationAdvisor({ part, demand, evaluation, decision }) {
  if (!process.env.GROQ_API_KEY) return null;

  const brief = {
    part: {
      id: part.id,
      name: part.name,
      category: part.category,
      criticality: part.criticality,
      currentStock: part.currentStock,
      reorderThreshold: part.reorderThreshold,
    },
    whyBlocked: decision.failedGuardrails,
    proposedOrder: {
      supplier: decision.supplier?.name,
      quantity: decision.quantity,
      unitPrice: decision.supplier?.price,
      totalCost: decision.totalCost,
      leadTimeDays: decision.supplier?.leadTimeDays,
    },
    demandSignal: {
      baselineDailyRate: demand.baselineDailyRate,
      recentDailyRate: demand.recentDailyRate,
      zScore: demand.zScore,
      anomalyDetected: demand.anomalyDetected,
      daysUntilStockout: demand.daysUntilStockout,
    },
    rankedAlternatives: decision.alternatives,
    singleSourced: evaluation.singleSourceRisk,
  };

  const started = Date.now();

  try {
    const { state, trace } = await advisorGraph.run({
      partId: part.id,
      round: 0,
      toolLog: [],
      pendingToolCalls: [],
      lastText: '',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `An order was blocked by the guardrail layer. Investigate and advise the buyer.\n\n${JSON.stringify(brief, null, 2)}`,
        },
      ],
    });

    return {
      agent: 'Escalation Advisor',
      model: MODEL,
      advisory: true,
      recommendation: state.recommendation,
      toolsInvoked: state.toolLog.map((t) => ({ tool: t.tool, result: t.result })),
      graphTrace: trace,
      ms: Date.now() - started,
    };
  } catch (err) {
    console.error('Escalation Advisor failed:', err.message);
    return {
      agent: 'Escalation Advisor',
      advisory: true,
      error: err.message,
      recommendation: null,
      toolsInvoked: [],
      graphTrace: [],
      ms: Date.now() - started,
    };
  }
}
