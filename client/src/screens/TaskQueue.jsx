import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchParts, runPipeline } from '../api.js';
import { money, unitMoney } from '../money.js';
import { Panel, StatusBadge, ErrorBar, Empty, Skeleton } from '../components/ui.jsx';
import AgentPipeline from '../components/AgentPipeline.jsx';
import AgentResultCard from '../components/AgentResultCard.jsx';
import AIAdvisorPanel from '../components/AIAdvisorPanel.jsx';
import Reveal from '../components/Reveal.jsx';

const FILTERS = [
  { id: 'attention', label: 'Needs attention' },
  { id: 'all', label: 'All parts' },
  { id: 'critical', label: 'Critical' },
  { id: 'single', label: 'Single-sourced' },
];

/** Urgency band, derived from how far below the reorder point a part sits. */
function urgency(part) {
  if (!part.triggerReady) return { band: 'Healthy', tone: 'ok', rank: 3 };
  const depth = part.currentStock / Math.max(1, part.reorderThreshold);
  if (depth <= 0.35) return { band: 'Critical', tone: 'crit', rank: 0 };
  if (depth <= 0.7) return { band: 'High', tone: 'warn', rank: 1 };
  return { band: 'Elevated', tone: 'warn', rank: 2 };
}

function QueueItem({ part, selected, onSelect }) {
  const u = urgency(part);
  const pct = Math.min(100, (part.currentStock / Math.max(1, part.reorderThreshold)) * 100);

  return (
    <button
      className={`qitem ${selected ? 'on' : ''} sev-${u.tone}`}
      onClick={() => onSelect(part.id)}
      type="button"
    >
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 3 }}>
        <span className="mono" style={{ fontSize: 12 }}>{part.id}</span>
        <StatusBadge label={u.band} tone={u.tone} />
      </div>
      <div style={{ fontSize: 12, marginBottom: 4 }}>{part.name}</div>
      <div className="meter" style={{ marginBottom: 4 }}>
        <i className={u.tone} style={{ width: `${pct}%` }} />
      </div>
      <div className="row dim3" style={{ fontSize: 11, justifyContent: 'space-between' }}>
        <span>stock {part.currentStock} / {part.reorderThreshold}</span>
        <span>{part.supplierCount} supplier{part.supplierCount === 1 ? '' : 's'}</span>
      </div>
    </button>
  );
}

