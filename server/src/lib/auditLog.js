import { supabase } from './supabase.js';

/**
 * Persists a completed pipeline run and, when a PO was generated, the order
 * itself. Audit logging must never break the demo, so failures are logged and
 * swallowed rather than thrown.
 */
export async function recordRun({ part, steps, summary, advisor = null }) {
  if (!supabase) return null;

  const [demand, , decision, logistics] = steps;

  const row = {
    part_id: part.id,
    status: decision.status,
    predicted_quantity: decision.quantity ?? null,
    order_value: decision.totalCost ?? null,
    anomaly_detected: demand.anomalyDetected,
    failed_guardrails: decision.failedGuardrails,
    selected_supplier: decision.supplier?.id ?? null,
    logistics_status: logistics.status,
    steps,
    summary,
    advisor,
  };

  try {
    let { data: run, error: runError } = await supabase
      .from('pipeline_runs')
      .insert(row)
      .select('id')
      .single();

    // If the advisor migration has not been applied yet, log the run without
    // it rather than losing the whole audit record over one optional column.
    if (runError && /advisor/.test(runError.message)) {
      console.warn('pipeline_runs.advisor missing — apply supabase/migrations/001_advisor.sql');
      const { advisor: _omitted, ...withoutAdvisor } = row;
      ({ data: run, error: runError } = await supabase
        .from('pipeline_runs')
        .insert(withoutAdvisor)
        .select('id')
        .single());
    }

    if (runError) throw new Error(runError.message);

    if (decision.supplier) {
      const { error: poError } = await supabase.from('purchase_orders').upsert(
        {
          id: decision.poNumber ?? `REQ-${run.id.slice(0, 8)}`,
          run_id: run.id,
          part_id: part.id,
          supplier_id: decision.supplier.id,
          quantity: decision.quantity,
          unit_price: decision.supplier.price,
          total_cost: decision.totalCost,
          status: decision.status === 'auto-approved' ? 'issued' : 'pending-approval',
        },
        { onConflict: 'id' }
      );
      if (poError) throw new Error(poError.message);
    }

    return run.id;
  } catch (err) {
    console.error('Audit log write failed:', err.message);
    return null;
  }
}

export async function listRuns(limit = 20) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('pipeline_runs')
    .select('id, part_id, status, order_value, anomaly_detected, failed_guardrails, logistics_status, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data;
}

export async function listPurchaseOrders(limit = 50) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('purchase_orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data;
}

export async function setPurchaseOrderStatus(id, status, approvedBy) {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase
    .from('purchase_orders')
    .update({ status, approved_by: approvedBy ?? null, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

/**
 * The supplier and unit price used the last time this part was ordered.
 * This is the only honest baseline available for cost comparison — comparing
 * against the most expensive vendor on file flatters the number and reports
 * zero savings precisely when the agent picked the best option.
 * Returns null when the part has no order history yet.
 */
export async function getPreviousOrder(partId) {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('purchase_orders')
    .select('supplier_id, unit_price, created_at')
    .eq('part_id', partId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error || !data?.length) return null;
  return { supplierId: data[0].supplier_id, unitPrice: Number(data[0].unit_price) };
}
