import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { fetchPart, runAdvisor } from '../api.js';
import { money, unitMoney } from '../money.js';
import {
  Panel, StatusBadge, ErrorBar, Empty, Skeleton, Sparkline, ScoreBar, Fact, relTime,
} from '../components/ui.jsx';
import AIAdvisorPanel from '../components/AIAdvisorPanel.jsx';
import Reveal from '../components/Reveal.jsx';

export default function PartDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [advisor, setAdvisor] = useState(null);
  const [advisorBusy, setAdvisorBusy] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setAdvisor(null);
    fetchPart(id)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function investigate() {
    setAdvisorBusy(true);
    setError(null);
    try {
      const res = await runAdvisor(id);
      setAdvisor(res.advisor);
    } catch (e) {
      setError(e.message);
    } finally {
      setAdvisorBusy(false);
    }
  }

  if (loading) return <Panel><Skeleton rows={8} /></Panel>;
  if (error && !data) return <ErrorBar message={error} />;
  if (!data) return null;

  const { part, usageSeries, demand, evaluation, history, relatedParts } = data;
  const recent = usageSeries.slice(-30);
  const criticalTone = part.criticality === 'critical' ? 'crit' : part.criticality === 'high' ? 'warn' : 'idle';

  return (
    <div className="stack">
      <ErrorBar message={error} />

      {/* --------------------------------------------------- header */}
      <Panel>
        <div className="stack">
          <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div className="row" style={{ gap: 8 }}>
                <button className="btn sm" onClick={() => navigate(-1)}>← Back</button>
                <h1 className="mono">{part.id}</h1>
                <StatusBadge label={part.criticality} tone={criticalTone} />
                {demand.anomalyDetected && <StatusBadge label="demand anomaly" tone="crit" />}
                {evaluation.singleSourceRisk && <StatusBadge label="single source" tone="crit" />}
                {part.triggerReady && <StatusBadge label="below reorder" tone="warn" />}
              </div>
              <div className="dim" style={{ fontSize: 13, marginTop: 3 }}>
                {part.name} · {part.category}
              </div>
            </div>
            <div className="row">
              <button className="btn" onClick={investigate} disabled={advisorBusy}>
                {advisorBusy ? 'Investigating…' : 'Ask AI advisor'}
              </button>
              <button className="btn primary" onClick={() => navigate('/queue')}>Run analysis</button>
            </div>
          </div>

          <div className="facts">
            <Fact label="On hand" value={part.currentStock} />
            <Fact label="Reorder at" value={part.reorderThreshold} />
            <Fact label="List price" value={unitMoney(part.unitCost)} />
            <Fact label="Days to stockout" value={demand.daysUntilStockout ?? '—'} />
            <Fact label="Predicted need" value={`${demand.predictedQuantity} units`} />
            <Fact label="Suppliers" value={part.supplierCount} />
          </div>
        </div>
      </Panel>

      <div className="l-part">
        <div className="stack">
          {/* ------------------------------------------- demand */}
          <Reveal><Panel
            title="Predicted demand"
            sub="90-day consumption · shaded window is the anomaly test period"
            right={
              demand.anomalyDetected
                ? <StatusBadge label={`z = ${demand.zScore}`} tone="crit" />
                : <StatusBadge label={`z = ${demand.zScore}`} tone="ok" />
            }
          >
            <div className="stack">
              <Sparkline
                series={usageSeries}
                height={58}
                markFrom={usageSeries.length - 5}
                tone={demand.anomalyDetected ? 'var(--crit)' : 'var(--accent)'}
              />
              <div className="facts">
                <Fact label="Baseline / day" value={demand.baselineDailyRate} />
                <Fact label="Recent / day" value={demand.recentDailyRate} />
                <Fact label="Peak day" value={Math.max(...usageSeries, 0)} />
                <Fact label="30-day projection" value={`${Math.ceil(demand.recentDailyRate * 30)} units`} />
              </div>
              <p className="reason">{demand.reasoning}</p>
            </div>
          </Panel></Reveal>

          {/* ------------------------------------------ suppliers */}
          <Reveal><Panel
            title="Supplier options"
            sub="Reliability 40% · defect rate 25% · price 20% · lead time 15%"
            bodyClass="tight"
          >
            <div className="tscroll">
              <table>
                <thead>
                  <tr>
                    <th>Supplier</th>
                    <th style={{ width: 110 }}>Score</th>
                    <th className="num">Unit price</th>
                    <th className="num">Lead time</th>
                    <th className="num">Reliability</th>
                    <th className="num">Defect rate</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {evaluation.ranked?.map((s) => {
                    const chosen = s.id === evaluation.recommended?.id;
                    return (
                      <tr key={s.id} className={chosen ? 'sev-ok' : ''}>
                        <td>
                          <div className="row">
                            <span>{s.name}</span>
                            {chosen && <StatusBadge label="recommended" tone="ok" />}
                          </div>
                          <div className="dim3" style={{ fontSize: 11 }}>{s.region ?? '—'}</div>
                        </td>
                        <td>
                          <div className="mono" style={{ fontSize: 11 }}>{s.score}</div>
                          <ScoreBar score={s.score} />
                        </td>
                        <td className="num">{unitMoney(s.price)}</td>
                        <td className="num">{s.leadTimeDays}d</td>
                        <td className="num">{s.reliabilityScore}</td>
                        <td className="num">{s.defectRatePct}%</td>
                        <td className="num dim3" style={{ fontSize: 11 }}>
                          {s.leadTimeDays > (demand.daysUntilStockout ?? 99) ? 'misses stockout' : 'in time'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="panel-body">
              <p className="reason">{evaluation.reasoning}</p>
            </div>
          </Panel></Reveal>

          {advisor && <AIAdvisorPanel advisor={advisor} />}

          {/* --------------------------------- procurement history */}
          <Reveal><Panel title="Procurement history" sub="Past decisions for this part" bodyClass="tight">
            {history.length === 0 ? (
              <Empty>No decisions recorded for this part yet.</Empty>
            ) : (
              <div className="tscroll">
                <table>
                  <thead>
                    <tr>
                      <th>When</th>
                      <th>Decision</th>
                      <th className="num">Order value</th>
                      <th>Guardrails failed</th>
                      <th>Logistics</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h) => (
                      <tr key={h.id} className={h.status === 'auto-approved' ? 'sev-ok' : 'sev-warn'}>
                        <td className="dim3">{relTime(h.created_at)}</td>
                        <td>
                          <StatusBadge status={h.status} />
                          {h.anomaly_detected && <StatusBadge label="anomaly" tone="crit" />}
                        </td>
                        <td className="num">{money(h.order_value)}</td>
                        <td className="dim3">{h.failed_guardrails?.join(', ') || '—'}</td>
                        <td className="dim3">{String(h.logistics_status ?? '—').replace(/-/g, ' ')}</td>
                        <td><Link className="btn sm" to={`/history/${h.id}`}>Replay</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel></Reveal>
        </div>

        {/* ------------------------------------------------ sidebar */}
        <div className="stack">
          <Panel title="Quick actions">
            <div className="stack" style={{ gap: 7 }}>
              <button className="btn wide primary" onClick={() => navigate('/queue')}>Run full analysis</button>
              <button className="btn wide" onClick={investigate} disabled={advisorBusy}>
                {advisorBusy ? 'Investigating…' : 'Ask AI advisor'}
              </button>
              <button className="btn wide" onClick={() => navigate('/approvals')}>Open approvals</button>
            </div>
            <p className="note" style={{ marginTop: 9 }}>
              The advisor only responds when this part's guardrails would escalate.
            </p>
          </Panel>

          <Panel title="Related parts" sub="Same line or category" bodyClass="tight">
            {relatedParts.length === 0 ? (
              <Empty>No related parts on file.</Empty>
            ) : (
              relatedParts.map((r) => {
                const spiking = (r.usageRatio ?? 0) > 1.5;
                return (
                  <div
                    key={r.id}
                    className="alert-item"
                    style={{ gridTemplateColumns: '1fr auto', cursor: 'pointer' }}
                    onClick={() => navigate(`/parts/${r.id}`)}
                  >
                    <div>
                      <div className="alert-t mono" style={{ fontSize: 11.5 }}>{r.id}</div>
                      <div className="alert-s">{r.name}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <StatusBadge
                        label={r.usageRatio != null ? `${r.usageRatio}×` : '—'}
                        tone={spiking ? 'crit' : 'idle'}
                      />
                      {r.belowReorderPoint && (
                        <div className="alert-s" style={{ marginTop: 2 }}>below reorder</div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div className="panel-body">
              <p className="note">
                Usage ratio compares each peer's recent consumption against its own baseline — the
                signal the advisor uses to tell equipment failure from a demand rise.
              </p>
            </div>
          </Panel>

          <Panel title="Contacts" bodyClass="tight">
            {/* MOCK: no contacts table exists in the backend yet. */}
            <div className="alert-item" style={{ gridTemplateColumns: '1fr auto' }}>
              <div>
                <div className="alert-t">Procurement owner</div>
                <div className="alert-s">Maintenance planning desk</div>
              </div>
              <span className="badge idle">internal</span>
            </div>
            {evaluation.ranked?.slice(0, 2).map((s) => (
              <div className="alert-item" key={s.id} style={{ gridTemplateColumns: '1fr auto' }}>
                <div>
                  <div className="alert-t">{s.name}</div>
                  <div className="alert-s">{s.region ?? 'Supplier'}</div>
                </div>
                <span className="badge idle">vendor</span>
              </div>
            ))}
            <div className="panel-body"><p className="note">Contact directory is placeholder data.</p></div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
