import { StatusBadge } from './ui.jsx';

const ACTION_LABEL = {
  APPROVE_AS_PROPOSED: 'Approve as proposed',
  APPROVE_ALTERNATE_SUPPLIER: 'Switch supplier',
  SPLIT_ORDER: 'Split the order',
  REDUCE_QUANTITY: 'Reduce quantity',
  INVESTIGATE_EQUIPMENT: 'Investigate equipment',
  REJECT: 'Reject',
};

/** Plain-language names for the tools, so a non-technical reader follows it. */
const TOOL_LABEL = {
  get_usage_history: 'Pulled 90-day usage history',
  compare_suppliers: 'Compared every supplier on file',
  check_related_parts: 'Checked related parts on the same line',
  get_past_decisions: 'Reviewed past decisions for this part',
};

/**
 * The one agentic component in the system. Styled as a distinct kind of thing
 * from the four deterministic agents — violet rather than the semantic
 * palette — because it reasons rather than computes, and because it advises
 * rather than decides.
 */
export default function AIAdvisorPanel({ advisor, compact = false }) {
  if (!advisor) return null;

  if (advisor.error) {
    return (
      <section className="panel agentcard aicard">
        <header className="panel-head">
          <span className="agent-idx ai">AI</span>
          <h2>Escalation Advisor</h2>
          <StatusBadge label="unavailable" tone="idle" />
        </header>
        <div className="panel-body">
          <p className="reason">
            The advisor could not complete: {advisor.error}. The guardrail decision stands
            unchanged — this layer is advisory only.
          </p>
        </div>
      </section>
    );
  }

  const rec = advisor.recommendation ?? {};
  const tools = advisor.toolsInvoked ?? [];

  return (
    <section className="panel agentcard aicard reveal">
      <header className="panel-head">
        <span className="agent-idx ai">AI</span>
        <h2>Escalation Advisor</h2>
        <StatusBadge label="advisory only" tone="ai" title="Cannot approve spend or overturn a guardrail" />
        {rec.confidence && (
          <StatusBadge label={`${rec.confidence} confidence`} tone={rec.confidence === 'high' ? 'ok' : 'warn'} />
        )}
      </header>

      <div className="panel-body stack">
        <div>
          <div className="label">Recommendation</div>
          <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--ai)', marginTop: 2 }}>
            {ACTION_LABEL[rec.action] ?? rec.action ?? 'No recommendation'}
          </div>
          {rec.supplier && rec.supplier !== 'n/a' && (
            <div className="dim" style={{ fontSize: 12, marginTop: 2 }}>Supplier: {rec.supplier}</div>
          )}
        </div>

        {tools.length > 0 && (
          <div>
            <div className="label" style={{ marginBottom: 4 }}>What it chose to investigate</div>
            <div className="stack" style={{ gap: 3 }}>
              {tools.map((t, i) => (
                <div key={`${t.tool}-${i}`} className="row" style={{ fontSize: 12 }}>
                  <span className="mono" style={{ color: 'var(--ai)', fontSize: 10 }}>▸</span>
                  <span className="dim">{TOOL_LABEL[t.tool] ?? t.tool}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {rec.why && <p className="reason ai">{rec.why}</p>}

        {rec.risk && (
          <div>
            <div className="label" style={{ marginBottom: 3 }}>Risk if followed</div>
            <p className="reason warn">{rec.risk}</p>
          </div>
        )}

        {!compact && (
          <div className="mono dim3" style={{ fontSize: 10.5 }}>
            {advisor.model} · {((advisor.ms ?? 0) / 1000).toFixed(1)}s ·{' '}
            {advisor.graphTrace?.map((s) => s.node).join(' → ')}
          </div>
        )}
      </div>
    </section>
  );
}
