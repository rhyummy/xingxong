const ACTION_LABEL = {
  APPROVE_AS_PROPOSED: 'Approve as proposed',
  APPROVE_ALTERNATE_SUPPLIER: 'Switch supplier',
  SPLIT_ORDER: 'Split the order',
  REDUCE_QUANTITY: 'Reduce quantity',
  INVESTIGATE_EQUIPMENT: 'Investigate equipment',
  REJECT: 'Reject',
};

const TOOL_LABEL = {
  get_usage_history: 'Pulled usage history',
  compare_suppliers: 'Compared suppliers',
  check_related_parts: 'Checked related parts on the line',
  get_past_decisions: 'Reviewed past decisions',
};

export default function AdvisorCard({ advisor }) {
  if (!advisor) return null;

  if (advisor.error) {
    return (
      <section className="panel stage advisor">
        <header className="stage-head">
          <span className="stage-num ai">AI</span>
          <h3>Escalation Advisor</h3>
          <span className="badge badge-neutral">unavailable</span>
        </header>
        <p className="reasoning">
          The advisor could not complete: {advisor.error}. The guardrail decision above stands
          unchanged — this layer is advisory only.
        </p>
      </section>
    );
  }

  const rec = advisor.recommendation ?? {};
  const tools = advisor.toolsInvoked ?? [];

  return (
    <section className="panel stage advisor">
      <header className="stage-head">
        <span className="stage-num ai">AI</span>
        <h3>Escalation Advisor</h3>
        <span className={`badge badge-${rec.confidence === 'high' ? 'ok' : 'warn'}`}>
          {rec.confidence ?? 'unknown'} confidence
        </span>
        <span className="badge badge-neutral">advisory only</span>
      </header>

      <p className="advisor-action">{ACTION_LABEL[rec.action] ?? rec.action ?? 'No recommendation'}</p>
      {rec.supplier && rec.supplier !== 'n/a' && (
        <p className="advisor-supplier">Supplier: {rec.supplier}</p>
      )}

      {tools.length > 0 && (
        <div className="tool-trail">
          <h4>What it chose to investigate</h4>
          <ul>
            {tools.map((t, i) => (
              <li key={`${t.tool}-${i}`}>{TOOL_LABEL[t.tool] ?? t.tool}</li>
            ))}
          </ul>
        </div>
      )}

      {rec.why && <p className="reasoning">{rec.why}</p>}
      {rec.risk && (
        <p className="reasoning risk">
          <strong>Risk: </strong>
          {rec.risk}
        </p>
      )}

      <p className="advisor-meta">
        {advisor.model} · {(advisor.ms / 1000).toFixed(1)}s ·{' '}
        {advisor.graphTrace?.map((s) => s.node).join(' → ')}
      </p>
    </section>
  );
}
