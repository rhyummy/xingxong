// Set VITE_APPROVAL_SECRET to match the server's APPROVAL_SECRET when the
// approval endpoints are gated. Left unset for local demos, where the server
// runs open and warns about it at startup.
const APPROVAL_SECRET = import.meta.env.VITE_APPROVAL_SECRET;

async function request(path, options) {
  const res = await fetch(path, options);

  let body;
  try {
    body = await res.json();
  } catch {
    throw new Error(`${res.status} ${res.statusText}`);
  }

  if (!res.ok) {
    // Validation failures carry per-field detail worth surfacing.
    const detail = body.details?.map((d) => `${d.field}: ${d.problem}`).join('; ');
    throw new Error(detail ? `${body.error} — ${detail}` : body.error || 'Request failed');
  }
  return body;
}

const json = (body) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export const fetchParts = () => request('/api/parts');

export const runPipeline = (partId) => request('/api/pipeline/run', json({ partId }));

export const fetchRuns = (limit = 25) => request(`/api/runs?limit=${limit}`);

export const fetchRun = (id) => request(`/api/runs/${encodeURIComponent(id)}`);

export const fetchPurchaseOrders = (limit = 50) => request(`/api/purchase-orders?limit=${limit}`);

export function setPurchaseOrderStatus(id, status, approvedBy) {
  return request(`/api/purchase-orders/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(APPROVAL_SECRET ? { 'x-approval-secret': APPROVAL_SECRET } : {}),
    },
    body: JSON.stringify({ status, approvedBy }),
  });
}
