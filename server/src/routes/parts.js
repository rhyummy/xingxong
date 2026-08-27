import { Router } from 'express';
import { parts, suppliersByPart } from '../data/index.js';

const router = Router();

router.get('/', (req, res) => {
  res.json(
    parts.map((p) => ({
      ...p,
      supplierCount: (suppliersByPart[p.id] || []).length,
      triggerReady: p.currentStock < p.reorderThreshold,
    }))
  );
});

export default router;
