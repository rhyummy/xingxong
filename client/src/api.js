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
    const detail = body.details?.map((d) => `${d.field}: ${d.problem}`).join('; ');
    throw new Error(detail ? `${body.error} — ${detail}` : body.error || 'Request failed');
  }
  return body;
}

const post = (body) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export const fetchHealth = () => request('/api/health');
export const fetchParts = () => request('/api/parts');
export const fetchStats = () => request('/api/parts/-/stats');
export const fetchPart = (id) => request(`/api/parts/${encodeURIComponent(id)}`);

export const runPipeline = (partId) => request('/api/pipeline/run', post({ partId }));
export const runAgent = (name, partId) => request(`/api/agents/${name}`, post({ partId }));
export const runAdvisor = (partId) => request('/api/agents/escalation-advisor', post({ partId }));
export const fetchAdvisorGraph = () => request('/api/agents/escalation-advisor/graph');

export const fetchRuns = (limit = 50) => request(`/api/runs?limit=${limit}`);
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
