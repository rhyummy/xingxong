import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchPurchaseOrders, setPurchaseOrderStatus, fetchParts, fetchRun, fetchRuns } from '../api.js';
import { money, unitMoney } from '../money.js';
import {
  Panel, StatusBadge, ErrorBar, Empty, Skeleton, GuardrailChecklist, relTime, toneOf,
} from '../components/ui.jsx';
import AIAdvisorPanel from '../components/AIAdvisorPanel.jsx';

/** The five deterministic stages plus the advisor, as an approval timeline. */
function ApprovalTimeline({ run }) {
  const steps = run?.steps ?? [];
  const stages = [
    { t: 'Demand prediction', s: steps[0] && (steps[0].anomalyDetected ? 'Anomaly detected' : 'Routine demand') },
    { t: 'Supplier evaluation', s: steps[1] && `${steps[1].ranked?.length ?? 0} suppliers ranked` },
    { t: 'Procurement guardrails', s: steps[2] && `${steps[2].failedGuardrails?.length ?? 0} failed` },
    { t: 'Logistics risk', s: steps[3] && String(steps[3].status).replace(/-/g, ' ') },
  ];

  return (
    <div className="pipe">
      {stages.map((st) => (
        <div className="pipe-step" key={st.t}>
          <span className={`pipe-mark ${st.s ? 'done' : 'wait'}`}>{st.s ? '✓' : '○'}</span>
          <div>
            <div className="pipe-t">{st.t}</div>
            <div className="pipe-s">{st.s ?? 'Not recorded'}</div>
          </div>
        </div>
      ))}
      <div className="pipe-step">
        <span className={`pipe-mark ${run?.advisor ? 'ai' : 'wait'}`}>{run?.advisor ? '✓' : '○'}</span>
        <div>
          <div className="pipe-t">AI advisor recommendation</div>
          <div className="pipe-s">
            {run?.advisor?.recommendation?.action ?? 'Not consulted'}
          </div>
        </div>
      </div>
      <div className="pipe-step">
        <span className="pipe-mark active">●</span>
        <div>
          <div className="pipe-t">Awaiting human approval</div>
          <div className="pipe-s">You are the decision point</div>
        </div>
      </div>
    </div>
  );
}

