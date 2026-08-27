export default function SummaryPanel({ summary }) {
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
          <span className="stat-label">Manual cycle</span>
          <span className="stat-value">{summary.manualCycleDays} days</span>
        </div>
        <div className="stat">
          <span className="stat-label">Sentinel cycle</span>
          <span className="stat-value">{summary.agentCycleMinutes} min</span>
        </div>
        <div className="stat">
          <span className="stat-label">Days saved</span>
          <span className="stat-value">{summary.daysSaved}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Cost avoidance</span>
          <span className="stat-value">${summary.costAvoidance}</span>
        </div>
      </div>
      <p className="reasoning">{summary.executiveSummary}</p>
    </section>
  );
}
