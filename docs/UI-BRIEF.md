# 21st.dev Prompt — SupplyChain Sentinel Dashboard

Copy the block below into 21st.dev. Everything after it is reference material for wiring the
generated components back in.

---

## The prompt

> A **procurement operations console** for an autonomous spare-parts supply chain agent, for
> Indian industrial buyers. React + Tailwind, dark-first.
>
> **Design direction.** Industrial operations software, not a SaaS landing page. Avoid gradient
> heroes, glassmorphism, oversized rounded cards, centered text, emoji icons, pastels.
> References: Bloomberg Terminal, Linear, Vercel dashboard — dense, precise, information-first.
> Small radii, hairline borders, tight vertical rhythm. Numbers use `tabular-nums`, right-aligned. Semantic colour (success/warning/critical) is separate from the
> accent. Encode state in form too — a left severity stripe, a pill — so status reads without
> relying on hue.
>
> Currency is Indian rupees, Indian grouping: `₹78,66,144`, never `₹7,866,144`.
>
> **Tab 1 — Run pipeline.** Grid of ~40 part cards: ID, name, stock vs. reorder threshold, unit
> cost, supplier count, criticality. Flag parts below reorder point. One selectable; a primary
> button runs the pipeline.
>
> Four numbered **agent cards** then reveal in sequence: name, status pill, metrics row,
> reasoning paragraph. Agent 2 adds a ranked supplier table, selected row highlighted. Agent 3,
> when escalating, lists two alternatives.
>
> Then an **AI Advisor card** that reads as a different *kind* of thing from the four above
> (different accent, marked "advisory only"): verdict, confidence, a bulleted list of which tools
> it chose to call, reasoning, highlighted risk line.
>
> Then an **outcome panel**: stat tiles (status, order value, decision time, hours saved), a
> list-price vs. chosen-price comparison with percentage premium, summary paragraph. Assumed
> figures need footnotes separating them from measured ones.
>
> **Tab 2 — History.** Dense audit table: timestamp, part, decision pill, order value, guardrails
> failed, logistics outcome, Replay action. Expanding a row reuses tab 1's agent cards.
>
> **Tab 3 — Approvals.** PO cards: number, part, supplier, qty × unit price, total, with Reject
> and Approve buttons. Below, a settled-orders table.
>
> Include empty, loading, error and busy states. Tables scroll in their own container.

---

## Reference: real data shapes

Give these to 21st.dev if it asks for sample data, or use them to wire the generated components.

### Part card

```json
{
  "id": "P-1026",
  "name": "Gearbox Coupling — Line C",
  "category": "Mechanical",
  "currentStock": 9,
  "reorderThreshold": 26,
  "unitCost": 22361.86,
  "criticality": "high",
  "supplierCount": 4,
  "triggerReady": true
}
```

### Agent 1 — Demand Prediction

```json
{
  "agent": "Demand Prediction",
  "baselineDailyRate": 2.29,
  "recentDailyRate": 10.4,
  "zScore": 17.65,
  "anomalyDetected": true,
  "daysUntilStockout": 0,
  "predictedQuantity": 303,
  "reasoning": "Recent 5-day usage averages 10.4/day against a 2.3/day baseline (z=17.6)…"
}
```

### Agent 2 — Supplier Evaluation

```json
{
  "agent": "Supplier Evaluation",
  "singleSourceRisk": false,
  "recommended": { "id": "S-008" },
  "ranked": [
    { "id": "S-008", "name": "Precision Parts Group", "region": "Chennai, IN",
      "score": 79.1, "price": 25960.87, "leadTimeDays": 6,
      "reliabilityScore": 91, "defectRatePct": 1.2 }
  ],
  "reasoning": "Ranked 4 suppliers on reliability (40%), defect rate (25%)…"
}
```

### Agent 3 — Procurement Decision

```json
{
  "agent": "Procurement Decision",
  "status": "escalated",
  "quantity": 303,
  "totalCost": 7866144,
  "poNumber": null,
  "failedGuardrails": ["cost-threshold", "demand-anomaly"],
  "alternatives": [
    { "supplier": "Precision Parts Group", "supplierId": "S-008", "score": 79.1,
      "unitPrice": 25960.87, "leadTimeDays": 6, "totalCost": 7866144 }
  ],
  "reasoning": "Held for human approval. 2 guardrails failed…"
}
```

Status is `auto-approved` or `escalated`. Guardrail codes: `cost-threshold`,
`supplier-score-threshold`, `demand-anomaly`, `single-source-risk`, `no-supplier-available`.