export default function Approvals() {
  const navigate = useNavigate();
  // Reached as /approve/:runId straight from a completed pipeline run — the
  // order to review is the one that run produced.
  const { runId } = useParams();
  const [orders, setOrders] = useState([]);
  const [partsById, setPartsById] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [run, setRun] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  function load() {
    setLoading(true);
    Promise.all([fetchPurchaseOrders(50), fetchParts()])
      .then(([po, parts]) => {
        setOrders(po);
        setPartsById(Object.fromEntries(parts.map((p) => [p.id, p])));
        setSelectedId(
          (cur) =>
            cur ??
            (runId && po.find((o) => o.run_id === runId)?.id) ??
            po.find((o) => o.status === 'pending-approval')?.id ??
            null
        );
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, [runId]);

  const selected = orders.find((o) => o.id === selectedId);

  // Pull the decision trail behind the selected PO so the approver sees why.
  useEffect(() => {
    if (!selected) return setRun(null);
    let cancelled = false;

    (async () => {
      try {
        if (selected.run_id) {
          const r = await fetchRun(selected.run_id);
          if (!cancelled) setRun(r);
          return;
        }
        // Older POs predate run linkage — fall back to the part's latest run.
        const runs = await fetchRuns(50);
        const match = runs.find((r) => r.part_id === selected.part_id);
        if (!cancelled) setRun(match ? await fetchRun(match.id) : null);
      } catch {
        if (!cancelled) setRun(null);
      }
    })();

    return () => { cancelled = true; };
  }, [selectedId]);

  async function decide(status) {
    setBusy(true);
    setError(null);
    try {
      const updated = await setPurchaseOrderStatus(selected.id, status, 'demo-buyer');
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Panel><Skeleton rows={7} /></Panel>;

  const pending = orders.filter((o) => o.status === 'pending-approval');
  const settled = orders.filter((o) => o.status !== 'pending-approval');
  const decision = run?.steps?.[2];
  const part = selected ? partsById[selected.part_id] : null;

  return (
    <div className="stack">
      <ErrorBar message={error} />

      <div className="l-order">
        {/* --------------------------------------------- pending queue */}
        <Panel title="Pending approval" sub={`${pending.length} order${pending.length === 1 ? '' : 's'}`} bodyClass="tight">
          {pending.length === 0 ? (
            <Empty>Nothing pending. Every recorded order cleared its guardrails.</Empty>
          ) : (
            pending.map((o) => (
              <button
                key={o.id}
                className={`qitem ${o.id === selectedId ? 'on' : ''} sev-warn`}
                onClick={() => setSelectedId(o.id)}
                type="button"
              >
                <div className="row" style={{ justifyContent: 'space-between', marginBottom: 3 }}>
                  <span className="mono" style={{ fontSize: 11.5 }}>{o.id}</span>
                  <span className="mono" style={{ fontSize: 11.5 }}>{money(o.total_cost)}</span>
                </div>
                <div style={{ fontSize: 12 }}>{partsById[o.part_id]?.name ?? o.part_id}</div>
                <div className="dim3" style={{ fontSize: 11, marginTop: 2 }}>
                  {o.quantity} units · {relTime(o.created_at)}
                </div>
              </button>
            ))
          )}
        </Panel>

        {/* ----------------------------------------------- order detail */}
        <div className="stack">
          {!selected ? (
            <Panel><Empty>Select an order to review.</Empty></Panel>
          ) : (
            <>
              <Panel
                title="Order summary"
                sub={selected.id}
                right={<StatusBadge status={selected.status} />}
              >
                <div className="stack">
                  <div className="facts">
                    <div className="fact"><div className="k">Part</div><div className="v" style={{ fontSize: 12 }}>{selected.part_id}</div></div>
                    <div className="fact"><div className="k">Supplier</div><div className="v" style={{ fontSize: 12 }}>{selected.supplier_id}</div></div>
                    <div className="fact"><div className="k">Quantity</div><div className="v">{selected.quantity}</div></div>
                    <div className="fact"><div className="k">Unit price</div><div className="v" style={{ fontSize: 12 }}>{unitMoney(selected.unit_price)}</div></div>
                    <div className="fact"><div className="k">Order value</div><div className="v" style={{ fontSize: 15 }}>{money(selected.total_cost)}</div></div>
                  </div>

                  {part && (
                    <div className="dim" style={{ fontSize: 12.5 }}>
                      {part.name} · {part.category} · list price {unitMoney(part.unitCost)}
                    </div>
                  )}

                  <div className="row" style={{ gap: 7 }}>
                    <button className="btn danger" disabled={busy || selected.status !== 'pending-approval'} onClick={() => decide('rejected')}>
                      Reject
                    </button>
                    <button className="btn" disabled={busy} onClick={() => navigate(`/parts/${selected.part_id}`)}>
                      Request review
                    </button>
                    <button className="btn approve" disabled={busy || selected.status !== 'pending-approval'} onClick={() => decide('approved')}>
                      {busy ? 'Saving…' : 'Approve purchase order'}
                    </button>
                  </div>
                  {selected.status !== 'pending-approval' && (
                    <p className="note">
                      Already {selected.status}
                      {selected.approved_by ? ` by ${selected.approved_by}` : ''}.
                    </p>
                  )}
                </div>
              </Panel>

              {decision && (
                <Panel title="Why was this escalated?" right={<StatusBadge status={decision.status} />}>
                  <GuardrailChecklist
                    failed={decision.failedGuardrails ?? []}
                    explanations={{
                      'cost-threshold': `Order value ${money(decision.totalCost)} exceeds the auto-approval ceiling`,
                      'demand-anomaly': 'Usage spike could signal equipment failure rather than routine wear',
                      'single-source-risk': 'No fallback supplier exists if this order slips',
                      'supplier-score-threshold': 'Top supplier scores below the required minimum',
                    }}
                  />
                </Panel>
              )}

              {run?.advisor && <AIAdvisorPanel advisor={run.advisor} />}
            </>
          )}
        </div>

        {/* ------------------------------------------- approval timeline */}
        <div className="stack">
          <Panel title="Approval timeline" sub="Staged decision path">
            <ApprovalTimeline run={run} />
          </Panel>

          {run?.summary?.executiveSummary && (
            <Panel title="Summary">
              <p className="reason">{run.summary.executiveSummary}</p>
            </Panel>
          )}

          <Panel title="Settled orders" sub={`${settled.length}`} bodyClass="tight">
            {settled.length === 0 ? (
              <Empty>None yet.</Empty>
            ) : (
              <div className="tscroll">
                <table>
                  <thead>
                    <tr><th>PO</th><th className="num">Value</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {settled.map((o) => (
                      <tr key={o.id} className={`clickable sev-${toneOf(o.status)}`} onClick={() => setSelectedId(o.id)}>
                        <td className="mono" style={{ fontSize: 11 }}>{o.id}</td>
                        <td className="num">{money(o.total_cost)}</td>
                        <td><StatusBadge status={o.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
