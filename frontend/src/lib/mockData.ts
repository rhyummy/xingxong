// Central mock dataset. Every page reads from here first; when the backend
// on :4000 responds, `useApi()` swaps the live payload in with no code
// changes required in the pages themselves.

export const workspaces = [
  { id: "horizon", name: "Horizon Manufacturing Plant", meta: "Block A3 — Springfield, IL", tz: "CST", status: "Online" as const },
  { id: "riverview", name: "Riverview Distribution Center", meta: "Dock 7 — Riverview, NJ", tz: "EST", status: "Maintenance" as const },
  { id: "northridge", name: "North Ridge Assembly Site", meta: "Lot 2 — North Ridge, WA", tz: "PST", status: "Restricted" as const },
  { id: "coastal", name: "Coastal Packaging Hub", meta: "Harbor Rd — Monterey, CA", tz: "PST", status: "Offline" as const },
];

export const kpis = [
  { label: "Inventory Health", value: "98.4%", sub: "Stock levels within tolerance" },
  { label: "Fill Rate", value: "92.1%", sub: "Orders fulfilled on first pass" },
  { label: "Pending Approvals", value: "14", sub: "Awaiting manager sign-off" },
  { label: "Throughput (1h)", value: "1,248 reqs", sub: "Autonomous agents processed" },
];

export const liveFeed = [
  { tag: "ACK", actor: "Agent", part: "PART-9931-X", desc: "Hex screw, M6 x 12", qty: 320, eta: "00:18:00", status: "Inbound", supplier: "NovaParts", score: 97 },
  { tag: "NEW", actor: "Requisition", part: "PART-2247-B", desc: "Filter assembly, inline", qty: 48, eta: "02:30:00", status: "Scheduled", supplier: "CoreBind", score: 82 },
  { tag: "ACK", actor: "Agent", part: "PART-4002-Z", desc: "Seal ring, nitrile", qty: 1200, eta: "00:04:20", status: "Routed", supplier: "VelaTech", score: 91 },
  { tag: "HOLD", actor: "Auto-Check", part: "PART-0145-Q", desc: "Circuit board, A7 revision", qty: 12, eta: "08:10:00", status: "Pending QA", supplier: "ElectraSys", score: 44 },
];

export const alerts = [
  { tone: "amber" as const, title: "Inbound delay: NovaParts", detail: "ETA slipped by 22 minutes for shipment #NX-9931" },
  { tone: "mint" as const, title: "Supplier handshake recovered", detail: "CoreBind connection re-established at 13:35" },
  { tone: "amber" as const, title: "Approval backlog high", detail: "14 approvals pending beyond SLA" },
];

export const supplierConnections = [
  { name: "CoreBind", status: "Stable", tone: "mint" as const },
  { name: "NovaParts", status: "Degraded", tone: "amber" as const },
  { name: "ElectraSys", status: "Latency high", tone: "rose" as const },
];

export const taskQueue = {
  critical: [
    { id: "TASK-2026-114", po: "PO-778451", priority: "P1", eta: "2026-08-26", sla: "SLA 6h", supplier: "Norion Systems", risk: "Stockout risk", ltVariance: "+4d", created: "2026-08-25 09:12", updated: "02:10 ago" },
    { id: "TASK-2026-120", po: "PO-778462", priority: "P1", eta: "2026-08-27", supplier: "Axiom Components", ltVariance: "-1d", created: "2026-08-24 15:03", note: "Manually reordered" },
    { id: "TASK-2026-135", po: "PO-778499", priority: "P2", eta: "2026-08-29", supplier: "Meridian Tools", ltVariance: "+2d" },
  ],
  high: [
    { id: "TASK-2026-201", po: "PO-779001", priority: "P2", eta: "2026-08-30", ltVariance: "0d" },
    { id: "TASK-2026-209", po: "PO-779020", priority: "P3", eta: "2026-09-01", ltVariance: "-2d" },
  ],
};

