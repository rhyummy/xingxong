import { getPart, suppliersByPart } from '../data/index.js';
import { unitMoney } from '../lib/money.js';

const WEIGHTS = {
  reliability: 0.4,
  defectRate: 0.25,
  price: 0.2,
  leadTime: 0.15,
};

// Absolute reference scales, not min-max against the candidate pool — with
// only two suppliers min-max would always produce a degenerate 100 vs 0 spread.
const MAX_ACCEPTABLE_DEFECT_PCT = 5;
const MAX_ACCEPTABLE_LEAD_DAYS = 14;

const clamp01 = (v) => Math.min(1, Math.max(0, v));

export function runSupplierEvaluation(partId) {
  const part = getPart(partId);
  const suppliers = suppliersByPart[partId] || [];

  if (suppliers.length === 0) {
    return {
      agent: 'Supplier Evaluation',
      partId,
      ranked: [],
      singleSourceRisk: true,
      reasoning: `No suppliers on file for ${part.name}. Sourcing cannot proceed automatically.`,
    };
  }

  const cheapest = Math.min(...suppliers.map((s) => s.price));

  const ranked = suppliers
    .map((s) => {
      const score =
        100 *
        (WEIGHTS.reliability * clamp01(s.reliabilityScore / 100) +
          WEIGHTS.defectRate * clamp01(1 - s.defectRatePct / MAX_ACCEPTABLE_DEFECT_PCT) +
          WEIGHTS.price * clamp01(cheapest / s.price) +
          WEIGHTS.leadTime * clamp01(1 - s.leadTimeDays / MAX_ACCEPTABLE_LEAD_DAYS));
      return { ...s, score: Number(score.toFixed(1)) };
    })
    .sort((a, b) => b.score - a.score);

  const singleSourceRisk = suppliers.length === 1;
  const top = ranked[0];

  const reasoning = singleSourceRisk
    ? `${top.name} is the only supplier on file for ${part.name} (lead time ${top.leadTimeDays}d, reliability ${top.reliabilityScore}). Single-source dependency is a supply risk — no fallback exists if this supplier slips.`
    : `Ranked ${ranked.length} suppliers on reliability (40%), defect rate (25%), price (20%) and lead time (15%). ${top.name} leads at ${top.score}/100: ${unitMoney(top.price)} per unit, ${top.leadTimeDays}-day lead time, ${top.reliabilityScore} reliability, ${top.defectRatePct}% defect rate. Runner-up ${ranked[1].name} scores ${ranked[1].score}.`;

  return {
    agent: 'Supplier Evaluation',
    partId,
    ranked,
    recommended: top,
    singleSourceRisk,
    reasoning,
  };
}
