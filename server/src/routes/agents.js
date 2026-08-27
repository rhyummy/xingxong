import { Router } from 'express';
import { runDemandPrediction } from '../agents/demandPrediction.js';
import { runSupplierEvaluation } from '../agents/supplierEvaluation.js';
import { runProcurementDecision } from '../agents/procurementDecision.js';
import { runLogisticsCoordination } from '../agents/logisticsCoordination.js';

const router = Router();

const AGENTS = {
  'demand-prediction': runDemandPrediction,
  'supplier-evaluation': runSupplierEvaluation,
  'procurement-decision': runProcurementDecision,
  'logistics-coordination': runLogisticsCoordination,
};

router.post('/:name', (req, res) => {
  const agent = AGENTS[req.params.name];
  if (!agent) {
    return res.status(404).json({ error: `Unknown agent: ${req.params.name}`, available: Object.keys(AGENTS) });
  }

  const { partId } = req.body ?? {};
  if (!partId) return res.status(400).json({ error: 'partId is required' });

  try {
    res.json(agent(partId));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
