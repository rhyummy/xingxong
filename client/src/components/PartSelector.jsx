export default function PartSelector({ parts, selectedId, onSelect, onRun, running }) {
  return (
    <section className="panel">
      <h2>Inventory Signal</h2>
      <div className="part-grid">
        {parts.map((p) => (
          <button
            key={p.id}
            className={`part-card ${selectedId === p.id ? 'selected' : ''}`}
            onClick={() => onSelect(p.id)}
          >
            <div className="part-card-head">
              <span className="part-id">{p.id}</span>
              {p.triggerReady && <span className="badge badge-warn">below threshold</span>}
            </div>
            <div className="part-name">{p.name}</div>
            <div className="part-meta">
              stock {p.currentStock} / reorder at {p.reorderThreshold} · {p.supplierCount} supplier
              {p.supplierCount === 1 ? '' : 's'}
            </div>
          </button>
        ))}
      </div>
      <button className="run-btn" onClick={onRun} disabled={!selectedId || running}>
        {running ? 'Running pipeline…' : 'Trigger reorder pipeline'}
      </button>
    </section>
  );
}
