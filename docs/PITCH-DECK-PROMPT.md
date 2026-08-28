# Pitch Deck Prompt

Paste the block below into Gamma, Claude, ChatGPT, Beautiful.ai or any deck
generator. Everything in it is verified against the running system on
27 Aug 2026. Numbers are real, not aspirational.

---

## The prompt

> Build a **14-slide pitch deck** for a hackathon demo. Audience: technical judges
> who will ask hard questions. Tone: confident, specific, no marketing fluff. Every
> claim must be backed by a number.
>
> **Design:** dark industrial operations console. Near-black background (#0a0c0e),
> charcoal panels (#101315), hairline borders. Teal accent (#4db8c4) for emphasis,
> violet (#a78bfa) reserved for anything AI-related. Status colours: green #2dd4a7
> good, amber #e0a63c warning, red #e5564e critical. Space Grotesk headings, Inter
> body, JetBrains Mono for all numbers. Dense and precise, like Bloomberg Terminal
> or Linear. No gradients, no glassmorphism, no stock photos, no emoji, no
> centered hero text. Charts over bullet lists wherever possible.
>
> ---
>
> **SLIDE 1 — Title**
> SupplyChain Sentinel. Autonomous spare-parts procurement for factories.
> Subtitle: "Deterministic where money moves. Agentic where judgment helps."
> AgentXcelerate Hackathon.
>
> **SLIDE 2 — The problem**
> Factory spare-parts procurement is manual and reactive. A routine reorder takes
> 3 to 5 working days. Teams order after shortages appear, not before. Skilled
> buyers spend their time comparing suppliers instead of negotiating. Result:
> production stops, and the process cannot scale without adding headcount.
>
> **SLIDE 3 — What we built**
> Four autonomous agents that take a part from low-stock signal to purchase order.
> Safe orders issue automatically. Risky ones stop for a human, with reasons
> attached. An AI advisor investigates the ones that stop. Every decision is logged
> and replayable. Show the pipeline as a horizontal flow diagram.
>
> **SLIDE 4 — Architecture**
> Diagram, and correct the two things people assume wrong:
> React dashboard → Express API → Orchestrator → four agents in sequence.
> Supabase sits BESIDE the pipeline, not after it: the catalog is read once at
> startup into memory, and only the audit row is written at the end.
> Agents do NOT call each other. A central orchestrator calls all four and passes
> accumulated results forward as a plain object. Four synchronous function calls,
> one process, no queue or message bus.
>
> **SLIDE 5 — Agent 1, Demand Prediction**
> Splits 90 days into an 85-day baseline and a 5-day recent window, then runs a
> z-test on the mean: z = (recentMean − baselineMean) ÷ (stdDev ÷ √5). Anomaly at
> z ≥ 3.0. Outputs order quantity and days until stockout.
> Key insight worth its own callout: dividing by standard error rather than raw
> standard deviation is what makes detection work. Weekend shutdowns inflate σ
> enough to hide a genuine 5× spike. Our first version caught zero anomalies.
> Accuracy: 3 of 3 planted spikes caught, 0 false positives across 40 parts.
>
> **SLIDE 6 — Agent 2, Supplier Evaluation**
> Weighted score out of 100: reliability 40%, defect rate 25%, price 20%, lead time
> 15%. Absolute reference scales, not min-max against the candidate pool.
> Flags single-source dependency. Show a ranked supplier table with score bars.
>
> **SLIDE 7 — Agent 3, Procurement Decision**
> No formula, four boolean gates. All must pass to auto-approve:
> cost under ₹4,00,000 · supplier score at least 72 · no demand anomaly · a backup
> supplier exists.
> Show all four as a pass/fail checklist, not just the failures. This is the
> transparency story.
>
> **SLIDE 8 — Agent 4, Logistics**
> Compares supplier lead time against the stockout runway. Delay risk over 10 days,
> or arrival after stockout, triggers self-healing: auto-source a backup supplier,
> or recommend rerouting inventory from another site when no backup exists.
>
> **SLIDE 9 — The AI layer (the differentiator)**
> Make this slide visually distinct, violet.
> The four agents above are deterministic on purpose. No language model touches a
> spend decision. On top sits one genuinely agentic component: the Escalation
> Advisor. It runs ONLY when guardrails have already blocked an order, and it
> cannot overturn them.
> It is a tool-calling agent on a state graph (investigate → act → recommend) with
> four tools it chooses between: usage history, supplier comparison, related parts
> on the same production line, and past decisions.
> Show that tool choice varies by situation:
> - P-1026 (cost + anomaly) → chose "related parts" → INVESTIGATE_EQUIPMENT
> - P-1009 (score + single source) → chose "related parts" → INVESTIGATE_EQUIPMENT
> - P-1036 (supplier score) → chose "supplier comparison" → SWITCH SUPPLIER
> Runs in about 1.6 seconds. Auto-approvals skip it entirely, no API call.
>
> **SLIDE 10 — The moment that sells it**
> One quote, large, on its own slide. Real output from the system on part P-1026:
> "The gearbox coupling shows a 4.5× demand spike while related parts on the same
> line have only modest increases (≤6%). This points to a line-specific equipment
> issue rather than a general restocking need."
> Recommendation: INVESTIGATE EQUIPMENT. Risk: "Ordering large quantities now may
> mask an underlying failure, leading to repeated stockouts and wasted spend."
> The point: it did not recommend buying 303 units for ₹78,66,144. It said the
> machine is broken. No fixed rule reaches that conclusion.
>
> **SLIDE 11 — Results**
> Across 13 low-stock parts: 4 auto-approved, 9 escalated. All four guardrail types
> fired on real data. Show as a donut plus a bar chart of which guardrail stopped
> the most orders (cost 6, supplier score 6, single source 1, anomaly 1).
> Anomaly detection: 3/3 caught, 0 false positives.
> Pipeline runtime: about 1.2 seconds deterministic, 2.8 seconds with the advisor.
>
> **SLIDE 12 — Honest metrics**
> A credibility slide. State plainly what is measured and what is assumed.
> Measured: decision time (seconds, wall clock), anomaly accuracy, guardrail hits.
> Assumed: the 4-day manual benchmark, labelled as an industry midpoint, not
> measured at any real plant.
> Not claimed: procurement savings. The agent actually pays 12 to 16% ABOVE catalog
> list price, because reliability is weighted at 40% against price at 20%. That is
> a deliberate quality premium, reported as one. The ROI is avoided stockouts and
> avoided human hours.
>
> **SLIDE 13 — Engineering rigour**
> Security: the codebase contains no SQL, so injection is structurally unreachable
> rather than defended against. CORS allowlist returns 403. zod rejects malformed
> input at the edge. Rate limits: 120/min reads, 20/min LLM-spending runs, 10/min
> writes. Shared secret on the only endpoint that commits money.
> Reliability: Supabase retries 3× before falling back to a local catalog. Groq
> failure falls back to a template summary. An advisor failure never blocks a
> decision. The demo cannot hard-fail on a network hiccup.
> Also mention: 11 real bugs found and fixed during the build, including a
> PostgREST 1000-row cap that was silently truncating 2,600 of 3,600 usage records
> and corrupting every baseline.
>
> **SLIDE 14 — Stack, scope and what is next**
> Stack: React + Vite, Node + Express, Supabase (Postgres + RLS), Groq for the
> agentic layer. 60 files, ~4,700 lines, 12 commits.
> Dataset: 40 parts, 15 suppliers, 3,600 usage records over 90 days, generated from
> a fixed seed and modelled on Indian industrial MRO patterns. Synthetic because no
> public dataset pairs parts consumption with supplier pricing and reliability.
> Next: real ERP connectors, Supabase Auth replacing the demo sign-in, multi-site
> inventory, supplier API integration.

---

## Reference data for the deck

Give these to the generator if it asks for specifics, or use them to fact-check
whatever it produces.

### Verified outcomes, all 13 low-stock parts

| Part | Decision | Order value | Stopped by | Logistics |
|---|---|---|---|---|
| P-1012 | auto-approved | ₹3,58,867 | none | on track |
| P-1023 | auto-approved | ₹1,28,342 | none | backup sourced |
| P-1028 | auto-approved | ₹2,59,596 | none | backup sourced |
| P-1038 | auto-approved | ₹1,10,747 | none | backup sourced |
| P-1002 | escalated | ₹8,19,729 | cost | backup sourced |
| P-1009 | escalated | ₹3,30,229 | score, single source | reroute inventory |
| P-1011 | escalated | ₹22,53,070 | cost | backup sourced |
| P-1024 | escalated | ₹5,07,263 | cost, score | backup sourced |
| P-1026 | escalated | ₹78,66,144 | cost, anomaly | backup sourced |
| P-1027 | escalated | ₹3,84,701 | score | backup sourced |
| P-1030 | escalated | ₹15,08,227 | cost, score | backup sourced |
| P-1031 | escalated | ₹12,00,698 | cost, score | backup sourced |
| P-1036 | escalated | ₹85,310 | score | backup sourced |

### Fleet snapshot
40 parts · 16 at risk within 7 days · 13 below reorder · 5 single-sourced ·
3 demand spikes · 15 suppliers · 122 part-supplier links · 3,600 usage records

### Dataset composition
Hydraulics 9 · Consumables 9 · Mechanical 8 · Electrical 7 · Pneumatics 7
Criticality: 24 standard · 13 high · 3 critical

### The generator models
Weekend shifts at 35% of weekday consumption. Three parts spike 3 to 5× in the
final five days. Supplier attributes correlate through a single tier variable, so
cheap vendors really are slower and lower quality. Without that correlation the
ranking agent has nothing to weigh.

### API surface
`GET /api/parts` · `GET /api/parts/-/stats` · `GET /api/parts/:id` ·
`POST /api/pipeline/run` · `POST /api/agents/:name` ·
`POST /api/agents/escalation-advisor` · `GET /api/agents/escalation-advisor/graph` ·
`GET /api/runs` · `GET /api/runs/:id` · `GET /api/purchase-orders` ·
`PATCH /api/purchase-orders/:id`

### Bugs found and fixed
1. PostgREST 1000-row cap truncated usage history, corrupting every baseline
2. Anomaly detector caught nothing until switched to a standard-error z-test
3. Supplier scoring collapsed to 100-vs-0 whenever a part had two suppliers
4. A transient Supabase blip silently shrank a 40-part demo to 5 parts
5. A missing column lost the entire audit row instead of one field
6. Cost baseline was circular: same agent, same supplier, always zero delta
7. Rejected CORS origin returned 500 instead of 403
8. Panel padding stacked and doubled
9. Wrong Groq model for the account
10. Reasoning-model summaries truncated mid-sentence
11. Back-to-back demo runs hit the rate limiter and returned empty

---

## Demo script (5 minutes)

1. **Overview** — 40 parts, 16 at risk. Charts show the automation split and which
   guardrail stops the most orders.
2. **Run Analysis on P-1038** — clean auto-approval. All four checks pass, PO
   issues, no human involved, no LLM call.
3. **Run Analysis on P-1026** — the centrepiece. Watch the four agent cards appear,
   then the AI advisor returning INVESTIGATE EQUIPMENT.
4. **Part details for P-1026** — the line chart with the spike window shaded, and
   Related Parts showing peers flat. This is the evidence the advisor used.
5. **Approvals** — approve one escalated order. Human-in-the-loop, closed.
6. **History** — replay P-1026 end to end. Nothing is a black box.

## Questions to expect

**"Is this just a wrapper on an LLM?"**
No. All four agents are plain arithmetic. The LLM investigates escalations and
writes one summary paragraph. Turn it off and every decision is identical.

**"Why not LangGraph?"**
The advisor runs on a state graph with named nodes, conditional edges and a step
budget. Same execution model, no second runtime for three nodes.
`GET /api/agents/escalation-advisor/graph` returns the live topology.

**"Where did the data come from?"**
Generated from a fixed seed. No public dataset pairs spare-parts consumption with
supplier pricing and reliability, because that data is commercially sensitive.

**"How do you stop SQL injection?"**
There is no SQL in the codebase. Every query goes through a parameterised client.
It is unreachable, not mitigated.

**"Isn't Likwid AI already doing this?"**
Yes, and they are funded. The overlap is real: forecasting, agentic MRP,
procurement autopilot. Our ground is the deterministic/agentic split, the
replayable audit trail, and diagnosing equipment failure rather than reordering
against it.

**"Is it secure?"**
Partly. Injection is unreachable, RLS is on, writes are rate-limited and gated by
a shared secret. Sign-in is a demo shell with no real auth. Full identity would be
Supabase Auth, which we scoped out.