export default function TaskQueue() {
  const navigate = useNavigate();
  const [parts, setParts] = useState([]);
  const [filter, setFilter] = useState('attention');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  const [result, setResult] = useState(null);
  const [visible, setVisible] = useState(0);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchParts()
      .then((data) => {
        setParts(data);
        setSelectedId((cur) => cur ?? data.find((p) => p.triggerReady)?.id ?? data[0]?.id ?? null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Stage the reveal so the pipeline reads as sequential work, not a dump.
  useEffect(() => {
    if (!result || visible >= result.steps.length) return;
    const t = setTimeout(() => setVisible((n) => n + 1), 650);
    return () => clearTimeout(t);
  }, [result, visible]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return parts
      .filter((p) => {
        if (filter === 'attention' && !p.triggerReady) return false;
        if (filter === 'critical' && p.criticality !== 'critical') return false;
        if (filter === 'single' && p.supplierCount !== 1) return false;
        if (q && !(`${p.id} ${p.name} ${p.category}`.toLowerCase().includes(q))) return false;
        return true;
      })
      .sort((a, b) => urgency(a).rank - urgency(b).rank);
  }, [parts, filter, query]);

  const selected = parts.find((p) => p.id === selectedId);

  async function run() {
    if (!selectedId) return;
    setRunning(true);
    setError(null);
    setResult(null);
    setVisible(0);
    try {
      setResult(await runPipeline(selectedId));
    } catch (e) {
      setError(e.message);
    } finally {
      setRunning(false);
    }
  }

  // Reset the trail when the operator picks a different part.
  useEffect(() => { setResult(null); setVisible(0); }, [selectedId]);

  const decision = result?.steps?.[2];
  const allShown = result && visible >= result.steps.length;

  return (
    <div className="stack">
      <ErrorBar message={error} />

      <div className="l-queue">
        {/* --------------------------------------------------- queue */}
        <Panel
          title="Procurement queue"
          sub={`${filtered.length} shown`}
          bodyClass="tight"
          className="panel-scroll"
        >
          <div className="stack" style={{ gap: 8, padding: 10, borderBottom: '1px solid var(--line)' }}>
            <input
              className="input"
              placeholder="Search part, ID or category…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="seg">
              {FILTERS.map((f) => (
                <button key={f.id} className={filter === f.id ? 'on' : ''} onClick={() => setFilter(f.id)}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <Skeleton rows={7} />
          ) : filtered.length === 0 ? (
            <Empty>No parts match this filter.</Empty>
          ) : (
            <div style={{ maxHeight: 'calc(100vh - 230px)', overflowY: 'auto' }}>
              {filtered.map((p) => (
                <QueueItem key={p.id} part={p} selected={p.id === selectedId} onSelect={setSelectedId} />
              ))}
            </div>
          )}
        </Panel>

        {/* -------------------------------------------------- detail */}
        <div className="stack">
          {selected && (
            <Panel bodyClass="tight">
              <div className="panel-body stack">
                <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <div className="row" style={{ gap: 8 }}>
                      <h1 className="mono">{selected.id}</h1>
                      <StatusBadge label={selected.criticality} tone={selected.criticality === 'critical' ? 'crit' : selected.criticality === 'high' ? 'warn' : 'idle'} />
                      {selected.triggerReady && <StatusBadge label="below reorder" tone="warn" />}
                      {selected.supplierCount === 1 && <StatusBadge label="single source" tone="crit" />}
                    </div>
                    <div className="dim" style={{ fontSize: 13, marginTop: 2 }}>{selected.name}</div>
                  </div>
                  <div className="row">
                    <button className="btn sm" onClick={() => navigate(`/parts/${selected.id}`)}>
                      Part intelligence
                    </button>
                    <button className="btn primary" onClick={run} disabled={running}>
                      {running ? 'Analysing…' : 'Run analysis'}
                    </button>
                  </div>
                </div>

                <div className="facts">
                  <div className="fact"><div className="k">Category</div><div className="v" style={{ fontSize: 12 }}>{selected.category}</div></div>
                  <div className="fact"><div className="k">On hand</div><div className="v">{selected.currentStock}</div></div>
                  <div className="fact"><div className="k">Reorder at</div><div className="v">{selected.reorderThreshold}</div></div>
                  <div className="fact"><div className="k">List price</div><div className="v" style={{ fontSize: 12 }}>{unitMoney(selected.unitCost)}</div></div>
                  <div className="fact"><div className="k">Suppliers</div><div className="v">{selected.supplierCount}</div></div>
                </div>
              </div>
            </Panel>
          )}

          {(running || result) && (
            <Panel title="Pipeline" sub={running ? 'Analysing procurement request…' : 'Completed'}>
              <AgentPipeline
                steps={result ? result.steps.slice(0, visible) : []}
                running={running || (result && visible < result.steps.length)}
                advisor={allShown ? result?.advisor : null}
                advisorPending={allShown && !result?.advisor && decision?.status === 'escalated'}
              />
            </Panel>
          )}

          {result?.steps.slice(0, visible).map((step) => (
            <AgentResultCard
              key={step.agent}
              step={step}
              guardrailExplanations={{
                'cost-threshold': `Order value ${money(decision?.totalCost)} exceeds the auto-approval ceiling`,
                'demand-anomaly': 'Usage spike could signal equipment failure rather than routine wear',
                'single-source-risk': 'No fallback supplier exists if this order slips',
                'supplier-score-threshold': 'Top supplier scores below the required minimum',
              }}
            />
          ))}

          {allShown && result.advisor && <AIAdvisorPanel advisor={result.advisor} />}

          {allShown && (
            <Reveal><Panel title="Outcome" right={<StatusBadge status={result.summary.finalStatus} />}>
              <div className="stack">
                <div className="facts">
                  <div className="fact"><div className="k">Order value</div><div className="v">{money(result.summary.orderValue)}</div></div>
                  <div className="fact"><div className="k">Decision time</div><div className="v">{result.summary.decisionSeconds}s</div></div>
                  <div className="fact">
                    <div className="k">Est. hours saved</div>
                    <div className="v">{result.summary.cycleTime.estimatedHoursSaved ?? 'not claimed'}</div>
                  </div>
                  <div className="fact">
                    <div className="k">Vs. list price</div>
                    <div className="v">
                      {result.summary.costComparison.premiumPct != null
                        ? `${result.summary.costComparison.premiumPct > 0 ? '+' : ''}${result.summary.costComparison.premiumPct}%`
                        : '—'}
                    </div>
                  </div>
                </div>

                <p className="note">{result.summary.cycleTime.manualBenchmarkNote}</p>
                <p className="reason">{result.summary.executiveSummary}</p>

                <div className="row">
                  {result.summary.finalStatus === 'escalated' && (
                    <button className="btn primary" onClick={() => navigate(`/approve/${result.runId ?? ''}`)}>
                      Review for approval
                    </button>
                  )}
                  <button className="btn" onClick={() => navigate(`/parts/${result.part.id}`)}>
                    Open part intelligence
                  </button>
                  <button className="btn" onClick={run} disabled={running}>Re-run analysis</button>
                </div>
              </div>
            </Panel></Reveal>
          )}

          {!running && !result && selected && (
            <Panel>
              <Empty>
                Select <span className="mono">{selected.id}</span> and run the analysis to see all four
                agents work through the decision.
              </Empty>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
