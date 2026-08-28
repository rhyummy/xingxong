import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { fetchPart, runAdvisor } from '../api.js';
import { money, unitMoney } from '../money.js';
import {
  Panel, StatusBadge, ErrorBar, Empty, Skeleton, ScoreBar, Fact, Disclose, relTime, partName,
} from '../components/ui.jsx';
import { LineChart, BarList } from '../components/Charts.jsx';
import StockGauge from '../components/StockGauge.jsx';
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
                {demand.anomalyDetected && <StatusBadge label="usage spike" tone="crit" />}
                {evaluation.singleSourceRisk && <StatusBadge label="1 supplier" tone="crit" />}
                {part.triggerReady && <StatusBadge label="low stock" tone="warn" />}
              </div>
              <div className="dim" style={{ fontSize: 13, marginTop: 3 }}>
                {partName(part.name)} · {part.category}
              </div>
            </div>
            <div className="row">
              <button className="btn" onClick={investigate} disabled={advisorBusy}>
                {advisorBusy ? 'Thinking…' : 'Ask AI'}
              </button>
              <button className="btn primary" onClick={() => navigate('/app/queue')}>Run analysis</button>
            </div>
          </div>

          <StockGauge
            currentStock={part.currentStock}
            reorderThreshold={part.reorderThreshold}
            daysLeft={demand.daysUntilStockout}
            dailyRate={demand.recentDailyRate}
            leadTimeDays={evaluation.recommended?.leadTimeDays}
          />

          <div className="facts">
            <Fact label="Price" value={unitMoney(part.unitCost)} />
            <Fact label="Need" value={`${demand.predictedQuantity} units`} />
            <Fact label="Suppliers" value={part.supplierCount} />
            <Fact label="Category" value={part.category} />
          </div>
        </div>
      </Panel>

      <div className="l-part">
        <div className="stack">
          {/* ------------------------------------------- demand */}
          <Reveal><Panel
            title="Daily Usage"
            sub="Last 90 days"
            right={
              <StatusBadge
                label={demand.anomalyDetected ? 'Spike detected' : 'Normal'}
                tone={demand.anomalyDetected ? 'crit' : 'ok'}
              />
            }
          >
            <div className="stack">
              <LineChart
                series={usageSeries}
                height={170}
                highlightFrom={usageSeries.length - 5}
                baseline={demand.baselineDailyRate}
                tone={demand.anomalyDetected ? 'crit' : 'accent'}
                yLabel="Units used"
              />
              <div className="chart-key">
                <span><i className="k-line" /> Daily usage</span>
                <span><i className="k-dash" /> Normal average</span>
                <span><i className="k-band" /> Recent 5 days</span>
              </div>
              <div className="facts">
                <Fact label="Normal" value={`${demand.baselineDailyRate}/day`} />
                <Fact label="Now" value={`${demand.recentDailyRate}/day`} />
                <Fact label="Peak" value={Math.max(...usageSeries, 0)} />
                <Fact label="Need" value={`${demand.predictedQuantity} units`} />
              </div>
              <Disclose label="Why?">
                <p className="reason">{demand.reasoning}</p>
              </Disclose>
            </div>
          </Panel></Reveal>

          {/* ------------------------------------------ suppliers */}
          <Reveal><Panel title="Suppliers" bodyClass="tight">
            <div className="panel-body">
              <BarList
                data={(evaluation.ranked ?? []).map((sup) => ({
                  label: sup.name.split(' ')[0],
                  value: sup.score,
                  tone: sup.id === evaluation.recommended?.id ? 'ok' : 'idle',
                }))}
                max={100}
              />
            </div>

            <div className="tscroll">
              <table>
                <thead>
                  <tr>
                    <th>Supplier</th>
                    <th style={{ width: 110 }}>Score</th>
                    <th className="num">Price</th>
                    <th className="num">Delivery</th>
                    <th className="num">Reliable</th>
                    <th className="num">Defects</th>
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
                          <div className="dim3" style={{ fontSize: 11 }}>{s.region ?? ''}</div>
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
              <Disclose label="How suppliers are scored">
                <p className="note">
                  Reliability 40%, defect rate 25%, price 20%, delivery time 15%.
                </p>
                <p className="reason">{evaluation.reasoning}</p>
              </Disclose>
            </div>
          </Panel></Reveal>

          {advisor && <AIAdvisorPanel advisor={advisor} />}

          {/* --------------------------------- procurement history */}
          <Reveal><Panel title="Past Orders" bodyClass="tight">
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
                        <td className="dim3">{h.failed_guardrails?.length ? h.failed_guardrails.join(', ') : 'None'}</td>
                        <td className="dim3">{String(h.logistics_status ?? 'not set').replace(/-/g, ' ')}</td>
                        <td><Link className="btn sm" to={`/app/history/${h.id}`}>Replay</Link></td>
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
          <Panel title="Actions">
            <div className="stack" style={{ gap: 7 }}>
              <button className="btn wide primary" onClick={() => navigate('/app/queue')}>Run Analysis</button>
              <button className="btn wide" onClick={investigate} disabled={advisorBusy}>
                {advisorBusy ? 'Thinking…' : 'Ask AI'}
              </button>
              <button className="btn wide" onClick={() => navigate('/app/approvals')}>Approvals</button>
            </div>
            <p className="note" style={{ marginTop: 9 }}>
AI only responds when this part needs a human decision.
            </p>
          </Panel>

          <Panel title="Related Parts" bodyClass="tight">
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
                    onClick={() => navigate(`/app/parts/${r.id}`)}
                  >
                    <div>
                      <div className="alert-t mono" style={{ fontSize: 11.5 }}>{r.id}</div>
                      <div className="alert-s">{partName(r.name)}</div>
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
Numbers show how much more each part is being used than normal. Several
                high values on one line usually means equipment trouble.
              </p>
            </div>
          </Panel>

        </div>
      </div>
    </div>
  );
}
