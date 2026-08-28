import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchRuns, fetchRun } from '../api.js';
import { money } from '../money.js';
import {
  Panel, StatusBadge, ErrorBar, Empty, Skeleton, Disclose, relTime,
} from '../components/ui.jsx';
import AgentResultCard from '../components/AgentResultCard.jsx';
import AIAdvisorPanel from '../components/AIAdvisorPanel.jsx';
import Reveal from '../components/Reveal.jsx';

/**
 * Full replay of a stored run. `steps` and `advisor` are JSONB in Supabase, so
 * a past decision renders through exactly the same components a live one does
 * — there is no second read model to drift out of sync.
 */
function Replay({ runId }) {
  const [run, setRun] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setRun(null);
    setError(null);
    fetchRun(runId).then(setRun).catch((e) => setError(e.message));
  }, [runId]);

  if (error) return <ErrorBar message={error} />;
  if (!run) return <Panel><Skeleton rows={6} /></Panel>;

  const steps = run.steps ?? [];
  if (!steps.length) {
    return <Panel><Empty>No detailed trail saved for this run.</Empty></Panel>;
  }

  return (
    <div className="stack">
      <Panel
        title="Full Trail"
        sub={`${run.part_id} · ${relTime(run.created_at)}`}
        right={
          <>
            <StatusBadge status={run.status} />
            {run.anomaly_detected && <StatusBadge label="anomaly" tone="crit" />}
          </>
        }
      >
        <div className="pipe">
          <div className="pipe-step">
            <span className="pipe-mark done">✓</span>
            <div>
              <div className="pipe-t">Trigger</div>
              <div className="pipe-s">Stock hit reorder point</div>
            </div>
          </div>
          {steps.map((s, i) => (
            <div className="pipe-step" key={s.agent}>
              <span className="pipe-mark done">✓</span>
              <div>
                <div className="pipe-t">
                  <span className="mono dim3" style={{ fontSize: 10, marginRight: 6 }}>A{i + 1}</span>
                  {s.agent}
                </div>
                <div className="pipe-s">{s.status ? String(s.status).replace(/-/g, ' ') : 'completed'}</div>
              </div>
            </div>
          ))}
          {run.advisor && (
            <div className="pipe-step">
              <span className="pipe-mark ai">✓</span>
              <div>
                <div className="pipe-t">
                  <span className="mono" style={{ fontSize: 10, marginRight: 6, color: 'var(--ai)' }}>AI</span>
                  Escalation Advisor
                </div>
                <div className="pipe-s">{run.advisor.recommendation?.action ?? 'no verdict'}</div>
              </div>
            </div>
          )}
          <div className="pipe-step">
            <span className={`pipe-mark ${run.status === 'auto-approved' ? 'done' : 'active'}`}>
              {run.status === 'auto-approved' ? '✓' : '●'}
            </span>
            <div>
              <div className="pipe-t">Result</div>
              <div className="pipe-s">
                {run.status === 'auto-approved'
                  ? `PO auto-issued · ${money(run.order_value)}`
                  : `Escalated to a human · ${money(run.order_value)}`}
              </div>
            </div>
          </div>
        </div>
      </Panel>

      {run.summary?.executiveSummary && (
        <Panel title="Summary">
          <p className="reason">{run.summary.executiveSummary}</p>
        </Panel>
      )}

      {run.advisor && <AIAdvisorPanel advisor={run.advisor} />}

      <Panel title="Step detail" bodyClass="tight">
        <div className="panel-body">
          <Disclose label={`Open all ${steps.length} agent cards`}>
            <div className="stack">
              {steps.map((step) => (
                <AgentResultCard key={step.agent} step={step} />
              ))}
            </div>
          </Disclose>
        </div>
      </Panel>
    </div>
  );
}

export default function History() {
  const { runId } = useParams();
  const navigate = useNavigate();
  const [runs, setRuns] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchRuns(50)
      .then(setRuns)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const shown = runs.filter((r) => {
    if (filter === 'escalated') return r.status === 'escalated';
    if (filter === 'auto') return r.status === 'auto-approved';
    if (filter === 'anomaly') return r.anomaly_detected;
    return true;
  });

  return (
    <div className="stack">
      <ErrorBar message={error} />

      <Reveal><Panel
        title="Past Decisions"
        sub="Click any row to replay"
        bodyClass="tight"
        right={
          <div className="seg">
            {[
              { id: 'all', label: 'All' },
              { id: 'escalated', label: 'Escalated' },
              { id: 'auto', label: 'Automated' },
              { id: 'anomaly', label: 'Spikes' },
            ].map((f) => (
              <button key={f.id} className={filter === f.id ? 'on' : ''} onClick={() => setFilter(f.id)}>
                {f.label}
              </button>
            ))}
          </div>
        }
      >
        {loading ? (
          <Skeleton rows={6} />
        ) : shown.length === 0 ? (
          <Empty>No runs match this filter.</Empty>
        ) : (
          <div className="tscroll">
            <table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Part</th>
                  <th>Decision</th>
                  <th className="num">Value</th>
                  <th>Reason</th>
                  <th>Logistics</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr
                    key={r.id}
                    className={`clickable sev-${r.status === 'auto-approved' ? 'ok' : r.anomaly_detected ? 'crit' : 'warn'}`}
                    onClick={() => navigate(`/app/history/${r.id}`)}
                  >
                    <td className="dim3">{relTime(r.created_at)}</td>
                    <td className="mono">{r.part_id}</td>
                    <td>
                      <StatusBadge status={r.status} />
                      {r.anomaly_detected && <StatusBadge label="anomaly" tone="crit" />}
                    </td>
                    <td className="num">{money(r.order_value)}</td>
                    <td className="dim3">{r.failed_guardrails?.length ? r.failed_guardrails.join(', ') : 'None'}</td>
                    <td className="dim3">{String(r.logistics_status ?? 'not set').replace(/-/g, ' ')}</td>
                    <td>
                      <span className="btn sm">{runId === r.id ? 'Showing' : 'Replay'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel></Reveal>

      {runId && <Replay runId={runId} />}
    </div>
  );
}
