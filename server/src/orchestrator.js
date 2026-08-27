import { getPart } from './data/index.js';
import { runDemandPrediction } from './agents/demandPrediction.js';
import { runSupplierEvaluation } from './agents/supplierEvaluation.js';
import { runProcurementDecision } from './agents/procurementDecision.js';
import { runLogisticsCoordination } from './agents/logisticsCoordination.js';
import { generateExecutiveSummary } from './lib/llm.js';
import { recordRun } from './lib/auditLog.js';

const MANUAL_CYCLE_HOURS = 96; // 4-day manual procurement baseline
const AGENT_CYCLE_HOURS = 0.05; // ~3 minutes end-to-end

export async function runPipeline(partId) {
  const part = getPart(partId);

  const demand = runDemandPrediction(partId);
  const evaluation = runSupplierEvaluation(partId);
  const decision = runProcurementDecision(partId, { demand, evaluation });
  const logistics = runLogisticsCoordination(partId, { demand, evaluation, decision });

  const worstCost = evaluation.ranked.length
    ? Math.max(...evaluation.ranked.map((s) => s.price)) * decision.quantity
    : 0;
  const costAvoidance = decision.totalCost ? Number((worstCost - decision.totalCost).toFixed(2)) : 0;

  const humanHoursSaved =
    decision.status === 'auto-approved'
      ? Number(((MANUAL_CYCLE_HOURS - AGENT_CYCLE_HOURS) / 24).toFixed(1))
      : Number((MANUAL_CYCLE_HOURS / 24 / 2).toFixed(1));

  const fallbackSummary =
    decision.status === 'auto-approved'
      ? `${part.name} hit its reorder point with ${demand.daysUntilStockout} days of stock left. All guardrails cleared, so a PO for ${decision.quantity} units was auto-issued to ${decision.supplier.name} at $${decision.totalCost}. Logistics status: ${logistics.status}.`
      : `${part.name} hit its reorder point with ${demand.daysUntilStockout} days of stock left, but ${decision.failedGuardrails.length} guardrail(s) blocked auto-approval (${decision.failedGuardrails.join(', ')}). The decision is queued for human review with ${decision.alternatives.length} ranked option(s) attached. Logistics status: ${logistics.status}.`;

  const trail = { demand, evaluation, decision, logistics };
  const executiveSummary = await generateExecutiveSummary(trail, fallbackSummary);

  const steps = [demand, evaluation, decision, logistics];
  const summary = {
    finalStatus: decision.status,
    manualCycleDays: MANUAL_CYCLE_HOURS / 24,
    agentCycleMinutes: Number((AGENT_CYCLE_HOURS * 60).toFixed(0)),
    daysSaved: humanHoursSaved,
    costAvoidance,
    orderValue: decision.totalCost,
    executiveSummary,
  };

  const runId = await recordRun({ part, steps, summary });

  return { runId, part, steps, summary };
}
