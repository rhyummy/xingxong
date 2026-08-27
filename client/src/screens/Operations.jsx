import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchStats, fetchParts, fetchRuns } from '../api.js';
import { money } from '../money.js';
import {
  Panel, MetricCard, StatusBadge, Dot, ErrorBar, Empty, Skeleton, relTime, shortName,
} from '../components/ui.jsx';
import { Donut, Legend, BarList, ColumnChart, Gauge } from '../components/Charts.jsx';
import Reveal from '../components/Reveal.jsx';

const GUARDRAIL_NAME = {
  'cost-threshold': 'Over budget',
  'supplier-score-threshold': 'Weak supplier',
  'demand-anomaly': 'Demand spike',
  'single-source-risk': 'One supplier',
};

function rowTone(run) {
  if (run.status === 'auto-approved') return 'ok';
  if (run.anomaly_detected) return 'crit';
  return 'warn';
}

export default function Operations() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [parts, setParts] = useState([]);
  const [runs, setRuns] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    setError(null);
    Promise.all([fetchStats(), fetchParts(), fetchRuns(30)])
      .then(([s, p, r]) => { setStats(s); setParts(p); setRuns(r); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  const partsById = Object.fromEntries(parts.map((p) => [p.id, p]));

  const auto = runs.filter((r) => r.status === 'auto-approved').length;
  const escalated = runs.length - auto;

  // Which guardrail stopped orders most often.
  const guardTally = {};
  runs.forEach((r) => (r.failed_guardrails ?? []).forEach((g) => { guardTally[g] = (guardTally[g] ?? 0) + 1; }));
  const guardData = Object.entries(guardTally)
    .map(([k, v]) => ({ label: GUARDRAIL_NAME[k] ?? k, value: v, tone: 'warn' }))
    .sort((a, b) => b.value - a.value);

  // Stock health grouped by category.
  const catTally = {};
  parts.forEach((p) => {
    catTally[p.category] ??= { total: 0, low: 0 };
    catTally[p.category].total++;
    if (p.triggerReady) catTally[p.category].low++;
  });
  const catData = Object.entries(catTally).map(([k, v]) => ({
    label: k.slice(0, 5),
    value: v.low,
    tone: v.low > 3 ? 'crit' : v.low > 0 ? 'warn' : 'ok',
  }));

  const atRisk = parts
    .filter((p) => p.triggerReady)
    .sort((a, b) => a.currentStock / a.reorderThreshold - b.currentStock / b.reorderThreshold)
    .slice(0, 6);

  return (
    <div className="stack">
      <ErrorBar message={error} onRetry={load} />

      <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <h1>Operations Overview</h1>
        <div className="row">
          <button className="btn sm" onClick={load}>Refresh</button>
          <button className="btn primary" onClick={() => navigate('/queue')}>Run Analysis</button>
        </div>
      </div>

      {/* ------------------------------------------------------- KPI row */}
      <div className="kpi-row">
        {[
          { label: 'Stock Health', value: stats ? `${stats.inventoryHealth}%` : '—', sub: 'in tolerance', tone: stats?.inventoryHealth < 75 ? 'warn' : 'ok' },
          { label: 'Handled by AI', value: stats?.autonomyRate != null ? `${stats.autonomyRate}%` : '—', sub: 'no human needed', tone: 'ok' },
          { label: 'Need Approval', value: stats?.pendingApprovals ?? '—', sub: 'waiting on you', tone: stats?.pendingApprovals > 0 ? 'warn' : undefined },
          { label: 'Parts At Risk', value: stats?.partsAtRisk ?? '—', sub: 'stockout in 7 days', tone: 'crit' },
          { label: 'Decisions Made', value: stats?.decisionsProcessed ?? '—', sub: 'total runs' },
        ].map((k, i) => (
          <Reveal key={k.label} delay={i * 0.04}>
            <MetricCard {...k} />
          </Reveal>
        ))}
      </div>

      {/* --------------------------------------------------- chart strip */}
      <div className="l-3">
        <Reveal>
          <Panel title="Decision Split">
            <div className="chart-split">
              <Donut
                slices={[
                  { label: 'Automated', value: auto, tone: 'ok' },
                  { label: 'Sent to human', value: escalated, tone: 'warn' },
                ]}
                center={runs.length ? `${Math.round((auto / runs.length) * 100)}%` : '—'}
                centerLabel="automated"
              />
              <Legend
                items={[
                  { label: 'Automated', value: auto, tone: 'ok' },
                  { label: 'Sent to human', value: escalated, tone: 'warn' },
                ]}
              />
            </div>
          </Panel>
        </Reveal>

        <Reveal delay={0.05}>
          <Panel title="Why Orders Stopped">
            {guardData.length === 0 ? (
              <Empty>Nothing stopped yet.</Empty>
            ) : (
              <BarList data={guardData} />
            )}
          </Panel>
        </Reveal>

        <Reveal delay={0.1}>
          <Panel title="Low Stock by Category">
            <ColumnChart data={catData} />
          </Panel>
        </Reveal>
      </div>

      {/* ----------------------------------------------- feed + sidebar */}
      <div className="l-feed">
        <Reveal>
          <Panel
            title="Live Decisions"
            bodyClass="tight"
            right={<span className="label">{runs.length} total</span>}
          >
            {loading ? (
              <Skeleton rows={6} />
            ) : runs.length === 0 ? (
              <Empty>No decisions yet. Hit Run Analysis to start.</Empty>
            ) : (
              <div className="tscroll">
                <table>
                  <thead>
                    <tr>
                      <th>Part</th>
                      <th>Result</th>
                      <th className="num">Value</th>
                      <th>Reason</th>
                      <th>Delivery</th>
                      <th className="num">When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runs.slice(0, 12).map((r) => (
                      <tr
                        key={r.id}
                        className={`clickable sev-${rowTone(r)}`}
                        onClick={() => navigate(`/history/${r.id}`)}
                      >
                        <td>
                          <div className="mono" style={{ fontSize: 11.5 }}>{r.part_id}</div>
                          <div className="dim3" style={{ fontSize: 10.5 }}>
                            {shortName(partsById[r.part_id]?.name ?? '')}
                          </div>
                        </td>
                        <td>
                          <StatusBadge
                            label={r.status === 'auto-approved' ? 'Ordered' : 'Needs you'}
                            tone={r.status === 'auto-approved' ? 'ok' : 'warn'}
                          />
                        </td>
                        <td className="num">{money(r.order_value)}</td>
                        <td className="dim3">
                          {r.failed_guardrails?.length
                            ? r.failed_guardrails.map((g) => GUARDRAIL_NAME[g] ?? g).join(', ')
                            : 'All checks passed'}
                        </td>
                        <td className="dim3">
                          {r.logistics_status === 'on-track' ? 'On time'
                            : r.logistics_status === 'backup-sourced' ? 'Backup found'
                            : r.logistics_status === 'reroute-inventory' ? 'Reroute stock'
                            : '—'}
                        </td>
                        <td className="num dim3">{relTime(r.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </Reveal>

        <div className="stack">
          <Reveal>
            <Panel title="Running Low" bodyClass="tight">
              {atRisk.length === 0 ? (
                <Empty>All parts stocked.</Empty>
              ) : (
                atRisk.map((p) => {
                  const pct = (p.currentStock / p.reorderThreshold) * 100;
                  const tone = pct <= 35 ? 'crit' : 'warn';
                  return (
                    <div
                      className="lowrow"
                      key={p.id}
                      onClick={() => navigate(`/parts/${p.id}`)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && navigate(`/parts/${p.id}`)}
                    >
                      <div className="row" style={{ justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 12 }}>{shortName(p.name)}</span>
                        <span className="mono dim3" style={{ fontSize: 11 }}>
                          {p.currentStock}/{p.reorderThreshold}
                        </span>
                      </div>
                      <Gauge value={p.currentStock} max={p.reorderThreshold} tone={tone} />
                    </div>
                  );
                })
              )}
            </Panel>
          </Reveal>

          <Reveal delay={0.05}>
            <Panel title="Alerts" bodyClass="tight">
              {stats?.anomaliesDetected > 0 && (
                <div className="alert-item">
                  <Dot tone="crit" />
                  <div>
                    <div className="alert-t">{stats.anomaliesDetected} demand spikes</div>
                    <div className="alert-s">Possible equipment failure</div>
                  </div>
                </div>
              )}
              {stats?.pendingApprovals > 0 && (
                <div className="alert-item">
                  <Dot tone="warn" />
                  <div>
                    <div className="alert-t">{stats.pendingApprovals} orders waiting</div>
                    <div className="alert-s">Your approval needed</div>
                  </div>
                </div>
              )}
              {stats?.singleSourced > 0 && (
                <div className="alert-item">
                  <Dot tone="warn" />
                  <div>
                    <div className="alert-t">{stats.singleSourced} single-supplier parts</div>
                    <div className="alert-s">No backup if they fail</div>
                  </div>
                </div>
              )}
              {!stats?.anomaliesDetected && !stats?.pendingApprovals && !stats?.singleSourced && (
                <div className="alert-item">
                  <Dot tone="ok" />
                  <div><div className="alert-t">All clear</div></div>
                </div>
              )}
            </Panel>
          </Reveal>
        </div>
      </div>
    </div>
  );
}
