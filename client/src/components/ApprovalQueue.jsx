import { useEffect, useState } from 'react';
import { fetchPurchaseOrders, setPurchaseOrderStatus } from '../api.js';
import { money, unitMoney } from '../money.js';

const STATUS_TONE = {
  issued: 'ok',
  approved: 'ok',
  'pending-approval': 'warn',
  rejected: 'crit',
};

export default function ApprovalQueue() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  function load() {
    return fetchPurchaseOrders(50)
      .then(setOrders)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function decide(id, status) {
    setBusyId(id);
    setError(null);
    try {
      const updated = await setPurchaseOrderStatus(id, status, 'demo-buyer');
      setOrders((prev) => prev.map((o) => (o.id === id ? updated : o)));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <section className="panel">Loading purchase orders…</section>;

  const pending = orders.filter((o) => o.status === 'pending-approval');
  const settled = orders.filter((o) => o.status !== 'pending-approval');

  return (
    <>
      {error && <div className="error">{error}</div>}

      <section className="panel">
        <h2>Awaiting your approval</h2>
        <p className="muted">
          Orders the guardrails refused to auto-issue. The agent has done the sourcing and
          analysis; the spend decision is yours.
        </p>

        {pending.length === 0 ? (
          <p className="muted" style={{ marginTop: 12 }}>
            Nothing pending. Every recorded order cleared its guardrails.
          </p>
        ) : (
          <div className="po-list">
            {pending.map((o) => (
              <article key={o.id} className="po-card">
                <div className="po-head">
                  <span className="id">{o.id}</span>
                  <span className="pill p-warn">pending approval</span>
                </div>

                <dl className="kv">
                  <dt>Part</dt>
                  <dd>{o.part_id}</dd>
                  <dt>Supplier</dt>
                  <dd>{o.supplier_id}</dd>
                  <dt>Quantity</dt>
                  <dd>{o.quantity} units @ {unitMoney(o.unit_price)}</dd>
                  <dt>Order value</dt>
                  <dd className="strong">{money(o.total_cost)}</dd>
                </dl>

                <div className="po-actions">
                  <button
                    className="btn btn-ghost"
                    disabled={busyId === o.id}
                    onClick={() => decide(o.id, 'rejected')}
                  >
                    Reject
                  </button>
                  <button
                    className="btn btn-primary"
                    disabled={busyId === o.id}
                    onClick={() => decide(o.id, 'approved')}
                  >
                    {busyId === o.id ? 'Saving…' : 'Approve purchase order'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {settled.length > 0 && (
        <section className="panel panel-flush">
          <div className="panel-pad">
            <h2>Settled orders</h2>
          </div>
          <div className="tscroll">
            <table>
              <thead>
                <tr>
                  <th>PO</th>
                  <th>Part</th>
                  <th>Supplier</th>
                  <th className="num">Qty</th>
                  <th className="num">Value</th>
                  <th>Status</th>
                  <th>Decided by</th>
                </tr>
              </thead>
              <tbody>
                {settled.map((o) => (
                  <tr key={o.id}>
                    <td className="id">{o.id}</td>
                    <td className="id">{o.part_id}</td>
                    <td className="id">{o.supplier_id}</td>
                    <td className="num">{o.quantity}</td>
                    <td className="num">{money(o.total_cost)}</td>
                    <td>
                      <span className={`pill p-${STATUS_TONE[o.status] ?? 'neut'}`}>{o.status}</span>
                    </td>
                    <td className="muted">{o.approved_by ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
