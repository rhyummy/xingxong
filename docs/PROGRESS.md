# SupplyChain Sentinel — Progress Summary

**Track:** Autonomous Spare Parts Supply Chain Orchestration Agent · AgentXcelerate
**Repo:** github.com/rhyummy/xingxong
**Status:** Working prototype, running end-to-end on live data
**Last updated:** 27 Aug 2026

---

## 1. What exists right now

A working system, not a mockup. Five commits, 48 files, ~2,970 lines of code.

| Layer | Built | Status |
|---|---|---|
| Backend API | Node + Express, 8 endpoints | Running on `:4000` |
| Deterministic agents | 4 chained agents + guardrails | All paths verified on real data |
| Agentic layer | Tool-calling Escalation Advisor on a state graph | Verified across 4 escalation types |
| Database | Supabase, 6 tables, RLS enabled | Seeded, 3,600+ rows |
| Dataset | Deterministic synthetic generator | 40 parts, 15 suppliers, 90 days |
| Dashboard | React + Vite, 3 tabs | Running on `:5173` |
| Audit trail UI | History list + full trail replay | Working |
| Approval UI | Pending queue, approve/reject | Working |
| Security | CORS allowlist, zod, rate limits, approval gate | Verified by test |
| Docs | README, build-status page, this file | Current |

**Not yet built:** full authentication (shared secret only), 21st.dev frontend rebuild.

---

## 2. Architecture

```
        React Dashboard (browser, :5173)
                 │  HTTP POST /api/pipeline/run  {partId}
                 ▼
        Express routes (:4000)
          CORS allowlist · zod validation · rate limits
                 │  runPipeline(partId)
                 ▼
   ┌─────── Orchestrator ─────────────────────┐
   │  calls each agent in sequence,            │
   │  accumulating results as it goes          │
   │                                           │
   │   demand     = Agent1(partId)             │
   │   evaluation = Agent2(partId)             │
   │   decision   = Agent3(partId, {demand,    │
   │                        evaluation})       │
   │   logistics  = Agent4(partId, {demand,    │
   │                  evaluation, decision})   │
   └──────┬───────────────────┬────────────────┘
          │                   │
          │                   ├──> Escalation Advisor (agentic,
          │                   │      only when decision = escalated)
          │                   └──> Groq (summary prose only)
          ▼
     Supabase ───────────> in-memory catalog cache
     (audit write)         (read once at startup; agents read this
                            cache, not the DB, on every run)
```

### Two corrections to the assumed architecture

1. **Supabase is not the last step.** It is read *before* the pipeline (catalog loaded at
   startup into memory) and written *after* (audit trail). It sits beside the pipeline, not
   downstream of it.
2. **Agents do not call each other.** There is no `Agent1 → Agent2` link. A central
   orchestrator calls all four.

### How the agents actually connect

[`server/src/orchestrator.js`](../server/src/orchestrator.js) is the entire chaining mechanism:

```js
const demand     = runDemandPrediction(partId);
const evaluation = runSupplierEvaluation(partId);
const decision   = runProcurementDecision(partId, { demand, evaluation });
const logistics  = runLogisticsCoordination(partId, { demand, evaluation, decision });
```

| Question | Answer |
|---|---|
| Does Agent 1 call Agent 2? | No. The orchestrator calls both. |
| Does Agent 2 wait for Agent 1? | Only because the calls are synchronous. Agent 2 does not *use* Agent 1's output — they are independent. Only Agents 3 and 4 consume upstream results. |
| How does data move? | A plain JS object passed as the second argument. No queue, no bus, no shared mutable state. |
| Separate endpoints, functions, or processes? | **Functions**, all in one Node process. Also exposed individually at `POST /api/agents/:name` for isolated demos. |

Each agent can run standalone — if the orchestrator did not pass context, the agent recomputes
its own inputs:

```js
const demand = context.demand ?? runDemandPrediction(partId);
```

---

## 3. The four deterministic agents

