// Thresholds are tuned against the seeded dataset's real distributions so the
// agent auto-approves routine low-value reorders and escalates the rest.
// Currency is INR throughout.
export const GUARDRAILS = {
  costThreshold: 400000,
  supplierScoreThreshold: 72,
  delayRiskLeadTimeDays: 10,
};
