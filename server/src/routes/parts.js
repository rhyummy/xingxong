import { Router } from 'express';
import { parts, suppliersByPart, usageHistory, getPart } from '../data/index.js';
import { runDemandPrediction } from '../agents/demandPrediction.js';
import { runSupplierEvaluation } from '../agents/supplierEvaluation.js';
import { supabase } from '../lib/supabase.js';

const router = Router();

const decorate = (p) => ({
  ...p,
  supplierCount: (suppliersByPart[p.id] || []).length,
  triggerReady: p.currentStock < p.reorderThreshold,
});

router.get('/', (req, res) => res.json(parts.map(decorate)));

/**
 * Fleet-wide counters for the operations overview. Derived from the same
 * agents the pipeline uses, so the headline numbers cannot drift from what a
 * run would actually decide.
 */
router.get('/-/stats', async (req, res) => {
  const belowThreshold = parts.filter((p) => p.currentStock < p.reorderThreshold);

  let atRisk = 0;
  let anomalies = 0;
  for (const p of parts) {
    const demand = runDemandPrediction(p.id);
    if (demand.anomalyDetected) anomalies++;
    if (demand.daysUntilStockout !== null && demand.daysUntilStockout <= 7) atRisk++;
  }

  const singleSourced = parts.filter((p) => (suppliersByPart[p.id] || []).length === 1).length;
  const inventoryHealth = ((parts.length - belowThreshold.length) / parts.length) * 100;

  let pendingApprovals = 0;
  let decisionsProcessed = 0;
  let autoApproved = 0;

  if (supabase) {
    const [poRes, runRes, autoRes] = await Promise.all([
      supabase.from('purchase_orders').select('*', { count: 'exact', head: true }).eq('status', 'pending-approval'),
      supabase.from('pipeline_runs').select('*', { count: 'exact', head: true }),
      supabase.from('pipeline_runs').select('*', { count: 'exact', head: true }).eq('status', 'auto-approved'),
    ]);
    pendingApprovals = poRes.count ?? 0;
    decisionsProcessed = runRes.count ?? 0;
    autoApproved = autoRes.count ?? 0;
  }

  res.json({
    inventoryHealth: Number(inventoryHealth.toFixed(1)),
    autonomyRate: decisionsProcessed ? Number(((autoApproved / decisionsProcessed) * 100).toFixed(1)) : null,
    pendingApprovals,
    decisionsProcessed,
    partsAtRisk: atRisk,
    anomaliesDetected: anomalies,
    belowThreshold: belowThreshold.length,
    singleSourced,
    totalParts: parts.length,
  });
});

/**
 * Everything the part-intelligence screen needs in one call: the catalog row,
 * the raw usage series for charting, the ranked supplier set, and this part's
 * own decision history.
 */
router.get('/:id', async (req, res) => {
  let part;
  try {
    part = getPart(req.params.id);
  } catch {
    return res.status(404).json({ error: `Unknown part: ${req.params.id}` });
  }

  const demand = runDemandPrediction(part.id);
  const evaluation = runSupplierEvaluation(part.id);

  let history = [];
  if (supabase) {
    const { data } = await supabase
      .from('pipeline_runs')
      .select('id, status, order_value, anomaly_detected, failed_guardrails, logistics_status, advisor, created_at')
      .eq('part_id', part.id)
      .order('created_at', { ascending: false })
      .limit(10);
    history = data ?? [];
  }

  res.json({
    part: decorate(part),
    usageSeries: usageHistory[part.id] ?? [],
    demand,
    evaluation,
    history,
    // Same production line or category — the peer set the advisor reasons over.
    relatedParts: relatedTo(part),
  });
});

const lineOf = (p) => p.name.split('—').map((s) => s.trim())[1] ?? null;
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

function relatedTo(part) {
  const line = lineOf(part);
  return parts
    .filter((p) => p.id !== part.id && (lineOf(p) === line || p.category === part.category))
    .map((p) => {
      const series = usageHistory[p.id] ?? [];
      const baseline = mean(series.slice(0, -5));
      const recent = mean(series.slice(-5));
      return {
        id: p.id,
        name: p.name,
        sameLine: lineOf(p) === line,
        usageRatio: baseline > 0 ? Number((recent / baseline).toFixed(2)) : null,
        belowReorderPoint: p.currentStock < p.reorderThreshold,
      };
    })
    .sort((a, b) => (b.usageRatio ?? 0) - (a.usageRatio ?? 0))
    .slice(0, 6);
}

export default router;