### Agent 1 — Demand Prediction
Splits 90 days into an 85-day baseline and a 5-day recent window, then runs a z-test on the mean.

```
z = (recentMean − baselineMean) ÷ (baselineStdDev ÷ √5)
anomaly if z ≥ 3.0

predictedQuantity = ceil(recentMean × 30) − currentStock
daysUntilStockout = floor(currentStock ÷ recentMean)
```

Dividing by the **standard error** (σ/√n) rather than raw σ is what makes detection work —
weekend shutdowns inflate σ enough to hide a genuine 5× spike otherwise.

### Agent 2 — Supplier Evaluation
Weighted sum of four normalised sub-scores, each clamped to [0,1]:

```
score = 100 × ( 0.40 × (reliability ÷ 100)
              + 0.25 × (1 − defectRate ÷ 5)
              + 0.20 × (cheapestPrice ÷ thisPrice)
              + 0.15 × (1 − leadTimeDays ÷ 14) )
```

Scales are **absolute** (5% defect and 14 days are the "unacceptable" anchors), not min–max
against the candidate pool.

### Agent 3 — Procurement Decision
No formula — four boolean gates. Auto-approve only if all pass.

| Guardrail | Fails when |
|---|---|
| `cost-threshold` | `quantity × price > $5,000` |
| `supplier-score-threshold` | `topScore < 72` |
| `demand-anomaly` | Agent 1 set `anomalyDetected` |
| `single-source-risk` | part has exactly one supplier |

### Agent 4 — Logistics Coordination
```
delayRisk      = leadTimeDays > 10
missesStockout = leadTimeDays > daysUntilStockout
```
Neither → `on-track`. Either + backup exists → `backup-sourced`. Either + no backup →
`reroute-inventory`.

---

## 4. The agentic layer

Agents 1–4 are deterministic **on purpose**: nothing that moves money is decided by a language
model, and every guardrail outcome is reproducible and auditable.

On top sits one genuinely agentic component — the **Escalation Advisor**. It runs *only* when
guardrails have already blocked an order, and it cannot overturn them. It investigates and
hands the human buyer a recommendation.

### Tools it chooses between

| Tool | Answers |
|---|---|
| `get_usage_history` | Is the spike sustained, or a blip? |
| `compare_suppliers` | Is there an acceptable cheaper vendor? |
| `check_related_parts` | Are peers on the same production line also spiking? |
| `get_past_decisions` | Has this happened before, and how was it handled? |

`check_related_parts` justifies the whole layer. Given a spike, the agent can ask whether the
failure is isolated or line-wide — a question no fixed guardrail anticipates.

### Verified behaviour — tool choice varies with the situation

| Part | Blocked by | Tool it chose | Recommendation |
|---|---|---|---|
| P-1026 | cost + anomaly | `check_related_parts` | `INVESTIGATE_EQUIPMENT` |
| P-1009 | score + single-source | `check_related_parts` | `INVESTIGATE_EQUIPMENT` |
| P-1036 | supplier score | `compare_suppliers` | `APPROVE_ALTERNATE_SUPPLIER` |
| P-1011 | cost | `compare_suppliers` | `APPROVE_ALTERNATE_SUPPLIER` |

On P-1026 it found the subject running 4.5× baseline while peers moved under 6%, and concluded:

> **INVESTIGATE_EQUIPMENT** — *"This pattern points to a line-specific equipment issue rather
> than a general restocking need."*
> **Risk:** *"Ordering large quantities now may mask an underlying failure, leading to repeated
> stockouts and wasted spend."*

Runtime ≈ 1.6s. Auto-approvals skip it entirely — no LLM call on the fast path.

### Execution model

Runs on a state graph — the same model LangGraph uses (named nodes transforming shared state,
edges routing between them), in ~60 lines rather than adding a Python runtime for three nodes.
See [`server/src/agentic/graph.js`](../server/src/agentic/graph.js).

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

`GET /api/agents/escalation-advisor/graph` returns this topology as JSON.

---

## 5. What the LLM does — and does not do

