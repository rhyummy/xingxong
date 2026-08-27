import { Router } from 'express';
import { runPipeline } from '../orchestrator.js';
import { schemas, validate, pipelineLimiter } from '../lib/security.js';

const router = Router();

router.post('/run', pipelineLimiter, validate(schemas.partId), async (req, res) => {
  const { partId } = req.body;

  try {
    res.json(await runPipeline(partId));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
