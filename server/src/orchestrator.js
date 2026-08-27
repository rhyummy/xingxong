import { getPart } from './data/index.js';
import { runDemandPrediction } from './agents/demandPrediction.js';
import { runSupplierEvaluation } from './agents/supplierEvaluation.js';
import { runProcurementDecision } from './agents/procurementDecision.js';
import { runLogisticsCoordination } from './agents/logisticsCoordination.js';
import { generateExecutiveSummary } from './lib/llm.js';
import { recordRun, getPreviousOrder } from './lib/auditLog.js';
import { money } from './lib/money.js';
import { runEscalationAdvisor } from './agentic/escalationAdvisor.js';

// Stated assumption, not a measurement: industry surveys put routine indirect
// procurement at 3-5 working days end to end. We use 4 days as the midpoint
// and label it as an assumption everywhere it is shown, because we have not
// measured this organisation's actual manual cycle.
const MANUAL_BENCHMARK_HOURS = 96;
const MANUAL_BENCHMARK_NOTE =
  'Assumption: 4 working days, midpoint of the 3-5 day industry range for routine indirect procurement. Not measured.';

export async function runPipeline(partId) {
  const startedAt = Date.now();
  const part = getPart(partId);

  const demand = runDemandPrediction(partId);
  const evaluation = runSupplierEvaluation(partId);
  const decision = runProcurementDecision(partId, { demand, evaluation });
  const logistics = runLogisticsCoordination(partId, { demand, evaluation, decision });

  // Cost is measured against the catalog list price held in the parts master —
  // the reference price the business already budgets at, set independently of
  // any supplier quote. Comparing against the previous order would be circular
  // (the deterministic agent picks the same supplier every run, so the delta
  // is always zero), and comparing against the priciest vendor on file would
  // flatter the number.
  const previous = await getPreviousOrder(part.id);
  const costComparison =
    decision.supplier && decision.quantity
      ? {
          basis: 'catalog-list-price',
          basisNote: 'Chosen supplier price vs. the list price held in the parts master.',
          listUnitPrice: part.unitCost,
          chosenUnitPrice: decision.supplier.price,
          // Positive = paying above list. The ranking weights reliability at
          // 40% against price at 20%, so the agent deliberately buys a quality
          // premium. Surfaced honestly rather than reported as "savings".
          premiumPerUnit: Number((decision.supplier.price - part.unitCost).toFixed(2)),
          premiumOnThisOrder: Number(
            ((decision.supplier.price - part.unitCost) * decision.quantity).toFixed(2)
          ),
          premiumPct: Number(
            (((decision.supplier.price - part.unitCost) / part.unitCost) * 100).toFixed(1)
          ),
          interpretation:
            decision.supplier.price > part.unitCost
              ? 'Above list — reliability and lead time were weighted over unit price.'
              : 'At or below list.',
          // Only informative when the agent actually switched vendors.
          supplierChanged: previous ? previous.supplierId !== decision.supplier.id : null,
          previousSupplierId: previous?.supplierId ?? null,
          previousUnitPrice: previous?.unitPrice ?? null,
        }
      : { basis: 'no-supplier', note: 'No supplier selected, so no cost comparison is possible.' };

  const fallbackSummary =
    decision.status === 'auto-approved'
      ? `${part.name} hit its reorder point with ${demand.daysUntilStockout} days of stock left. All guardrails cleared, so a PO for ${decision.quantity} units was auto-issued to ${decision.supplier.name} at ${money(decision.totalCost)}. Logistics status: ${logistics.status}.`
      : `${part.name} hit its reorder point with ${demand.daysUntilStockout} days of stock left, but ${decision.failedGuardrails.length} guardrail(s) blocked auto-approval (${decision.failedGuardrails.join(', ')}). The decision is queued for human review with ${decision.alternatives.length} ranked option(s) attached. Logistics status: ${logistics.status}.`;

  // The advisor only runs on escalations — when the deterministic layer has
  // already refused to act and a human now needs a recommendation. It never
  // runs on auto-approvals, so the fast path stays fully deterministic and
  // makes no network call.
  const advisor =
    decision.status === 'escalated'
      ? await runEscalationAdvisor({ part, demand, evaluation, decision })
      : null;

  const trail = { demand, evaluation, decision, logistics };
  const executiveSummary = await generateExecutiveSummary(trail, fallbackSummary);

  const steps = [demand, evaluation, decision, logistics];
  const decisionSeconds = Number(((Date.now() - startedAt) / 1000).toFixed(2));

  const summary = {
    finalStatus: decision.status,
    orderValue: decision.totalCost,

    // Measured: wall-clock time this pipeline actually took.
    decisionSeconds,

    // Assumption-based: benchmark minus measured time. Labelled so nobody
    // mistakes it for an observed figure.
    cycleTime: {
      manualBenchmarkHours: MANUAL_BENCHMARK_HOURS,
      manualBenchmarkNote: MANUAL_BENCHMARK_NOTE,
      automatedSeconds: decisionSeconds,
      // Escalations still need a human, so only the research-and-sourcing
      // portion is compressed — the approval wait is not eliminated.
      estimatedHoursSaved:
        decision.status === 'auto-approved'
          ? Number((MANUAL_BENCHMARK_HOURS - decisionSeconds / 3600).toFixed(1))
          : null,
      escalationNote:
        decision.status === 'escalated'
          ? 'Escalated — sourcing and analysis were automated, but approval still requires a human, so no end-to-end cycle-time claim is made.'
          : null,
    },

    costComparison,
    executiveSummary,
  };

  const runId = await recordRun({ part, steps, summary, advisor });

  return { runId, part, steps, advisor, summary };
}
