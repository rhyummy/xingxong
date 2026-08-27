import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchStats, fetchParts, fetchRuns, fetchHealth } from '../api.js';
import { money } from '../money.js';
import {
  Panel, MetricCard, StatusBadge, Dot, ErrorBar, Empty, Skeleton, relTime, clockTime,
} from '../components/ui.jsx';
import Reveal from '../components/Reveal.jsx';

/* ------------------------------------------------------------------- feed */

function severityOf(run) {
  if (run.status === 'auto-approved') return 'ok';
  if (run.anomaly_detected || run.failed_guardrails?.includes('single-source-risk')) return 'crit';
  return 'warn';
}

function feedBadge(run) {
  if (run.status === 'auto-approved') return { label: 'auto', tone: 'ok' };
  if (run.anomaly_detected) return { label: 'anomaly', tone: 'crit' };
  if (run.failed_guardrails?.includes('single-source-risk')) return { label: 'hold', tone: 'crit' };
  return { label: 'escalated', tone: 'warn' };
}

function DecisionFeed({ runs, partsById, onOpen }) {
  if (!runs.length) {
    return (
      <Empty>
        No decisions recorded yet. Run the pipeline from the Task Queue and they will stream in here.
      </Empty>
    );
  }

  return (
    <div>
      {runs.map((r) => {
        const part = partsById[r.part_id];
        const badge = feedBadge(r);
        return (
          <div
            key={r.id}
            className={`feed-row sev-${severityOf(r)}`}
            onClick={() => onOpen(r)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onOpen(r)}
          >
            <StatusBadge label={badge.label} tone={badge.tone} />

            <div>
              <div className="feed-part">{r.part_id}</div>
              <div className="feed-desc">{part?.name ?? 'Unknown part'}</div>
            </div>

            <div>
              <div className="label">Value</div>
              <div className="mono" style={{ fontSize: 11.5 }}>{money(r.order_value)}</div>
            </div>

            <div>
              <div className="label">Logistics</div>
              <div style={{ fontSize: 11.5 }} className="dim">
                {String(r.logistics_status ?? '—').replace(/-/g, ' ')}
              </div>
            </div>

            <div>
              <div className="label">Guardrails</div>
              <div style={{ fontSize: 11.5 }} className="dim">
                {r.failed_guardrails?.length
                  ? r.failed_guardrails.map((g) => g.replace(/-/g, ' ')).join(', ')
                  : 'all passed'}
              </div>
            </div>

            <div className="mono dim3" style={{ fontSize: 11 }}>{relTime(r.created_at)}</div>

            <button className="btn sm" onClick={(e) => { e.stopPropagation(); onOpen(r); }}>
              Open
            </button>
          </div>
        );
      })}
    </div>
  );
}

/* --------------------------------------------------------------- sidebar */

function buildAlerts(stats, runs, health) {
  const alerts = [];

  if (stats?.anomaliesDetected > 0) {
    alerts.push({
      tone: 'crit',
      title: `Demand anomaly on ${stats.anomaliesDetected} part${stats.anomaliesDetected > 1 ? 's' : ''}`,
      sub: 'Consumption is running well above baseline — possible equipment failure',
    });
  }
  if (stats?.pendingApprovals > 0) {
    alerts.push({
      tone: 'warn',
      title: `${stats.pendingApprovals} order${stats.pendingApprovals > 1 ? 's' : ''} awaiting approval`,
      sub: 'Guardrails blocked auto-issue; a buyer decision is required',
    });
  }
  if (stats?.singleSourced > 0) {
    alerts.push({
      tone: 'warn',
      title: `${stats.singleSourced} parts are single-sourced`,
      sub: 'No fallback vendor exists if these suppliers slip',
    });
  }
  const reroutes = runs.filter((r) => r.logistics_status === 'reroute-inventory').length;
  if (reroutes > 0) {
    alerts.push({
      tone: 'crit',
      title: `${reroutes} shipment${reroutes > 1 ? 's' : ''} cannot beat stockout`,
      sub: 'Logistics recommends rerouting inventory from another site',
    });
  }
  if (health?.catalogSource === 'local-json') {
    alerts.push({
      tone: 'crit',
      title: 'Running on local fallback catalog',
      sub: 'Supabase was unreachable at startup — figures may be incomplete',
    });
  }
  if (!alerts.length) {
    alerts.push({ tone: 'ok', title: 'No active alerts', sub: 'All monitored parts are within tolerance' });
  }
  return alerts;
}

