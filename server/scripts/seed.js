// Generates the synthetic dataset and pushes it into Supabase.
// Usage: npm run seed -w server

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env') });

const { requireSupabase } = await import('../src/lib/supabase.js');
const { generateDataset } = await import('./generateDataset.js');

const db = requireSupabase();
const { parts, suppliers, partSuppliers, usage, days } = generateDataset();

// Dates run backwards from today so "recent usage" always means recent.
function dateForDayIndex(i) {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - (days - 1 - i));
  return d.toISOString().slice(0, 10);
}

async function upsert(table, rows, conflict) {
  // Chunked: usage_history alone is several thousand rows.
  const CHUNK = 500;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const { error } = await db.from(table).upsert(rows.slice(i, i + CHUNK), { onConflict: conflict });
    if (error) throw new Error(`${table}: ${error.message}`);
  }
  console.log(`  ${table}: ${rows.length} rows`);
}

console.log('Seeding Supabase…');

// Clear transactional tables so reseeding doesn't accumulate stale runs.
await db.from('purchase_orders').delete().neq('id', '');
await db.from('pipeline_runs').delete().neq('part_id', '');

await upsert(
  'suppliers',
  suppliers.map((s) => ({
    id: s.id,
    name: s.name,
    region: s.region,
    reliability_score: s.reliabilityScore,
    defect_rate_pct: s.defectRatePct,
  })),
  'id'
);

await upsert(
  'parts',
  parts.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    current_stock: p.currentStock,
    reorder_threshold: p.reorderThreshold,
    unit_cost: p.unitCost,
    criticality: p.criticality,
  })),
  'id'
);

await upsert(
  'part_suppliers',
  partSuppliers.map((ps) => ({
    part_id: ps.partId,
    supplier_id: ps.supplierId,
    price: ps.price,
    lead_time_days: ps.leadTimeDays,
  })),
  'part_id,supplier_id'
);

const usageRows = [];
for (const [partId, series] of Object.entries(usage)) {
  series.forEach((units, i) => {
    usageRows.push({ part_id: partId, usage_date: dateForDayIndex(i), units_used: units });
  });
}
await upsert('usage_history', usageRows, 'part_id,usage_date');

const lowStock = parts.filter((p) => p.currentStock < p.reorderThreshold).length;
const singleSourced = parts.filter(
  (p) => partSuppliers.filter((ps) => ps.partId === p.id).length === 1
).length;

console.log(
  `\nDone. ${parts.length} parts (${lowStock} below reorder point, ${singleSourced} single-sourced), ` +
    `${suppliers.length} suppliers, ${usageRows.length} usage records over ${days} days.`
);
