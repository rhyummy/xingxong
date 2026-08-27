import { Router } from 'express';
import { listRuns, listPurchaseOrders, setPurchaseOrderStatus } from '../lib/auditLog.js';

const router = Router();

router.get('/runs', async (req, res) => {
  try {
    res.json(await listRuns(Number(req.query.limit) || 20));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/purchase-orders', async (req, res) => {
  try {
    res.json(await listPurchaseOrders(Number(req.query.limit) || 50));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const ALLOWED_STATUSES = ['issued', 'pending-approval', 'approved', 'rejected'];

router.patch('/purchase-orders/:id', async (req, res) => {
  const { status, approvedBy } = req.body ?? {};
  if (!ALLOWED_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${ALLOWED_STATUSES.join(', ')}` });
  }
  try {
    res.json(await setPurchaseOrderStatus(req.params.id, status, approvedBy));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
