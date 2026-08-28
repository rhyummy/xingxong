import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchParts, runPipeline } from '../api.js';
import { money, unitMoney } from '../money.js';
import {
  Panel, StatusBadge, ErrorBar, Empty, Skeleton, Disclose, partName, shortName,
} from '../components/ui.jsx';
import AgentPipeline from '../components/AgentPipeline.jsx';
import AgentResultCard from '../components/AgentResultCard.jsx';
import AIAdvisorPanel from '../components/AIAdvisorPanel.jsx';
import Reveal from '../components/Reveal.jsx';
import AnimatedList from '../components/AnimatedList.jsx';
import AnimatedBadge from '../components/AnimatedBadge.jsx';

const FILTERS = [
  { id: 'attention', label: 'Low stock' },
  { id: 'all', label: 'All parts' },
  { id: 'critical', label: 'Critical' },
  { id: 'single', label: 'One supplier' },
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
      <div style={{ fontSize: 12, marginBottom: 4 }}>{shortName(part.name)}</div>
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
          title="Parts Queue"
          sub={`${filtered.length} shown`}
          bodyClass="tight"
          className="panel-scroll"
        >
          <div className="stack" style={{ gap: 8, padding: 10, borderBottom: '1px solid var(--line)' }}>
            <input
              className="input"
              placeholder="Search parts"
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
            <div className="parthead">
              <div>
                <div className="row" style={{ gap: 8 }}>
                  <h1 className="mono">{selected.id}</h1>
                  {selected.triggerReady && <AnimatedBadge text="low stock" tone="warn" />}
                  {selected.supplierCount === 1 && <AnimatedBadge text="1 supplier" tone="crit" />}
                </div>
                <div className="dim" style={{ marginTop: 2 }}>
                  {partName(selected.name)} · {selected.currentStock} of {selected.reorderThreshold} in stock
                  {' '}· {selected.supplierCount} supplier{selected.supplierCount === 1 ? '' : 's'}
                </div>
              </div>
              <div className="row">
                <button className="btn" onClick={() => navigate(`/app/parts/${selected.id}`)}>Details</button>
                <button className="btn primary" onClick={run} disabled={running}>
                  {running ? 'Working…' : 'Run Analysis'}
                </button>
              </div>
            </div>
          )}

          {running && (
            <Panel title="Working">
              <AgentPipeline
                steps={result ? result.steps.slice(0, visible) : []}
                running={running || (result && visible < result.steps.length)}
                advisor={allShown ? result?.advisor : null}
                advisorPending={allShown && !result?.advisor && decision?.status === 'escalated'}
              />
            </Panel>
          )}

          {result && (
            <AnimatedList>
              {result.steps.slice(0, visible).map((step) => (
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
              {allShown && result.advisor && (
                <AIAdvisorPanel key="advisor" advisor={result.advisor} />
              )}
            </AnimatedList>
          )}

          {allShown && (
            <Reveal><Panel title="Result" right={<StatusBadge status={result.summary.finalStatus} />}>
              <div className="stack">
                <div className="facts">
                  <div className="fact"><div className="k">Order Value</div><div className="v">{money(result.summary.orderValue)}</div></div>
                  <div className="fact"><div className="k">Time Taken</div><div className="v">{result.summary.decisionSeconds}s</div></div>
                  <div className="fact">
                    <div className="k">Vs List Price</div>
                    <div className="v">
                      {result.summary.costComparison.premiumPct != null
                        ? `${result.summary.costComparison.premiumPct > 0 ? '+' : ''}${result.summary.costComparison.premiumPct}%`
                        : 'n/a'}
                    </div>
                  </div>
                </div>

                <p className="reason">{result.summary.executiveSummary}</p>

                <div className="row">
                  {result.summary.finalStatus === 'escalated' && (
                    <button className="btn primary" onClick={() => navigate(`/app/approve/${result.runId ?? ''}`)}>
                      Send for Approval
                    </button>
                  )}
                  <button className="btn" onClick={() => navigate(`/app/parts/${result.part.id}`)}>Details</button>
                  <button className="btn" onClick={run} disabled={running}>Run Again</button>
                </div>

                <Disclose label="How these numbers are worked out">
                  <p className="note">
                    Time taken is measured. {result.summary.cycleTime.manualBenchmarkNote}
                    {' '}Price is compared against the catalog list price.
                  </p>
                </Disclose>
              </div>
            </Panel></Reveal>
          )}

          {!running && !result && selected && (
            <Panel>
              <Empty>
                Hit Run Analysis to see the four agents work through this part.
              </Empty>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