| Task | Who does it |
|---|---|
| Detect the demand anomaly | Plain JS — z-test |
| Rank suppliers | Plain JS — weighted arithmetic |
| Auto-approve or escalate | Plain JS — four `if` statements |
| Source a backup supplier | Plain JS — two comparisons |
| Each agent's "reasoning" line | Plain JS — template strings |
| **Investigate an escalation and recommend** | **LLM agent with tools** |
| Closing summary paragraph | LLM (falls back to template) |

**The line to repeat:** deterministic where money moves, agentic where judgment helps.

---

## 6. The dashboard

Three tabs, all backed by real endpoints.

### Run pipeline
Part picker across 40 parts flagging the 13 below reorder point. Agent cards reveal one at a
time. On escalation the **Advisor card** appears, showing the recommendation, confidence, and —
in plain language — which tools the agent chose to invoke ("Checked related parts on the line").
Marked *advisory only* so it is never mistaken for the deciding step.

### Decision history
Every logged run with part, decision, order value, guardrails failed and logistics outcome;
anomaly runs flagged. **Replay** expands any past run through the same `AgentStage` and
`AdvisorCard` components a live run uses — no second read model to drift out of sync. The full
trail is fetched on demand via `GET /api/runs/:id` rather than shipping every run's JSONB with
the list.

### Approvals
Pending queue with order detail and approve/reject, wired to the secret-gated PATCH endpoint,
plus a settled-orders table recording who decided what. This closes the human-in-the-loop story.

---

## 7. The dataset

**40 parts · 15 suppliers · 122 part–supplier links · 3,600 usage records · 90 days**

Generated from a fixed seed. No public dataset pairs spare-parts consumption with supplier
pricing, lead times and reliability — that data is commercially sensitive. The generator models:

- **Weekly rhythm** — weekend shifts run at 35% of weekday consumption
- **Failure spikes** — 3 parts jump 3–5× in the final five days
- **Correlated supplier tiers** — one variable drives price, lead time, reliability and defect
  rate together, so cheap vendors really are slower and worse. Without this correlation the
  ranking agent has nothing to weigh.
- **Deliberate risk cases** — 13 parts below reorder point, 5 single-sourced

Composition: Hydraulics 9 · Consumables 9 · Mechanical 8 · Electrical 7 · Pneumatics 7.
Criticality: 24 standard · 13 high · 3 critical.

---

## 8. Database

| Table | Rows | Holds |
|---|---|---|
| `parts` | 40 | stock, reorder point, unit cost, criticality |
| `suppliers` | 15 | region, reliability, defect rate |
| `part_suppliers` | 122 | price and lead time — per *pair*, not per vendor |
| `usage_history` | 3,600 | daily consumption per part |
| `pipeline_runs` | live | audit trail; `steps` JSONB holds all 4 agents' output |
| `purchase_orders` | live | issued / pending-approval / approved / rejected |

**Access pattern:** the catalog is fetched once at startup into module-level variables. Agents
read that cache synchronously — which is why they can be plain sync functions and the pipeline
runs sub-millisecond.

**RLS:** enabled on all six tables with public-read policies. The browser reads with the
publishable key; only the backend, holding the secret key, writes.

---

## 9. API

| Endpoint | Purpose |
|---|---|
| `GET /api/parts` | Catalog with `triggerReady` flag |
| `POST /api/pipeline/run` | Full 4-agent chain |
| `POST /api/agents/:name` | One agent in isolation |
| `POST /api/agents/escalation-advisor` | Tool-calling advisor; 409 if the part auto-approves |
| `GET /api/agents/escalation-advisor/graph` | Advisor node/edge topology |
| `GET /api/runs` | Audit trail list |
| `GET /api/runs/:id` | One run with its full stored trail |
| `GET /api/purchase-orders` | Issued and pending POs |
| `PATCH /api/purchase-orders/:id` | Approve or reject — secret-gated |

---

## 10. Metrics — what is measured vs. assumed

