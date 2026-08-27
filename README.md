# SupplyChain Sentinel

Autonomous spare-parts supply chain orchestration agent. Four chained agents take an inventory
signal from prediction through supplier selection to a purchase order or a human escalation —
with the full reasoning trail visible at every step.

## Quick start

```bash
npm install
npm run dev
```

- API: http://localhost:4000
- Dashboard: http://localhost:5173

Runs fully offline with mock data. Copy `server/.env.example` to `server/.env` and set
`GROQ_API_KEY` to have an LLM write the executive summary; without it the pipeline falls back
to a deterministic template.

## The pipeline

| Agent | What it does |
|---|---|
| 1. Demand Prediction | Compares recent usage to a rolling baseline; z-score flags spikes as possible equipment failure rather than routine wear. Outputs predicted quantity and days-until-stockout. |
| 2. Supplier Evaluation | Weighted ranking — reliability 40%, defect rate 25%, price 20%, lead time 15%. Flags single-source dependency. |
| 3. Procurement Decision | Applies guardrails (cost ceiling, supplier score floor, anomaly block, single-source block). All pass → auto-generates a PO. Any fail → escalates with the top-2 ranked options and the reasons. |
| 4. Logistics Coordination | Checks lead time against the stockout runway; on delay risk, auto-sources a backup supplier or recommends an inventory reroute. |

Guardrail thresholds live in [server/src/lib/guardrails.js](server/src/lib/guardrails.js).

## API

| Endpoint | Purpose |
|---|---|
| `GET /api/parts` | Parts catalog with `triggerReady` flag |
| `POST /api/pipeline/run` | Full 4-agent chain. Body: `{ "partId": "P-1001" }` |
| `POST /api/agents/:name` | Run one agent in isolation. Names: `demand-prediction`, `supplier-evaluation`, `procurement-decision`, `logistics-coordination` |

```bash
curl -X POST http://localhost:4000/api/pipeline/run \
  -H 'Content-Type: application/json' \
  -d '{"partId":"P-1001"}'
```

## Demo script

The mock dataset is built so each part exercises a different path:

| Part | Path it demonstrates |
|---|---|
| `P-1002` Drive Belt | **Clean auto-approval** — routine demand, strong supplier, under cost ceiling |
| `P-1001` Hydraulic Seal Kit | **Anomaly escalation** — recent usage spike suggests equipment failure |
| `P-1003` Servo Bearing | **Single-source risk** — one supplier, long lead time → inventory reroute |
| `P-1005` PLC Relay | **Cost-ceiling escalation** — high-value order held for human approval |

Run `P-1002` first to show the happy path, then `P-1001` to show the agent declining to act
unilaterally and handing a human ranked options with reasoning.

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
