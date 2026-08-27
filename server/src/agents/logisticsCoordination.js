import { getPart } from '../data/index.js';
import { GUARDRAILS } from '../lib/guardrails.js';
import { runDemandPrediction } from './demandPrediction.js';
import { runSupplierEvaluation } from './supplierEvaluation.js';
import { runProcurementDecision } from './procurementDecision.js';

export function runLogisticsCoordination(partId, context = {}) {
  const part = getPart(partId);
  const demand = context.demand ?? runDemandPrediction(partId);
  const evaluation = context.evaluation ?? runSupplierEvaluation(partId);
  const decision = context.decision ?? runProcurementDecision(partId, { demand, evaluation });

  const supplier = decision.supplier;
  if (!supplier) {
    return {
      agent: 'Logistics Coordination',
      partId,
      status: 'blocked',
      reasoning: `No shipment to track for ${part.name} — procurement did not select a supplier.`,
    };
  }

  const leadTime = supplier.leadTimeDays;
  const delayRisk = leadTime > GUARDRAILS.delayRiskLeadTimeDays;
  const missesStockout = demand.daysUntilStockout !== null && leadTime > demand.daysUntilStockout;
  const backup = evaluation.ranked.find((s) => s.id !== supplier.id) ?? null;

  let action;
  let reasoning;

  if (!delayRisk && !missesStockout) {
    action = 'on-track';
    reasoning = `${supplier.name} quotes ${leadTime} days against a projected ${demand.daysUntilStockout}-day runway. Shipment arrives ahead of stockout — monitoring only, no intervention needed.`;
  } else if (backup) {
    action = 'backup-sourced';
    reasoning = `${supplier.name}'s ${leadTime}-day lead time ${missesStockout ? `misses the ${demand.daysUntilStockout}-day stockout window` : `exceeds the ${GUARDRAILS.delayRiskLeadTimeDays}-day delay-risk threshold`}. Auto-sourcing ${backup.name} (${backup.leadTimeDays}d, score ${backup.score}) as backup and staging a split order to protect the production schedule.`;
  } else {
    action = 'reroute-inventory';
    reasoning = `${supplier.name}'s ${leadTime}-day lead time ${missesStockout ? `misses the ${demand.daysUntilStockout}-day stockout window` : `exceeds the ${GUARDRAILS.delayRiskLeadTimeDays}-day delay-risk threshold`} and no alternate supplier exists. Recommending inventory reroute from a sister site and flagging the single-source exposure to procurement.`;
  }

  return {
    agent: 'Logistics Coordination',
    partId,
    status: action,
    chosenSupplier: supplier.name,
    leadTimeDays: leadTime,
    daysUntilStockout: demand.daysUntilStockout,
    delayRisk: delayRisk || missesStockout,
    backupSupplier: action === 'backup-sourced' ? backup : null,
    reasoning,
  };
}