Both original metrics were dishonest and have been replaced.

| Metric | Was | Now |
|---|---|---|
| Time saved | Hardcoded `96 ÷ 2` constant | Measured wall-clock decision time, plus a benchmark-minus-measured estimate carrying its assumption inline. Escalations report `null` — approval still waits on a human, so no end-to-end claim is made. |
| Cost | Compared against the *most expensive* vendor on file, so it read $0 exactly when the agent chose well | Compared against catalog list price from the parts master, set independently of any quote |

**The cost comparison surfaced a real finding.** Comparing against the previous order proved
circular — the deterministic agent picks the same supplier every run, so the delta was always
zero. Against catalog list price, the agent pays **~12% above list** (P-1012: list $211.87 vs
chosen $237.45).

That is not a bug. The ranking weights reliability at 40% against price at 20%, so it
deliberately buys a quality premium. It is reported as a premium, not dressed up as savings.

**Implication for the pitch:** the ROI story is avoided stockouts and human hours, not unit
price. Do not claim procurement savings.

---

## 11. Verified outcomes

Across all 13 low-stock parts: **4 auto-approved, 9 escalated.** All four guardrail types fire.

| Part | Decision | Order value | Guardrails failed | Logistics |
|---|---|---|---|---|
| P-1012 | auto-approved | $4,274 | — | on track |
| P-1023 | auto-approved | $1,539 | — | backup sourced |
| P-1028 | auto-approved | $3,143 | — | backup sourced |
| P-1038 | auto-approved | $1,329 | — | backup sourced |
| P-1002 | escalated | $10,101 | cost | backup sourced |
| P-1009 | escalated | $4,078 | score · single-source | reroute inventory |
| P-1011 | escalated | $26,889 | cost | backup sourced |
| P-1024 | escalated | $6,135 | cost · score | backup sourced |
| P-1026 | escalated | $95,333 | cost · anomaly | backup sourced |
| P-1027 | escalated | $4,655 | score | backup sourced |
| P-1030 | escalated | $18,274 | cost · score | backup sourced |
| P-1031 | escalated | $14,547 | cost · score | backup sourced |
| P-1036 | escalated | $1,024 | score | backup sourced |

**Anomaly detection accuracy:** 3/3 planted spikes caught, 0 false positives across 40 parts.

---

## 12. Security

**SQL injection is structurally unreachable** — the codebase contains no SQL. Every read and
write goes through supabase-js, which builds parameterised PostgREST requests. There is no
string concatenation to inject into. Verified by grep: no `rpc`, no raw queries, no
template-literal SQL.

### Controls, each verified by test

| Control | Test | Result |
|---|---|---|
| zod validation | `partId` = `P-1001'; DROP TABLE parts;--` | 400 at the edge |
| zod validation | `status` = `hacked` | 400, enum listed |
| CORS allowlist | `Origin: https://evil.example` | 403 |
| CORS allowlist | `Origin: http://localhost:5173` | 200 |
| Approval gate | PATCH without header | 401 |
| Approval gate | PATCH with correct secret | approved, actor recorded |
| Rate limits | reads 120/min · pipeline 20/min · writes 10/min | enforced |

Also: RLS on all tables, publishable key for browser reads only, secret key server-side and
gitignored, 100 kB request body cap, terminal error handler so 5xx never leaks internals.

### Remaining gap

The approval gate is a **shared secret, not identity**. It stops an unauthenticated caller
approving spend — the gap that matters here — but does not record *which* user approved. Real
deployment needs Supabase Auth. When `APPROVAL_SECRET` is unset the endpoints run open and the
server warns at startup.

---

## 13. Bugs found and fixed

