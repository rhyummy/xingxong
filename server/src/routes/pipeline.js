import { Router } from 'express';
import { runPipeline } from '../orchestrator.js';

const router = Router();

router.post('/run', async (req, res) => {
  const { partId } = req.body ?? {};
  if (!partId) return res.status(400).json({ error: 'partId is required' });

  try {
    res.json(await runPipeline(partId));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