### Agent 4 — Logistics Coordination

```json
{
  "agent": "Logistics Coordination",
  "status": "backup-sourced",
  "chosenSupplier": "Precision Parts Group",
  "leadTimeDays": 6,
  "daysUntilStockout": 0,
  "delayRisk": true,
  "backupSupplier": { "name": "Anvil Components", "leadTimeDays": 7, "score": 74.7 },
  "reasoning": "…misses the 0-day stockout window. Auto-sourcing Anvil Components…"
}
```

Status is `on-track`, `backup-sourced`, `reroute-inventory`, or `blocked`.

### AI Advisor (only present on escalations)

```json
{
  "agent": "Escalation Advisor",
  "model": "openai/gpt-oss-120b",
  "advisory": true,
  "ms": 1615,
  "recommendation": {
    "action": "INVESTIGATE_EQUIPMENT",
    "supplier": "n/a",
    "confidence": "high",
    "why": "The gearbox coupling shows a 4.5× demand spike while related parts on the same line have only modest increases (≤6%)…",
    "risk": "Ordering large quantities now may mask an underlying failure…"
  },
  "toolsInvoked": [{ "tool": "check_related_parts" }],
  "graphTrace": [{ "node": "investigate" }, { "node": "act" }, { "node": "recommend" }]
}
```

Actions: `APPROVE_AS_PROPOSED`, `APPROVE_ALTERNATE_SUPPLIER`, `SPLIT_ORDER`, `REDUCE_QUANTITY`,
`INVESTIGATE_EQUIPMENT`, `REJECT`. Tools: `get_usage_history`, `compare_suppliers`,
`check_related_parts`, `get_past_decisions`.

### Outcome summary

```json
{
  "finalStatus": "escalated",
  "orderValue": 7866144,
  "decisionSeconds": 2.76,
  "cycleTime": {
    "manualBenchmarkHours": 96,
    "manualBenchmarkNote": "Assumption: 4 working days, midpoint of the 3-5 day industry range…",
    "estimatedHoursSaved": null,
    "escalationNote": "Escalated — sourcing and analysis were automated, but approval still requires a human…"
  },
  "costComparison": {
    "basis": "catalog-list-price",
    "listUnitPrice": 22361.86,
    "chosenUnitPrice": 25960.87,
    "premiumPerUnit": 3599.01,
    "premiumOnThisOrder": 1090499,
    "premiumPct": 16.1,
    "interpretation": "Above list — reliability and lead time were weighted over unit price."
  },
  "executiveSummary": "Gearbox Coupling — Line C hit its reorder point with 0 days of stock left…"
}
```

`estimatedHoursSaved` is `null` on escalations — the UI must render that as "not claimed"
rather than as zero.

### Purchase order

```json
{
  "id": "PO-1038-002",
  "part_id": "P-1038",
  "supplier_id": "S-002",
  "quantity": 22,
  "unit_price": 5033.95,
  "total_cost": 110747,
  "status": "pending-approval",
  "approved_by": null,
  "created_at": "2026-08-27T11:42:00Z"
}
```

Status: `issued`, `pending-approval`, `approved`, `rejected`.

### History row

```json
{
  "id": "a994891a-…",
  "part_id": "P-1026",
  "status": "escalated",
  "order_value": 7866144,
  "anomaly_detected": true,
  "failed_guardrails": ["cost-threshold", "demand-anomaly"],
  "logistics_status": "backup-sourced",
  "created_at": "2026-08-27T12:10:00Z"
}
```

---

## Wiring notes

The existing app already has working data plumbing — replace the presentation, keep the logic.

| Concern | Where it lives |
|---|---|
| API calls | [`client/src/api.js`](../client/src/api.js) — already handles errors and the approval header |
| Currency formatting | [`client/src/money.js`](../client/src/money.js) — use `money()` and `unitMoney()`, do not reimplement |
| Tab state, staged reveal | [`client/src/App.jsx`](../client/src/App.jsx) |
| Components to replace | `client/src/components/*.jsx` |

Endpoints the UI consumes: `GET /api/parts`, `POST /api/pipeline/run`, `GET /api/runs`,
`GET /api/runs/:id`, `GET /api/purchase-orders`, `PATCH /api/purchase-orders/:id`.

Tailwind is not currently installed — if the generated components need it, add
`tailwindcss postcss autoprefixer` as client dev dependencies and delete
`client/src/styles.css` once nothing imports it.
