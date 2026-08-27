import { getPart } from '../data/index.js';
import { GUARDRAILS } from '../lib/guardrails.js';
import { runDemandPrediction } from './demandPrediction.js';
import { runSupplierEvaluation } from './supplierEvaluation.js';

function poNumber(partId, supplierId) {
  return `PO-${partId.replace('P-', '')}-${supplierId.replace('S-', '')}`;
}

export function runProcurementDecision(partId, context = {}) {
  const part = getPart(partId);
  const demand = context.demand ?? runDemandPrediction(partId);
  const evaluation = context.evaluation ?? runSupplierEvaluation(partId);

  const supplier = evaluation.recommended;
  if (!supplier) {
    return {
      agent: 'Procurement Decision',
      partId,
      status: 'escalated',
      quantity: demand.predictedQuantity,
      totalCost: null,
      failedGuardrails: ['no-supplier-available'],
      alternatives: [],
      reasoning: `No supplier is available for ${part.name}. Escalating to procurement for manual sourcing.`,
    };
  }

  const quantity = demand.predictedQuantity;
  const totalCost = Number((quantity * supplier.price).toFixed(2));

  const failedGuardrails = [];
  if (totalCost > GUARDRAILS.costThreshold) failedGuardrails.push('cost-threshold');
  if (supplier.score < GUARDRAILS.supplierScoreThreshold) failedGuardrails.push('supplier-score-threshold');
  if (demand.anomalyDetected) failedGuardrails.push('demand-anomaly');
  if (evaluation.singleSourceRisk) failedGuardrails.push('single-source-risk');

  const autoApproved = failedGuardrails.length === 0;

  const guardrailExplanations = {
    'cost-threshold': `order value $${totalCost} exceeds the $${GUARDRAILS.costThreshold} auto-approval ceiling`,
    'supplier-score-threshold': `top supplier scores ${supplier.score}, below the required ${GUARDRAILS.supplierScoreThreshold}`,
    'demand-anomaly': `usage spike flagged upstream (z=${demand.zScore}) — could signal equipment failure, not routine wear`,
    'single-source-risk': 'only one supplier is on file, so there is no fallback if this order slips',
    'no-supplier-available': 'no suppliers on file',
  };

  const alternatives = evaluation.ranked.slice(0, 2).map((s) => ({
    supplier: s.name,
    supplierId: s.id,
    score: s.score,
    unitPrice: s.price,
    leadTimeDays: s.leadTimeDays,
    totalCost: Number((quantity * s.price).toFixed(2)),
  }));

  const reasoning = autoApproved
    ? `All guardrails passed: order value $${totalCost} is under the $${GUARDRAILS.costThreshold} ceiling, ${supplier.name} scores ${supplier.score} (min ${GUARDRAILS.supplierScoreThreshold}), demand is routine, and a backup supplier exists. Auto-generating PO for ${quantity} units and routing for e-signature.`
    : `Held for human approval. ${failedGuardrails.length} guardrail${failedGuardrails.length > 1 ? 's' : ''} failed: ${failedGuardrails.map((g) => guardrailExplanations[g]).join('; ')}. Presenting the top ${alternatives.length} ranked option${alternatives.length > 1 ? 's' : ''} with full reasoning rather than acting unilaterally.`;

  return {
    agent: 'Procurement Decision',
    partId,
    status: autoApproved ? 'auto-approved' : 'escalated',
    supplier,
    quantity,
    totalCost,
    poNumber: autoApproved ? poNumber(partId, supplier.id) : null,
    guardrails: GUARDRAILS,
    failedGuardrails,
    alternatives,
    reasoning,
  };
}
