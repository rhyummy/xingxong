import { Router } from 'express';
import { runDemandPrediction } from '../agents/demandPrediction.js';
import { runSupplierEvaluation } from '../agents/supplierEvaluation.js';
import { runProcurementDecision } from '../agents/procurementDecision.js';
import { runLogisticsCoordination } from '../agents/logisticsCoordination.js';
import { runEscalationAdvisor, ADVISOR_GRAPH_SHAPE } from '../agentic/escalationAdvisor.js';
import { getPart } from '../data/index.js';
import { schemas, validate, pipelineLimiter } from '../lib/security.js';

const router = Router();

const AGENTS = {
  'demand-prediction': runDemandPrediction,
  'supplier-evaluation': runSupplierEvaluation,
  'procurement-decision': runProcurementDecision,
  'logistics-coordination': runLogisticsCoordination,
};

// Exposes the advisor's graph shape so the dashboard can render the actual
// node/edge topology rather than a hand-drawn picture of it.
router.get('/escalation-advisor/graph', (req, res) => res.json(ADVISOR_GRAPH_SHAPE));

// The advisor is agentic, not deterministic, so it gets its own async route
// rather than joining the synchronous agent registry below.
router.post('/escalation-advisor', pipelineLimiter, validate(schemas.partId), async (req, res) => {
  const { partId } = req.body;

  try {
    const part = getPart(partId);
    const demand = runDemandPrediction(partId);
    const evaluation = runSupplierEvaluation(partId);
    const decision = runProcurementDecision(partId, { demand, evaluation });

    if (decision.status !== 'escalated') {
      return res.status(409).json({
        error: 'The advisor only runs on escalated decisions',
        status: decision.status,
        hint: 'Pick a part whose guardrails fail, e.g. one over the cost ceiling.',
      });
    }

    const result = await runEscalationAdvisor({ part, demand, evaluation, decision });
    if (!result) return res.status(503).json({ error: 'GROQ_API_KEY is not configured' });
    res.json({ decision, advisor: result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/:name', validate(schemas.partId), (req, res) => {
  const agent = AGENTS[req.params.name];
  if (!agent) {
    return res.status(404).json({ error: `Unknown agent: ${req.params.name}`, available: Object.keys(AGENTS) });
  }

  const { partId } = req.body;

  try {
    res.json(agent(partId));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
