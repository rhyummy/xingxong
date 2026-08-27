import { useEffect, useState } from 'react';
import { fetchRuns, fetchRun } from '../api.js';
import AgentStage from './AgentStage.jsx';
import AdvisorCard from './AdvisorCard.jsx';
import { money } from '../money.js';

function when(iso) {
  const d = new Date(iso);
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  return d.toLocaleDateString();
}

export default function RunHistory() {
  const [runs, setRuns] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRuns(25)
      .then(setRuns)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <section className="panel">Loading decision history…</section>;
  if (error) return <div className="error">{error}</div>;

  if (!runs.length) {
    return (
      <section className="panel">
        <h2>Decision history</h2>
        <p className="muted">
          No runs recorded yet. Trigger a pipeline from the Run tab and it will appear here.
        </p>
      </section>
    );
  }

  return (
    <section className="panel panel-flush">
      <div className="panel-pad">
        <h2>Decision history</h2>
        <p className="muted">
          Every pipeline run is logged with all four agents' reasoning. Open one to replay it
          exactly as it was decided.
        </p>
      </div>

      <div className="tscroll">
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>Part</th>
              <th>Decision</th>
              <th className="num">Order value</th>
              <th>Guardrails failed</th>
              <th>Logistics</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {runs.map((r) => {
              const open = openId === r.id;
              return (
                <tr key={r.id} className={r.status === 'auto-approved' ? 'r-ok' : 'r-warn'}>
                  <td className="muted">{when(r.created_at)}</td>
                  <td className="id">{r.part_id}</td>
                  <td>
                    <span className={`pill p-${r.status === 'auto-approved' ? 'ok' : 'warn'}`}>
                      {r.status}
                    </span>
                    {r.anomaly_detected && <span className="pill p-crit">anomaly</span>}
                  </td>
                  <td className="num">{r.order_value ? money(r.order_value) : '—'}</td>
                  <td className="muted">{r.failed_guardrails?.join(', ') || '—'}</td>
                  <td className="muted">{r.logistics_status ?? '—'}</td>
                  <td>
                    <button className="link-btn" onClick={() => setOpenId(open ? null : r.id)}>
                      {open ? 'Hide' : 'Replay'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {openId && <ReplayPanel runId={openId} />}
    </section>
  );
}

/**
 * `steps` and `advisor` are stored as JSONB, so a past run renders through the
 * same components as a live one — no separate read model to drift out of sync.
 * Fetched on demand rather than with the list, which would ship every run's
 * full trail up front.
 */
function ReplayPanel({ runId }) {
  const [run, setRun] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setRun(null);
    setError(null);
    fetchRun(runId).then(setRun).catch((e) => setError(e.message));
  }, [runId]);

  if (error) return <div className="error">{error}</div>;
  if (!run) return <div className="panel-pad muted">Loading trail…</div>;

  const steps = run.steps ?? [];
  if (!steps.length) {
    return (
      <div className="panel-pad muted">
        This run predates full trail capture, so only its summary row is available.
      </div>
    );
  }

  return (
    <div className="replay">
      <h3>Replay · {run.part_id}</h3>
      {steps.map((step, i) => (
        <AgentStage key={step.agent} step={step} index={i} />
      ))}
      {run.advisor && <AdvisorCard advisor={run.advisor} />}
      {run.summary?.executiveSummary && (
        <p className="reasoning">{run.summary.executiveSummary}</p>
      )}
    </div>
  );
}
