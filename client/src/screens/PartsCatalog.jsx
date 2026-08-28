import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchParts } from '../api.js';
import { unitMoney } from '../money.js';
import {
  Panel, StatusBadge, ErrorBar, Empty, Skeleton, partName,
} from '../components/ui.jsx';
import Reveal from '../components/Reveal.jsx';

const CRIT_TONE = { critical: 'crit', high: 'warn', standard: 'idle' };

export default function PartsCatalog() {
  const navigate = useNavigate();
  const [parts, setParts] = useState([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchParts()
      .then(setParts)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return parts.filter((p) => {
      if (filter === 'risk' && !p.triggerReady) return false;
      if (filter === 'single' && p.supplierCount !== 1) return false;
      if (filter === 'critical' && p.criticality !== 'critical') return false;
      if (q && !`${p.id} ${p.name} ${p.category}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [parts, query, filter]);

  return (
    <div className="stack">
      <ErrorBar message={error} />

      <Reveal><Panel
        title="Parts"
        sub={`${shown.length} of ${parts.length}`}
        bodyClass="tight"
        right={
          <div className="seg">
            {[
              { id: 'all', label: 'All' },
              { id: 'risk', label: 'Low stock' },
              { id: 'single', label: 'One supplier' },
              { id: 'critical', label: 'Critical' },
            ].map((f) => (
              <button key={f.id} className={filter === f.id ? 'on' : ''} onClick={() => setFilter(f.id)}>
                {f.label}
              </button>
            ))}
          </div>
        }
      >
        <div style={{ padding: 10, borderBottom: '1px solid var(--line)' }}>
          <input
            className="input"
            placeholder="Search parts"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {loading ? (
          <Skeleton rows={8} />
        ) : shown.length === 0 ? (
          <Empty>No parts match.</Empty>
        ) : (
          <div className="tscroll">
            <table>
              <thead>
                <tr>
                  <th>Part</th>
                  <th>Category</th>
                  <th className="num">In Stock</th>
                  <th className="num">Reorder At</th>
                  <th className="num">Price</th>
                  <th className="num">Suppliers</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((p) => (
                  <tr
                    key={p.id}
                    className={`clickable ${p.triggerReady ? 'sev-warn' : 'sev-ok'}`}
                    onClick={() => navigate(`/app/parts/${p.id}`)}
                  >
                    <td>
                      <div className="mono" style={{ fontSize: 11.5 }}>{p.id}</div>
                      <div className="dim3" style={{ fontSize: 11 }}>{partName(p.name)}</div>
                    </td>
                    <td className="dim">{p.category}</td>
                    <td className="num">{p.currentStock}</td>
                    <td className="num">{p.reorderThreshold}</td>
                    <td className="num">{unitMoney(p.unitCost)}</td>
                    <td className="num">{p.supplierCount}</td>
                    <td>
                      <div className="row" style={{ gap: 4 }}>
                        <StatusBadge label={p.criticality} tone={CRIT_TONE[p.criticality]} />
                        {p.triggerReady && <StatusBadge label="low" tone="warn" />}
                        {p.supplierCount === 1 && <StatusBadge label="1 supplier" tone="crit" />}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel></Reveal>
    </div>
  );
}
