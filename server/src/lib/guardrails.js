// Thresholds are tuned against the seeded dataset's real distributions so the
// agent auto-approves routine low-value reorders and escalates the rest:
// median order value is ~$4.8k and median top-supplier score ~75.
export const GUARDRAILS = {
  costThreshold: 5000,
  supplierScoreThreshold: 72,
  delayRiskLeadTimeDays: 10,
};
