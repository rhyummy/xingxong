import { Panel, StatusBadge, Fact, ScoreBar, GuardrailChecklist, toneOf } from './ui.jsx';
import { money, unitMoney } from '../money.js';

const AGENT_NO = {
  'Demand Prediction': 1,
  'Supplier Evaluation': 2,
  'Procurement Decision': 3,
  'Logistics Coordination': 4,
};

function SupplierScoreTable({ ranked, recommendedId }) {
  if (!ranked?.length) return null;
  return (
    <div className="tscroll" style={{ marginTop: 10 }}>
      <table>
        <thead>
          <tr>
            <th>Supplier</th>
            <th style={{ width: 96 }}>Score</th>
            <th className="num">Unit price</th>
            <th className="num">Lead</th>
            <th className="num">Reliab.</th>
            <th className="num">Defect</th>
          </tr>
        </thead>
        <tbody>
          {ranked.map((s) => {
            const chosen = s.id === recommendedId;
            return (
              <tr key={s.id} className={chosen ? 'sev-ok' : ''}>
                <td>
                  <div className="row">
                    <span>{s.name}</span>
                    {chosen && <StatusBadge label="selected" tone="ok" />}
                  </div>
                  {s.region && <div className="dim3" style={{ fontSize: 11 }}>{s.region}</div>}
                </td>
                <td>
                  <div className="mono" style={{ fontSize: 11 }}>{s.score}</div>
                  <ScoreBar score={s.score} />
                </td>
                <td className="num">{unitMoney(s.price)}</td>
                <td className="num">{s.leadTimeDays}d</td>
                <td className="num">{s.reliabilityScore}</td>
                <td className="num">{s.defectRatePct}%</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Facts({ step }) {
  if (step.agent === 'Demand Prediction') {
    return (
      <div className="facts">
        <Fact label="Predicted qty" value={`${step.predictedQuantity} units`} />
        <Fact label="Days to stockout" value={step.daysUntilStockout ?? '—'} />
        <Fact label="Baseline / day" value={step.baselineDailyRate} />
        <Fact label="Recent / day" value={step.recentDailyRate} />
        <Fact label="Z-score" value={step.zScore} />
      </div>
    );
  }
  if (step.agent === 'Supplier Evaluation') {
    return (
      <div className="facts">
        <Fact label="Suppliers ranked" value={step.ranked?.length ?? 0} />
        <Fact label="Recommended" value={step.recommended?.name ?? '—'} />
        <Fact label="Single source" value={step.singleSourceRisk ? 'Yes' : 'No'} />
      </div>
    );
  }
  if (step.agent === 'Procurement Decision') {
    return (
      <div className="facts">
        <Fact label="Quantity" value={`${step.quantity ?? '—'} units`} />
        <Fact label="Order value" value={money(step.totalCost)} />
        <Fact label="PO number" value={step.poNumber ?? 'held'} />
        <Fact label="Guardrails failed" value={step.failedGuardrails?.length ?? 0} />
      </div>
    );
  }
  return (
    <div className="facts">
      <Fact label="Lead time" value={`${step.leadTimeDays ?? '—'}d`} />
      <Fact label="Stockout runway" value={`${step.daysUntilStockout ?? '—'}d`} />
      <Fact label="Backup" value={step.backupSupplier?.name ?? '—'} />
    </div>
  );
}

/**
 * One deterministic agent's output. Deliberately uniform across all four so
 * the pipeline reads as a sequence of comparable steps.
 */
export default function AgentResultCard({ step, guardrailExplanations }) {
  const no = AGENT_NO[step.agent] ?? '·';
  const tone = step.status ? toneOf(step.status) : step.anomalyDetected ? 'crit' : 'ok';

  return (
    <section className={`panel agentcard ${tone} reveal`}>
      <header className="panel-head">
        <span className="agent-idx">A{no}</span>
        <h2>{step.agent}</h2>
        {step.status && <StatusBadge status={step.status} />}
        {step.anomalyDetected && <StatusBadge label="anomaly" tone="crit" />}
        {step.singleSourceRisk && <StatusBadge label="single source" tone="warn" />}
      </header>

      <div className="panel-body stack">
        <Facts step={step} />
        <p className="reason">{step.reasoning}</p>

        {step.agent === 'Supplier Evaluation' && (
          <SupplierScoreTable ranked={step.ranked} recommendedId={step.recommended?.id} />
        )}

        {step.agent === 'Procurement Decision' && (
          <>
            <div>
              <div className="label" style={{ marginBottom: 4 }}>Guardrails</div>
              <GuardrailChecklist
                failed={step.failedGuardrails ?? []}
                explanations={guardrailExplanations}
              />
            </div>

            {step.status === 'escalated' && step.alternatives?.length > 0 && (
              <div>
                <div className="label" style={{ marginBottom: 4 }}>Ranked options for the approver</div>
                <div className="tscroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Supplier</th>
                        <th className="num">Score</th>
                        <th className="num">Unit</th>
                        <th className="num">Total</th>
                        <th className="num">Lead</th>
                      </tr>
                    </thead>
                    <tbody>
                      {step.alternatives.map((a) => (
                        <tr key={a.supplierId}>
                          <td>{a.supplier}</td>
                          <td className="num">{a.score}</td>
                          <td className="num">{unitMoney(a.unitPrice)}</td>
                          <td className="num">{money(a.totalCost)}</td>
                          <td className="num">{a.leadTimeDays}d</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
