import { Router } from 'express';
import { listRuns, getRun, listPurchaseOrders, setPurchaseOrderStatus } from '../lib/auditLog.js';
import { schemas, validate, writeLimiter, requireApprovalSecret } from '../lib/security.js';

const router = Router();

router.get('/runs', validate(schemas.listQuery, 'query'), async (req, res) => {
  try {
    res.json(await listRuns(req.validatedQuery.limit));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/runs/:id', async (req, res) => {
  try {
    const run = await getRun(req.params.id);
    if (!run) return res.status(404).json({ error: 'Run not found' });
    res.json(run);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/purchase-orders', validate(schemas.listQuery, 'query'), async (req, res) => {
  try {
    res.json(await listPurchaseOrders(req.validatedQuery.limit));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Changing PO state is the only action here that commits money, so it carries
// the shared-secret gate and the tightest rate limit.
router.patch(
  '/purchase-orders/:id',
  writeLimiter,
  requireApprovalSecret,
  validate(schemas.poStatus),
  async (req, res) => {
  const { status, approvedBy } = req.body;
  try {
    res.json(await setPurchaseOrderStatus(req.params.id, status, approvedBy));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
  }
);

export default router;
