import SupplierTable from './SupplierTable.jsx';

const STATUS_TONE = {
  'auto-approved': 'ok',
  escalated: 'warn',
  'on-track': 'ok',
  'backup-sourced': 'warn',
  'reroute-inventory': 'warn',
  blocked: 'warn',
};

function Metrics({ step }) {
  const rows = [];

  if (step.agent === 'Demand Prediction') {
    rows.push(['Predicted quantity', `${step.predictedQuantity} units`]);
    rows.push(['Days until stockout', step.daysUntilStockout ?? 'n/a']);
    rows.push(['Baseline → recent rate', `${step.baselineDailyRate} → ${step.recentDailyRate}/day`]);
    rows.push(['Anomaly', step.anomalyDetected ? `yes (z=${step.zScore})` : `no (z=${step.zScore})`]);
  }
  if (step.agent === 'Supplier Evaluation') {
    rows.push(['Suppliers ranked', step.ranked.length]);
    rows.push(['Single-source risk', step.singleSourceRisk ? 'yes' : 'no']);
  }
  if (step.agent === 'Procurement Decision') {
    rows.push(['Order', `${step.quantity} units · $${step.totalCost}`]);
    rows.push(['PO number', step.poNumber ?? '— (held for approval)']);
    rows.push([
      'Failed guardrails',
      step.failedGuardrails.length ? step.failedGuardrails.join(', ') : 'none',
    ]);
  }
  if (step.agent === 'Logistics Coordination') {
    rows.push(['Lead time vs. runway', `${step.leadTimeDays}d vs ${step.daysUntilStockout ?? 'n/a'}d`]);
    rows.push(['Backup supplier', step.backupSupplier?.name ?? '—']);
  }

  return (
    <dl className="metrics">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function AgentStage({ step, index }) {
  const tone = STATUS_TONE[step.status] ?? 'neutral';

  return (
    <section className="panel stage">
      <header className="stage-head">
        <span className="stage-num">Agent {index + 1}</span>
        <h3>{step.agent}</h3>
        {step.status && <span className={`badge badge-${tone}`}>{step.status}</span>}
      </header>
      <Metrics step={step} />
      <p className="reasoning">{step.reasoning}</p>
      {step.agent === 'Supplier Evaluation' && (
        <SupplierTable ranked={step.ranked} recommendedId={step.recommended?.id} />
      )}
      {step.agent === 'Procurement Decision' && step.status === 'escalated' && step.alternatives.length > 0 && (
        <div className="alternatives">
          <h4>Ranked options for the approver</h4>
          <ol>
            {step.alternatives.map((a) => (
              <li key={a.supplierId}>
                {a.supplier} — score {a.score}, ${a.totalCost} total, {a.leadTimeDays}d lead time
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
