export default function SummaryPanel({ summary }) {
  const { cycleTime, costComparison } = summary;

  return (
    <section className="panel summary">
      <h2>Outcome</h2>

      <div className="stat-row">
        <div className="stat">
          <span className="stat-label">Final status</span>
          <span className={`stat-value ${summary.finalStatus === 'auto-approved' ? 'ok' : 'warn'}`}>
            {summary.finalStatus}
          </span>
        </div>
        <div className="stat">
          <span className="stat-label">Order value</span>
          <span className="stat-value">
            {summary.orderValue ? `$${summary.orderValue.toLocaleString()}` : '—'}
          </span>
        </div>
        <div className="stat">
          <span className="stat-label">Decision time</span>
          <span className="stat-value">{summary.decisionSeconds}s</span>
          <span className="stat-note">measured</span>
        </div>
        <div className="stat">
          <span className="stat-label">Est. hours saved</span>
          <span className="stat-value">
            {cycleTime.estimatedHoursSaved ?? '—'}
          </span>
          <span className="stat-note">
            {cycleTime.estimatedHoursSaved != null ? 'vs. assumed benchmark' : 'not claimed'}
          </span>
        </div>
      </div>

      {/* Assumptions are shown, not buried — the benchmark is not a measurement. */}
      <p className="footnote">
        {cycleTime.manualBenchmarkNote}
        {cycleTime.escalationNote ? ` ${cycleTime.escalationNote}` : ''}
      </p>

      {costComparison.basis === 'catalog-list-price' && (
        <div className="cost-box">
          <div className="cost-row">
            <span>Catalog list price</span>
            <span className="mono">${costComparison.listUnitPrice.toFixed(2)}/unit</span>
          </div>
          <div className="cost-row">
            <span>Chosen supplier</span>
            <span className="mono">${costComparison.chosenUnitPrice.toFixed(2)}/unit</span>
          </div>
          <div className={`cost-row total ${costComparison.premiumPerUnit > 0 ? 'over' : 'under'}`}>
            <span>{costComparison.premiumPerUnit > 0 ? 'Premium over list' : 'Below list'}</span>
            <span className="mono">
              {costComparison.premiumPct > 0 ? '+' : ''}
              {costComparison.premiumPct}% · ${Math.abs(costComparison.premiumOnThisOrder).toLocaleString()} on
              this order
            </span>
          </div>
          <p className="footnote">{costComparison.interpretation}</p>
        </div>
      )}

      <p className="reasoning">{summary.executiveSummary}</p>
    </section>
  );
}
