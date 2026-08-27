import { parts, usageHistory, suppliersByPart, getPart } from '../data/index.js';
import { supabase } from '../lib/supabase.js';

// Production line is encoded in the part name ("Spool Valve — Line B"), which
// is how the catalog arrives from the ERP mock. Parsing it here keeps the
// tool surface clean rather than leaking the naming convention to the agent.
function lineOf(part) {
  const [, line] = part.name.split('—').map((s) => s.trim());
  return line ?? null;
}

function mean(xs) {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

/**
 * Tool implementations. Each returns a compact plain object — these go back
 * into the model's context, so they stay small and pre-summarised rather than
 * dumping raw tables.
 */
export const TOOL_IMPLS = {
  get_usage_history({ partId, days = 30 }) {
    const part = getPart(partId);
    const series = usageHistory[partId] ?? [];
    const window = series.slice(-Math.min(days, series.length));
    const baseline = series.slice(0, -5);
    const recent = series.slice(-5);

    return {
      partId,
      partName: part.name,
      daysReturned: window.length,
      dailyUsage: window,
      baselineDailyMean: Number(mean(baseline).toFixed(2)),
      recentDailyMean: Number(mean(recent).toFixed(2)),
      peakDay: Math.max(...window),
      currentStock: part.currentStock,
    };
  },

  compare_suppliers({ partId }) {
    const suppliers = suppliersByPart[partId] ?? [];
    return {
      partId,
      supplierCount: suppliers.length,
      singleSourced: suppliers.length === 1,
      suppliers: suppliers.map((s) => ({
        id: s.id,
        name: s.name,
        region: s.region,
        price: s.price,
        leadTimeDays: s.leadTimeDays,
        reliabilityScore: s.reliabilityScore,
        defectRatePct: s.defectRatePct,
      })),
    };
  },

  /**
   * The tool that makes the agent worth having: it lets the model ask whether
   * a spike is isolated wear or a failing production line — a question no
   * fixed guardrail anticipates.
   */
  check_related_parts({ partId }) {
    const part = getPart(partId);
    const line = lineOf(part);

    const related = parts
      .filter((p) => p.id !== partId && (lineOf(p) === line || p.category === part.category))
      .map((p) => {
        const series = usageHistory[p.id] ?? [];
        const baseline = mean(series.slice(0, -5));
        const recent = mean(series.slice(-5));
        return {
          partId: p.id,
          name: p.name,
          sameLine: lineOf(p) === line,
          sameCategory: p.category === part.category,
          baselineDailyMean: Number(baseline.toFixed(2)),
          recentDailyMean: Number(recent.toFixed(2)),
          usageRatio: baseline > 0 ? Number((recent / baseline).toFixed(2)) : null,
          belowReorderPoint: p.currentStock < p.reorderThreshold,
        };
      })
      .sort((a, b) => (b.usageRatio ?? 0) - (a.usageRatio ?? 0));

    return {
      subject: { partId, name: part.name, line, category: part.category },
      relatedCount: related.length,
      // Ratio > 1.5 is the signal worth surfacing: consumption running half
      // again above its own baseline.
      elevatedPeers: related.filter((r) => (r.usageRatio ?? 0) > 1.5),
      related: related.slice(0, 8),
    };
  },

  async get_past_decisions({ partId }) {
    if (!supabase) return { partId, runs: [], note: 'audit store unavailable' };

    const { data, error } = await supabase
      .from('pipeline_runs')
      .select('status, order_value, anomaly_detected, failed_guardrails, logistics_status, created_at')
      .eq('part_id', partId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) return { partId, runs: [], note: `audit query failed: ${error.message}` };
    return { partId, runs: data };
  },
};

/** JSON Schema definitions handed to the model. */
export const TOOL_SCHEMAS = [
  {
    type: 'function',
    function: {
      name: 'get_usage_history',
      description:
        'Fetch daily consumption history for a part, with baseline and recent means. Use to judge whether a spike is sustained or a one-off blip.',
      parameters: {
        type: 'object',
        properties: {
          partId: { type: 'string', description: 'Part identifier, e.g. P-1026' },
          days: { type: 'integer', description: 'How many recent days to return (default 30)' },
        },
        required: ['partId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'compare_suppliers',
      description:
        'List every supplier able to fulfil a part, with price, lead time, reliability and defect rate. Use to weigh alternatives against each other.',
      parameters: {
        type: 'object',
        properties: { partId: { type: 'string' } },
        required: ['partId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'check_related_parts',
      description:
        'Find parts on the same production line or in the same category and compare their recent usage against their own baselines. Use to determine whether a demand spike is isolated to one part or affecting a whole line, which would suggest equipment failure.',
      parameters: {
        type: 'object',
        properties: { partId: { type: 'string' } },
        required: ['partId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_past_decisions',
      description:
        'Retrieve recent pipeline decisions recorded for this part. Use to check whether this situation has come up before and how it was handled.',
      parameters: {
        type: 'object',
        properties: { partId: { type: 'string' } },
        required: ['partId'],
      },
    },
  },
];

export async function callTool(name, args) {
  const impl = TOOL_IMPLS[name];
  if (!impl) return { error: `Unknown tool: ${name}` };
  try {
    return await impl(args ?? {});
  } catch (err) {
    return { error: err.message };
  }
}
