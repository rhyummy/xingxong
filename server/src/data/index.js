import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { supabase, supabaseEnabled } from '../lib/supabase.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadJSON(filename) {
  return JSON.parse(readFileSync(path.join(__dirname, filename), 'utf-8'));
}

// The catalog is read on every agent run, so it's cached in memory and the
// agents stay synchronous. `let` exports are live bindings — importers see
// these swap in once loadCatalog() resolves.
export let parts = [];
export let usageHistory = {};
export let suppliersByPart = {};
export let source = 'none';

function loadFromFiles() {
  parts = loadJSON('parts.json');
  usageHistory = loadJSON('usage.json');
  suppliersByPart = loadJSON('suppliers.json');
  source = 'local-json';
}

/**
 * PostgREST caps every response at 1000 rows regardless of how many match, so
 * anything that can exceed that (usage_history is 90 days x 40 parts) has to
 * be paged explicitly. Silently truncated history would corrupt the baseline
 * the anomaly detector compares against.
 */
async function fetchAll(table, orderBy = []) {
  const PAGE = 1000;
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    // Order must be total, not just by date: thousands of rows share a date,
    // and ties can be returned in a different order per page, interleaving
    // parts' histories.
    let query = supabase.from(table).select('*').range(from, from + PAGE - 1);
    for (const col of orderBy) query = query.order(col);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    rows.push(...data);
    if (data.length < PAGE) return rows;
  }
}

async function loadFromSupabase() {
  const [partsRes, suppliersRes, linksRes, usageRows] = await Promise.all([
    supabase.from('parts').select('*').order('id'),
    supabase.from('suppliers').select('*'),
    supabase.from('part_suppliers').select('*'),
    fetchAll('usage_history', ['part_id', 'usage_date']),
  ]);

  for (const res of [partsRes, suppliersRes, linksRes]) {
    if (res.error) throw new Error(res.error.message);
  }

  if (!partsRes.data?.length) {
    throw new Error('Supabase has no parts — run `npm run seed -w server` first');
  }

  parts = partsRes.data.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    currentStock: p.current_stock,
    reorderThreshold: p.reorder_threshold,
    unitCost: Number(p.unit_cost),
    criticality: p.criticality,
  }));

  const supplierById = new Map(suppliersRes.data.map((s) => [s.id, s]));

  suppliersByPart = {};
  for (const link of linksRes.data) {
    const s = supplierById.get(link.supplier_id);
    if (!s) continue;
    (suppliersByPart[link.part_id] ??= []).push({
      id: s.id,
      name: s.name,
      region: s.region,
      reliabilityScore: s.reliability_score,
      defectRatePct: Number(s.defect_rate_pct),
      price: Number(link.price),
      leadTimeDays: link.lead_time_days,
    });
  }

  usageHistory = {};
  for (const row of usageRows) {
    (usageHistory[row.part_id] ??= []).push(row.units_used);
  }

  source = 'supabase';
}

export async function loadCatalog() {
  if (supabaseEnabled) {
    try {
      await loadFromSupabase();
      console.log(`Catalog loaded from Supabase: ${parts.length} parts`);
      return source;
    } catch (err) {
      console.error(`Supabase load failed (${err.message}) — falling back to local JSON`);
    }
  }

  loadFromFiles();
  console.log(`Catalog loaded from local JSON: ${parts.length} parts`);
  return source;
}

export function getPart(partId) {
  const part = parts.find((p) => p.id === partId);
  if (!part) throw new Error(`Unknown part id: ${partId}`);
  return part;
}