function SystemHealth({ health, stats }) {
  const rows = [
    { k: 'API', v: health?.ok ? 'Responding' : 'Unreachable', tone: health?.ok ? 'ok' : 'crit' },
    {
      k: 'Catalog source',
      v: health?.catalogSource === 'supabase' ? 'Supabase (live)' : 'Local JSON (fallback)',
      tone: health?.catalogSource === 'supabase' ? 'ok' : 'warn',
    },
    { k: 'Decision pipeline', v: 'Deterministic · ready', tone: 'ok' },
    { k: 'AI advisor', v: 'Standby — escalations only', tone: 'ai' },
    { k: 'Parts tracked', v: `${stats?.totalParts ?? '—'} across catalog`, tone: 'idle' },
  ];

  return (
    <div className="stack" style={{ gap: 0 }}>
      {rows.map((r) => (
        <div key={r.k} className="row" style={{ justifyContent: 'space-between', padding: '7px 13px', borderBottom: '1px solid var(--line-soft)' }}>
          <span className="dim" style={{ fontSize: 12 }}>{r.k}</span>
          <span className="row" style={{ gap: 6 }}>
            <Dot tone={r.tone === 'ai' ? 'idle' : r.tone} />
            <span style={{ fontSize: 11.5 }} className="dim3">{r.v}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ screen */

export default function Operations() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [parts, setParts] = useState([]);
  const [runs, setRuns] = useState([]);
  const [health, setHealth] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    setError(null);
    Promise.all([fetchStats(), fetchParts(), fetchRuns(25), fetchHealth()])
      .then(([s, p, r, h]) => { setStats(s); setParts(p); setRuns(r); setHealth(h); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  const partsById = Object.fromEntries(parts.map((p) => [p.id, p]));
  const alerts = buildAlerts(stats, runs, health);

  const events = runs.slice(0, 8).map((r) => ({
    t: clockTime(r.created_at),
    text:
      r.status === 'auto-approved'
        ? `${r.part_id}: PO auto-issued, ${money(r.order_value)}`
        : `${r.part_id}: escalated — ${r.failed_guardrails?.join(', ') || 'guardrail'}`,
  }));

  return (
    <div className="stack">
      <ErrorBar message={error} onRetry={load} />

      <div className="l-ops">
        {/* ------------------------------------------------ KPI stack */}
        <div className="stack">
          <Reveal delay={0}><MetricCard
            label="Inventory health"
            value={stats ? `${stats.inventoryHealth}%` : '—'}
            sub="Parts above reorder point"
            tone={stats && stats.inventoryHealth < 75 ? 'warn' : 'ok'}
          /></Reveal>
          <Reveal delay={0.04}><MetricCard
            label="Autonomy rate"
            value={stats?.autonomyRate != null ? `${stats.autonomyRate}%` : '—'}
            sub="Decisions closed without a human"
            tone={stats?.autonomyRate >= 50 ? 'ok' : 'warn'}
          /></Reveal>
          <Reveal delay={0.08}><MetricCard
            label="Pending approvals"
            value={stats?.pendingApprovals ?? '—'}
            sub="Awaiting buyer decision"
            tone={stats?.pendingApprovals > 0 ? 'warn' : undefined}
          /></Reveal>
          <Reveal delay={0.12}><MetricCard
            label="Decisions processed"
            value={stats?.decisionsProcessed ?? '—'}
            sub="Full pipeline runs logged"
          /></Reveal>
          <Reveal delay={0.16}><MetricCard
            label="Parts at risk"
            value={stats?.partsAtRisk ?? '—'}
            sub="Stockout within 7 days"
            tone={stats?.partsAtRisk > 0 ? 'crit' : 'ok'}
          /></Reveal>
        </div>

        {/* --------------------------------------------- decision feed */}
        <Panel
          title="Live decision feed"
          sub="Autonomous procurement decisions — newest first"
          bodyClass="tight"
          right={
            <>
              <span className="label">{runs.length} logged</span>
              <button className="btn sm" onClick={load}>Refresh</button>
              <button className="btn sm primary" onClick={() => navigate('/queue')}>Run analysis</button>
            </>
          }
        >
          {loading ? <Skeleton rows={6} /> : (
            <DecisionFeed
              runs={runs}
              partsById={partsById}
              onOpen={(r) => navigate(`/history/${r.id}`)}
            />
          )}
        </Panel>

        {/* ------------------------------------------------- sidebar */}
        <div className="stack">
          <Reveal><Panel title="Active alerts" sub="Issues requiring attention" bodyClass="tight">
            {alerts.map((a, i) => (
              <div className="alert-item" key={i}>
                <Dot tone={a.tone} />
                <div>
                  <div className="alert-t">{a.title}</div>
                  <div className="alert-s">{a.sub}</div>
                </div>
              </div>
            ))}
          </Panel></Reveal>

          <Reveal delay={0.05}><Panel title="System health" sub="Telemetry and connection status" bodyClass="tight">
            <SystemHealth health={health} stats={stats} />
          </Panel></Reveal>

          <Reveal delay={0.1}><Panel title="Recent events" sub="Chronological system log" bodyClass="tight">
            <div style={{ padding: '7px 0' }}>
              {events.length === 0 && <div className="empty">No events yet.</div>}
              {events.map((e, i) => (
                <div className="event" key={i}>
                  <span className="t">{e.t}</span>
                  <span>{e.text}</span>
                </div>
              ))}
            </div>
          </Panel></Reveal>
        </div>
      </div>
    </div>
  );
}
