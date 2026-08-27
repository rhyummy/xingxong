/**
 * Live pipeline status. Renders the four deterministic stages plus the
 * conditional advisor, marking each done / active / waiting so a viewer can
 * see where the system currently is.
 */

const STAGES = [
  { key: 'demand', agent: 'Demand Prediction', no: 'A1' },
  { key: 'supplier', agent: 'Supplier Evaluation', no: 'A2' },
  { key: 'decision', agent: 'Procurement Decision', no: 'A3' },
  { key: 'logistics', agent: 'Logistics Coordination', no: 'A4' },
];

function summarise(step) {
  if (!step) return null;
  switch (step.agent) {
    case 'Demand Prediction':
      return step.anomalyDetected
        ? `Anomaly detected · z=${step.zScore}`
        : `Routine demand · ${step.predictedQuantity} units needed`;
    case 'Supplier Evaluation':
      return step.singleSourceRisk
        ? 'Single-source risk flagged'
        : `${step.ranked?.length ?? 0} suppliers ranked`;
    case 'Procurement Decision':
      return step.status === 'auto-approved'
        ? 'All guardrails passed'
        : `${step.failedGuardrails?.length ?? 0} guardrail(s) failed`;
    case 'Logistics Coordination':
      return String(step.status ?? '').replace(/-/g, ' ');
    default:
      return null;
  }
}

export default function AgentPipeline({ steps = [], running, advisor, advisorPending }) {
  const done = steps.length;

  return (
    <div className="pipe">
      {STAGES.map((stage, i) => {
        const step = steps[i];
        const isDone = Boolean(step);
        const isActive = running && !isDone && i === done;

        return (
          <div className="pipe-step" key={stage.key}>
            <span className={`pipe-mark ${isDone ? 'done' : isActive ? 'active' : 'wait'}`}>
              {isDone ? '✓' : isActive ? '●' : '○'}
            </span>
            <div>
              <div className="pipe-t">
                <span className="mono dim3" style={{ fontSize: 10, marginRight: 6 }}>{stage.no}</span>
                {stage.agent}
              </div>
              <div className="pipe-s">
                {isDone ? summarise(step) : isActive ? 'Running…' : 'Waiting'}
              </div>
            </div>
          </div>
        );
      })}

      {/* Only shown once the pipeline has actually escalated — the advisor
          never runs on the auto-approval path. */}
      {(advisor || advisorPending) && (
        <div className="pipe-step">
          <span className={`pipe-mark ${advisor ? 'ai' : 'active'}`}>{advisor ? '✓' : '●'}</span>
          <div>
            <div className="pipe-t">
              <span className="mono" style={{ fontSize: 10, marginRight: 6, color: 'var(--ai)' }}>AI</span>
              Escalation Advisor
            </div>
            <div className="pipe-s">
              {advisor
                ? `${advisor.toolsInvoked?.length ?? 0} tool(s) used · ${advisor.recommendation?.action ?? 'no verdict'}`
                : 'Investigating the escalation…'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