export const taskDetail = {
  id: "TASK-2026-114",
  po: "PO-778451",
  supplier: "Norion Systems",
  priority: "P1",
  assignee: "Marta Ruiz",
  sla: "SLA 6h",
  eta: "2026-08-26",
  decisions: [
    { icon: "user", title: "Marta Ruiz approved reroute proposal", meta: "Reroute to supplier: Meridian Tools", time: "2026-08-25 10:14" },
    { icon: "bot", title: "Auto-check: stockout risk flagged", time: "2026-08-25 09:20" },
    { icon: "clock", title: "SLA countdown started", time: "2026-08-25 09:12" },
  ],
  comms: [
    { author: "Marta", text: "We recommend rerouting 200 units to Meridian to avoid stockout. ETA impact: +2 days.", time: "2026-08-25 10:14" },
    { author: "Norion Systems", text: "We can expedite 50 units for immediate pickup. Documents attached.", time: "2026-08-25 09:58" },
    { author: "Marta", text: "Creating exception for expedited dispatch and tagging for audit.", time: "2026-08-25 10:20" },
  ],
  attachments: [
    { name: "INV-9987.pdf", meta: "Invoice from Norion Systems", date: "2026-08-24" },
    { name: "CERT-A4-223.pdf", meta: "Quality certificate", date: "2026-07-30" },
  ],
};

export const part = {
  sku: "AX-4521-PL",
  desc: "Precision stainless steel bearing — 12mm ID, corrosion-resistant, tolerance ±0.02mm. Suitable for conveyor rollers, rated for continuous operation at 120°C.",
  hsn: "8708.70",
  criticality: "High",
  inventory: "1,280 units across 6 sites",
  updated: "2026-08-25 09:12 UTC",
  lifecycle: "Active",
  avgLeadTime: "14 days",
  avgPrice: "$3.42 / unit",
  suppliers: [
    { name: "NorthStar Components", region: "EU", rating: 4.7, leadTime: "10–16 days" },
    { name: "Pacific Supplies Co.", region: "APAC", rating: 4.4, leadTime: "12–20 days" },
    { name: "Precision Alloy Ltd.", region: "NA", rating: 4.2, leadTime: "8–12 days" },
    { name: "Eastern Metals Group", region: "EMEA", rating: 3.9, leadTime: "14–30 days" },
  ],
  history: [
    { po: "PO-2026-341", date: "2026-07-02", qty: 1000, status: "Received" },
    { po: "PO-2026-289", date: "2026-06-15", qty: 500, status: "Partially Received" },
    { po: "PO-2026-201", date: "2026-05-10", qty: 2000, status: "Open" },
    { po: "PO-2025-998", date: "2025-12-01", qty: 750, status: "Closed" },
  ],
  activeOrders: [
    { po: "PO-2026-201", eta: "2026-09-05", supplier: "Precision Alloy Ltd.", qty: 2000 },
    { po: "PO-2026-289", eta: "2026-08-30", supplier: "Pacific Supplies Co.", qty: 500 },
    { po: "PO-2026-341", eta: "Delivered", supplier: "NorthStar Components", qty: 1000 },
  ],
  performance: { onTime: "93%", target: "95%", incidents: 4, severity: "Low" },
};

export const orderLines = [
  { sku: "AXT-4512", name: "AXT-4512 Stainless Bolt", mfg: "Veda Components", qty: 200, unit: "Nos", unitPrice: 18, deliv: "08 Sep – 12 Sep 2026" },
  { sku: "PRT-220", name: "PRT-220 Hydraulic Seal", mfg: "Kiran Sealworks", qty: 50, unit: "Nos", unitPrice: 420, deliv: "10 Sep – 14 Sep 2026" },
  { sku: "FLT-908", name: "FLT-908 Conveyor Roller", mfg: "Nova Systems", qty: 10, unit: "Nos", unitPrice: 2200, deliv: "15 Sep – 20 Sep 2026" },
];

export const approvers = [
  { name: "Rohit Menon", role: "Head of Procurement", status: "Approved", meta: "21 Aug 2026" },
  { name: "Priya Desai", role: "Finance Controller", status: "Pending" },
  { name: "Amit Rao", role: "Quality Assurance", status: "Delegated · Pending", delegated: true },
  { name: "Nivedita Kapoor", role: "Compliance Lead", status: "Pending Approval" },
];

export const auditTrail = [
  { title: "Order created by Maya Iyer", meta: "22 Aug 2026 · 09:12 AM", status: "Draft" },
  { title: "Rohit Menon approved", meta: "21 Aug 2026 · 04:40 PM", status: "Approved" },
  { title: "Priya Desai requested clarification", meta: "22 Aug 2026 · 10:02 AM", status: "Comment" },
];
