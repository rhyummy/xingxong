import { Panel, StatusBadge, Fact, ScoreBar, GuardrailChecklist, toneOf } from './ui.jsx';
import { money, unitMoney } from '../money.js';

const AGENT_NO = {
  'Demand Prediction': 1,
  'Supplier Evaluation': 2,
  'Procurement Decision': 3,
  'Logistics Coordination': 4,
};

/** Short titles. The backend names are precise but long for a card header. */
const AGENT_TITLE = {
  'Demand Prediction': 'How much do we need?',
  'Supplier Evaluation': 'Who should supply it?',
  'Procurement Decision': 'Is it safe to order?',
  'Logistics Coordination': 'Will it arrive in time?',
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
            <th className="num">Price</th>
            <th className="num">Days</th>
            <th className="num">Reliable</th>
            <th className="num">Defects</th>
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
        <Fact label="Order this many" value={`${step.predictedQuantity} units`} />
        <Fact label="Days left" value={step.daysUntilStockout ?? '0'} />
        <Fact label="Normal use" value={`${step.baselineDailyRate}/day`} />
        <Fact label="Recent use" value={`${step.recentDailyRate}/day`} />
        
      </div>
    );
  }
  if (step.agent === 'Supplier Evaluation') {
    return (
      <div className="facts">
        <Fact label="Options" value={step.ranked?.length ?? 0} />
        <Fact label="Best pick" value={step.recommended?.name ?? '—'} />
        <Fact label="Backup exists" value={step.singleSourceRisk ? 'No' : 'Yes'} />
      </div>
    );
  }
  if (step.agent === 'Procurement Decision') {
    return (
      <div className="facts">
        <Fact label="Quantity" value={`${step.quantity ?? '—'} units`} />
        <Fact label="Cost" value={money(step.totalCost)} />
        <Fact label="Order no." value={step.poNumber ?? 'on hold'} />
        <Fact label="Checks failed" value={step.failedGuardrails?.length ?? 0} />
      </div>
    );
  }
  return (
    <div className="facts">
      <Fact label="Arrives in" value={`${step.leadTimeDays ?? '—'} days`} />
      <Fact label="Stock lasts" value={`${step.daysUntilStockout ?? 0} days`} />
      <Fact label="Backup" value={step.backupSupplier?.name ?? 'none needed'} />
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
        <h2>{AGENT_TITLE[step.agent] ?? step.agent}</h2>
        {step.status && <StatusBadge status={step.status} />}
        {step.anomalyDetected && <StatusBadge label="usage spike" tone="crit" />}
        {step.singleSourceRisk && <StatusBadge label="1 supplier" tone="warn" />}
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
              <div className="label" style={{ marginBottom: 4 }}>Safety checks</div>
              <GuardrailChecklist
                failed={step.failedGuardrails ?? []}
                explanations={guardrailExplanations}
              />
            </div>

            {step.status === 'escalated' && step.alternatives?.length > 0 && (
              <div>
                <div className="label" style={{ marginBottom: 4 }}>Other options</div>
                <div className="tscroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Supplier</th>
                        <th className="num">Score</th>
                        <th className="num">Price</th>
                        <th className="num">Total</th>
                        <th className="num">Days</th>
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
