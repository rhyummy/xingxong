# SupplyChain Sentinel

Autonomous spare-parts supply chain orchestration agent. Four chained agents take an inventory signal from prediction through supplier selection to a purchase order or a human escalation — with the full reasoning trail visible at every step.

---

## Table of Contents

- [Quick Start](#quick-start)
- [The Pipeline](#the-pipeline)
- [The Agentic Layer](#the-agentic-layer)
  - [Tool Selection in Practice](#tool-selection-in-practice)
  - [Execution Model](#execution-model)
- [API](#api)
- [Demo Script](#demo-script)
- [Structure](#structure)

---

## Quick Start

```bash
npm install
npm run dev
```

**Using Supabase?** Apply `supabase/schema.sql`, then any files in `supabase/migrations/`, then:

```bash
npm run seed -w server
```

| Service   | URL                     |
|-----------|-------------------------|
| API       | http://localhost:4000   |
| Dashboard | http://localhost:5173   |

Runs fully offline with mock data. Copy `server/.env.example` to `server/.env` and set `GROQ_API_KEY` to have an LLM write the executive summary — without it, the pipeline falls back to a deterministic template.

---

## The Pipeline

| # | Agent | What it does |
|---|-------|---------------|
| 1 | **Demand Prediction** | Compares recent usage to a rolling baseline; z-score flags spikes as possible equipment failure rather than routine wear. Outputs predicted quantity and days-until-stockout. |
| 2 | **Supplier Evaluation** | Weighted ranking — reliability 40%, defect rate 25%, price 20%, lead time 15%. Flags single-source dependency. |
| 3 | **Procurement Decision** | Applies guardrails (cost ceiling, supplier score floor, anomaly block, single-source block). All pass → auto-generates a PO. Any fail → escalates with the top-2 ranked options and the reasons. |
| 4 | **Logistics Coordination** | Checks lead time against the stockout runway; on delay risk, auto-sources a backup supplier or recommends an inventory reroute. |

Guardrail thresholds live in `server/src/lib/guardrails.js`.

---

## The Agentic Layer

Agents 1–4 are **deterministic on purpose**: nothing that moves money is decided by a language model, and every guardrail outcome is reproducible and auditable.

On top of that sits one genuinely agentic component — the **Escalation Advisor**. It runs only when the guardrails have already blocked an order, and it cannot overturn them. Its job is to investigate and hand the human buyer a recommendation.

It's a tool-calling agent with a real tool budget, and it chooses which tools to use:

| Tool | Answers |
|------|---------|
| `get_usage_history` | Is the spike sustained, or a one-off blip? |
| `compare_suppliers` | Is there an acceptable cheaper vendor? |
| `check_related_parts` | Are peers on the same production line also spiking? |
| `get_past_decisions` | Has this come up before, and how was it handled? |

`check_related_parts` is the one that pays for the whole layer. Given a demand spike, the agent can ask whether the failure is isolated or line-wide — a question no fixed guardrail anticipates. On **P-1026** it found the subject running 4.5× its baseline while peers moved under 6%, and returned `INVESTIGATE_EQUIPMENT` rather than a reorder.

### Tool Selection in Practice

Observed tool selection varies with the situation, which is the point:

| Part | Blocked by | Tool the agent chose | Recommendation |
|------|-----------|----------------------|-----------------|
| P-1026 | cost + anomaly | `check_related_parts` | `INVESTIGATE_EQUIPMENT` |
| P-1009 | supplier score + single source | `check_related_parts` | `INVESTIGATE_EQUIPMENT` |
| P-1036 | supplier score | `compare_suppliers` | `APPROVE_ALTERNATE_SUPPLIER` |
| P-1011 | cost | `compare_suppliers` | `APPROVE_ALTERNATE_SUPPLIER` |

### Execution Model

The advisor runs on a small state graph — the same model LangGraph uses (named nodes that transform shared state, edges that route between them) — implemented in ~60 lines rather than adding a Python runtime for three nodes. See `server/src/agentic/graph.js`.

```
        ┌──────────────┐  model requested tools   ┌─────┐
   ──▶  │ investigate  │ ───────────────────────▶ │ act │
        └──────────────┘                          └─────┘
               │  ▲                                  │
 answered      │  └──────────────────────────────────┘
 directly      │        tool budget remaining
               ▼
        ┌──────────────┐
        │  recommend   │ ──▶ END
        └──────────────┘
```

`GET /api/agents/escalation-advisor/graph` returns this topology as JSON, so the dashboard renders the real graph rather than a drawing of one.

**Degradation behavior:**
- No `GROQ_API_KEY` → the advisor returns `null` and the pipeline behaves exactly as before.
- Rate limits and 5xx errors → retried with backoff.
- An advisor failure never blocks a decision.

---

## API

| Endpoint | Purpose |
|----------|---------|
| `GET /api/parts` | Parts catalog with `triggerReady` flag |
| `POST /api/pipeline/run` | Full 4-agent chain. Body: `{ "partId": "P-1001" }` |
| `POST /api/agents/:name` | Run one agent in isolation. Names: `demand-prediction`, `supplier-evaluation`, `procurement-decision`, `logistics-coordination` |
| `POST /api/agents/escalation-advisor` | Run the tool-calling advisor on an escalated part. Returns `409` if the part auto-approves |
| `GET /api/agents/escalation-advisor/graph` | The advisor's node/edge topology |
| `GET /api/runs` | Audit trail of past pipeline runs |
| `GET /api/purchase-orders` | Issued and pending POs |
| `PATCH /api/purchase-orders/:id` | Approve or reject an escalated PO |

**Example:**

```bash
curl -X POST http://localhost:4000/api/pipeline/run \
  -H 'Content-Type: application/json' \
  -d '{"partId":"P-1001"}'
```

---

## Demo Script

The mock dataset is built so each part exercises a different path:

| Part | Path it demonstrates |
|------|------------------------|
| **P-1002** Drive Belt | Clean auto-approval — routine demand, strong supplier, under cost ceiling |
| **P-1001** Hydraulic Seal Kit | Anomaly escalation — recent usage spike suggests equipment failure |
| **P-1003** Servo Bearing | Single-source risk — one supplier, long lead time → inventory reroute |
| **P-1005** PLC Relay | Cost-ceiling escalation — high-value order held for human approval |

Run **P-1002** first to show the happy path, then **P-1001** to show the agent declining to act unilaterally and handing a human ranked options with reasoning.

---

## Structure

```
server/src/
  agents/       one file per agent, each independently callable
  data/         mock parts, usage history, suppliers
  lib/          guardrail thresholds, optional Claude summary
  routes/       Express endpoints
  orchestrator.js  chains the agents, computes impact metrics
client/src/     React dashboard (Vite)
```
