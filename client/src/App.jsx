import { useEffect, useState } from 'react';
import { fetchParts, runPipeline } from './api.js';
import PartSelector from './components/PartSelector.jsx';
import AgentStage from './components/AgentStage.jsx';
import AdvisorCard from './components/AdvisorCard.jsx';
import SummaryPanel from './components/SummaryPanel.jsx';
import RunHistory from './components/RunHistory.jsx';
import ApprovalQueue from './components/ApprovalQueue.jsx';

const STAGE_DELAY_MS = 700;

const TABS = [
  { id: 'run', label: 'Run pipeline' },
  { id: 'history', label: 'Decision history' },
  { id: 'approvals', label: 'Approvals' },
];

export default function App() {
  const [tab, setTab] = useState('run');
  const [parts, setParts] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [result, setResult] = useState(null);
  const [visibleStages, setVisibleStages] = useState(0);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchParts()
      .then((data) => {
        setParts(data);
        setSelectedId(data.find((p) => p.triggerReady)?.id ?? data[0]?.id ?? null);
      })
      .catch((e) => setError(e.message));
  }, []);

  // Reveal agent cards one at a time so the demo reads as a live pipeline.
  useEffect(() => {
    if (!result || visibleStages >= result.steps.length) return;
    const timer = setTimeout(() => setVisibleStages((n) => n + 1), STAGE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [result, visibleStages]);

  async function handleRun() {
    setRunning(true);
    setError(null);
    setResult(null);
    setVisibleStages(0);
    try {
      setResult(await runPipeline(selectedId));
    } catch (e) {
      setError(e.message);
    } finally {
      setRunning(false);
    }
  }

  const allStagesShown = result && visibleStages >= result.steps.length;

  return (
    <div className="app">
      <header className="app-head">
        <h1>SupplyChain Sentinel</h1>
        <p>Autonomous spare-parts procurement — every decision, with its reasoning.</p>
      </header>

      <nav className="tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {error && <div className="error">{error}</div>}

      {tab === 'run' && (
        <>
          <PartSelector
            parts={parts}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onRun={handleRun}
            running={running}
          />

          {result?.steps.slice(0, visibleStages).map((step, i) => (
            <AgentStage key={step.agent} step={step} index={i} />
          ))}

          {allStagesShown && result.advisor && <AdvisorCard advisor={result.advisor} />}
          {allStagesShown && <SummaryPanel summary={result.summary} />}
        </>
      )}

      {tab === 'history' && <RunHistory />}
      {tab === 'approvals' && <ApprovalQueue />}
    </div>
  );
}