| Bug | Impact | Fix |
|---|---|---|
| PostgREST 1,000-row cap | Only 1,000 of 3,600 usage records loaded — every baseline silently corrupted | Paged reads with composite ordering |
| Anomaly detector caught nothing | Weekend dips inflated baseline variance, masking 5× spikes | Standard-error z-test instead of raw σ |
| Degenerate supplier scoring | Min–max forced 100-vs-0 whenever a part had two suppliers | Absolute reference scales |
| Silent 5-part fallback | One transient Supabase blip quietly shrank a 40-part demo | 3× retry with backoff before fallback |
| Audit row lost on missing column | Whole run unlogged if a migration was pending | Re-insert without the optional column |
| Circular cost baseline | Comparing to the previous order always gave $0 — same agent, same supplier | Compare to catalog list price |
| CORS rejection returned 500 | A refused origin read as a server fault | Terminal error handler returning 403 |
| Stacked panel padding | `.panel` padding doubled with nested `.panel-pad` | `.panel-flush` modifier |
| Wrong Groq model | `llama-3.3-70b-versatile` not on this account | Switched to `openai/gpt-oss-120b` |
| Truncated LLM summaries | Reasoning model spent the token budget thinking | Raised budget, set `reasoning_effort: low` |
| Rate-limited advisor | Back-to-back demo runs returned empty | 429/5xx retry honouring `Retry-After` |

---

## 14. Known weaknesses

- **The agent pays above catalog list price** (~12%). Defensible as a deliberate reliability
  premium, but do not pitch this system on procurement savings.
- **Approval is a shared secret, not real auth.** No record of which human approved.
- **Dashboard CSS is hand-rolled.** Functional and consistent, but the weakest visible part of
  the build. Structure is now clean enough that restyling is component swaps, not logic rewrites.
- **The manual-procurement benchmark is an assumption**, not a measurement of any real
  organisation. Labelled as such everywhere it appears.

---

## 15. Remaining work

| Priority | Item | Status |
|---|---|---|
| 1 | Agentic layer with tool-calling | **Done** |
| 2 | Audit trail UI | **Done** |
| 3 | Fix fake metrics | **Done** |
| 4 | PO approval UI | **Done** |
| 5 | Basic security hardening | **Done** |
| 6 | 21st.dev frontend rebuild | Blocked on component links |
| 7 | Supabase Auth replacing the shared secret | Optional if time allows |

**Manual step outstanding:** apply
[`supabase/migrations/001_advisor.sql`](../supabase/migrations/001_advisor.sql):

```sql
alter table pipeline_runs add column if not exists advisor jsonb;
```

Verified missing as of this writing. Without it the advisor shows on live runs but is not
persisted, so replayed escalations lack it. Everything else works regardless.

**Open question:** "agent garage" appeared in the judging criteria and is undefined to us —
worth asking the organisers whether it is a deployment target with its own requirements.

---

## 16. Running it

```bash
npm install
npm run dev            # API :4000 + dashboard :5173
```

Supabase setup: apply `supabase/schema.sql`, then `supabase/migrations/*`, then
`npm run seed -w server`.

To exercise the approval gate, start with a secret set:

```bash
APPROVAL_SECRET=demo-secret-123 npm run dev
```

**Demo order:**
1. **P-1038** — clean auto-approval, all guardrails pass
2. **P-1026** — anomaly escalation; advisor calls `check_related_parts` and returns
   `INVESTIGATE_EQUIPMENT`
3. **Approvals tab** — approve the escalated PO, showing human-in-the-loop
4. **Decision history** — replay the P-1026 trail to show nothing is a black box

---

## 17. Commits

| SHA | Description |
|---|---|
| `9aec321` | Initial MVP — 4 agents, guardrails, Supabase, dataset generator, dashboard |
| `03d076d` | Agentic Escalation Advisor with tool-calling, state graph, reliability fixes |
| `7be6414` | Progress summary doc |
| `6bb54cc` | Honest metrics; CORS allowlist, zod, rate limits, approval gate |
| `6850fdd` | Audit trail, advisor card, and PO approval surfaced in the UI |

---

## Security note

Both Supabase keys and the Groq key were pasted into a chat transcript during development.
**Rotate them after the hackathon.** `server/.env` is gitignored and verified absent from every
commit — no keys were pushed.
