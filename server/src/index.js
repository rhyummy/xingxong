import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

// Resolve .env against the server package, not the process cwd, so the app
// behaves the same whether started from the repo root or from server/.
dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env') });

const express = (await import('express')).default;
const cors = (await import('cors')).default;
// Namespace import, not destructured: `source` is reassigned by loadCatalog()
// and destructuring would freeze it at its initial value.
const catalog = await import('./data/index.js');
const { default: partsRouter } = await import('./routes/parts.js');
const { default: agentsRouter } = await import('./routes/agents.js');
const { default: pipelineRouter } = await import('./routes/pipeline.js');
const { default: recordsRouter } = await import('./routes/records.js');
const { corsOptions, readLimiter, errorHandler } = await import('./lib/security.js');

await catalog.loadCatalog();

const app = express();
app.use(cors(corsOptions()));
app.use(express.json({ limit: '100kb' }));
app.use(readLimiter);

if (!process.env.APPROVAL_SECRET) {
  console.warn(
    'APPROVAL_SECRET is not set — purchase-order approval endpoints are UNAUTHENTICATED.'
  );
}

app.get('/api/health', (req, res) => res.json({ ok: true, catalogSource: catalog.source }));
app.use('/api/parts', partsRouter);
app.use('/api/agents', agentsRouter);
app.use('/api/pipeline', pipelineRouter);
app.use('/api', recordsRouter);

// Must be registered after every route.
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`SupplyChain Sentinel API listening on http://localhost:${PORT}`);
});
