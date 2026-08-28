import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Copy, Bookmark, BellPlus, Mail, Phone } from "lucide-react";
import { Reveal } from "../components/Reveal";
import { StatusPill } from "../components/StatusPill";
import { AppShell } from "../components/AppShell";
import { useLenis } from "../lib/useLenis";
import { part } from "../lib/mockData";

export default function PartDetail() {
  useLenis();
  const navigate = useNavigate();
  const [qty, setQty] = useState(500);
  const [leadTime, setLeadTime] = useState(14);
  const fillProbability = Math.max(20, Math.min(98, Math.round(100 - (qty / 20) + leadTime * 0.5)));

  return (
    <AppShell
      title={`Part · ${part.sku}`}
      subtitle="Operations workspace"
      actions={
        <button onClick={() => navigate("/orders")} className="btn-ghost px-4 py-2 text-sm hidden sm:flex items-center gap-2">
          <ArrowLeft size={14} /> Back to Orders
        </button>
      }
    >
      <div className="px-5 md:px-8 py-8 max-w-[1600px] mx-auto space-y-6">
        <Reveal>
          <div className="card p-6 flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-2xl">
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <h1 className="font-display text-xl font-semibold">SKU: {part.sku}</h1>
                <button className="btn-ghost px-3 py-1 text-xs flex items-center gap-1.5"><Copy size={12} /> Copy SKU</button>
                <button className="btn-primary px-3 py-1 text-xs">Contact Supplier</button>
              </div>
              <p className="text-fg/45 text-sm leading-relaxed">{part.desc}</p>
              <div className="flex flex-wrap gap-2 mt-4">
                <StatusPill tone="neutral">HSN: {part.hsn}</StatusPill>
                <StatusPill tone="rose">Criticality: {part.criticality}</StatusPill>
                <StatusPill tone="neutral">Aggregated Inventory: {part.inventory}</StatusPill>
              </div>
            </div>
            <div className="text-right">
              <div className="text-fg/40 text-xs">Last updated</div>
              <div className="text-sm mb-3">{part.updated}</div>
              <div className="flex gap-2 mb-4 justify-end">
                <button className="btn-ghost px-3 py-1.5 text-xs flex items-center gap-1.5"><Bookmark size={12} /> Bookmark</button>
                <button className="px-3 py-1.5 text-xs rounded-full bg-fg text-ink font-semibold flex items-center gap-1.5"><BellPlus size={12} /> Create Alert</button>
              </div>
              <div className="text-fg/40 text-xs">Part Lifecycle</div>
              <div className="text-mint font-semibold text-sm">{part.lifecycle}</div>
              <div className="flex gap-6 mt-4">
                <div>
                  <div className="text-fg/40 text-xs">Avg Lead Time</div>
                  <div className="font-display font-semibold">{part.avgLeadTime}</div>
                </div>
                <div>
                  <div className="text-fg/40 text-xs">Avg Price</div>
                  <div className="font-display font-semibold">{part.avgPrice}</div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left column */}
          <div className="space-y-6">
            <Reveal>
              <div className="card p-5">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-display font-semibold">Preferred Suppliers</h3>
                  <button className="text-xs text-fg/40">Manage Suppliers</button>
                </div>
                <p className="text-fg/40 text-xs mb-4">Vetted suppliers with historical performance and lead time distributions</p>
                <div className="space-y-4">
                  {part.suppliers.map((s) => (
                    <div key={s.name} className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium">{s.name}</div>
                        <div className="text-xs text-fg/40">Rating: {s.rating} · Region: {s.region}</div>
                        <div className="text-xs text-fg/30">Lead time: {s.leadTime}</div>
                      </div>
                      <div className="flex gap-2">
                        <button className="btn-ghost px-3 py-1.5 text-xs">View</button>
                        <button className="btn-primary px-3 py-1.5 text-xs">Contact</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.05}>
              <div className="card p-5">
                <div className="flex justify-between items-center mb-1">
                  <h3 className="font-display font-semibold">Price History</h3>
                  <div className="flex gap-1 text-xs">
                    {["1Y", "6M", "3M"].map((t) => (
                      <button key={t} className={`px-2 py-1 rounded-full ${t === "3M" ? "bg-fg text-ink" : "text-fg/40"}`}>{t}</button>
                    ))}
                  </div>
                </div>
                <p className="text-fg/40 text-xs mb-4">Last 12 months — high-contrast</p>
                <svg viewBox="0 0 300 70" className="w-full h-16 mb-3">
                  <polyline
                    fill="none"
                    stroke="#fff"
                    strokeWidth="1.5"
                    points="0,55 30,50 60,52 90,40 120,44 150,30 180,35 210,20 240,25 270,10 300,15"
                  />
                </svg>
                <div className="flex justify-between text-xs">
                  <span className="text-fg/40">Latest price <span className="text-fg font-medium">{part.avgPrice}</span></span>
                  <span className="text-mint">Change (3M): +4.2%</span>
                </div>
                <button className="btn-ghost w-full mt-3 py-2 text-xs">View Full History</button>
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <div className="card p-5">
                <h3 className="font-display font-semibold mb-1">MOQ &amp; Exceptions</h3>
                <p className="text-fg/40 text-xs mb-4">Standard MOQs, active exceptions, and notes</p>
                <div className="grid grid-cols-3 gap-2 text-center mb-4">
                  <div><div className="text-fg/40 text-[11px]">Standard MOQ</div><div className="font-semibold text-sm">500 units</div></div>
                  <div><div className="text-fg/40 text-[11px]">Min Buy Qty</div><div className="font-semibold text-sm">100 units</div></div>
                  <div><div className="text-fg/40 text-[11px]">Active Exceptions</div><div className="font-semibold text-sm">2 active</div></div>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between"><span>Pacific Supplies — MOQ reduced to 100</span><span className="text-fg/40">Until 09/30</span></div>
                  <div className="flex justify-between"><span>NorthStar — mix pallet allowed</span><span className="text-fg/40">Until 11/15</span></div>
                </div>
              </div>
            </Reveal>
          </div>

          {/* Middle column */}
          <div className="space-y-6">
            <Reveal delay={0.05}>
              <div className="card p-5">
                <div className="flex justify-between items-center mb-1">
                  <h3 className="font-display font-semibold">Procurement History</h3>
                  <button className="text-xs text-fg/40">Filter</button>
                </div>
                <p className="text-fg/40 text-xs mb-4">Recent purchase orders and receipts for this SKU</p>
                <div className="space-y-3">
                  {part.history.map((h) => (
                    <div key={h.po} className="flex justify-between items-center text-xs">
                      <span className="font-medium">{h.po}</span>
                      <span className="text-fg/40">{h.date}</span>
                      <span className="text-fg/40">Qty {h.qty}</span>
                      <StatusPill tone={h.status === "Received" ? "mint" : h.status === "Closed" ? "neutral" : "amber"}>{h.status}</StatusPill>
                    </div>
                  ))}
                </div>
                <button className="btn-ghost w-full mt-4 py-2 text-xs">View All POs</button>
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <div className="card p-5">
                <div className="flex justify-between items-center mb-1">
                  <h3 className="font-display font-semibold">Active Orders</h3>
                  <button className="text-xs text-fg/40">Sync</button>
                </div>
                <p className="text-fg/40 text-xs mb-4">Orders in-flight for this SKU</p>
                <div className="space-y-4">
                  {part.activeOrders.map((o) => (
                    <div key={o.po} className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-medium">{o.po}</div>
                        <div className="text-xs text-fg/40">ETA: {o.eta} · Supplier: {o.supplier}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-fg/40">Qty: {o.qty.toLocaleString()}</span>
                        <button className="btn-ghost px-3 py-1.5 text-xs">View PO</button>
                        <button className="btn-primary px-3 py-1.5 text-xs">Replenish</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.15}>
              <div className="card p-5">
                <h3 className="font-display font-semibold mb-1">Recent Activity</h3>
                <p className="text-fg/40 text-xs mb-4">Procurement notes and last actions</p>
                <div className="space-y-3 text-xs text-fg/40">
                  <div>2026-08-20 · Note: Quality incident #Q-442 logged by Warehouse Rotterdam — sample retained.</div>
                  <div>2026-08-12 · Action: MOQ exception approved for Pacific Supplies Co. (100 units).</div>
                </div>
              </div>
            </Reveal>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            <Reveal delay={0.1}>
              <div className="card p-5">
                <h3 className="font-display font-semibold mb-1">What-If Simulator</h3>
                <p className="text-fg/40 text-xs mb-4">Simulate order qty vs. fill probability</p>
                <label className="text-xs text-fg/40 block mb-1">Order Quantity</label>
                <input
                  type="number"
                  value={qty}
                  onChange={(e) => setQty(Number(e.target.value) || 0)}
                  className="field w-full px-3 py-2 text-sm outline-none mb-3"
                />
                <label className="text-xs text-fg/40 block mb-1">Expected Lead Time (days)</label>
                <input
                  type="number"
                  value={leadTime}
                  onChange={(e) => setLeadTime(Number(e.target.value) || 0)}
                  className="field w-full px-3 py-2 text-sm outline-none mb-4"
                />
                <div className="text-xs text-fg/40 mb-1">Fill Probability</div>
                <div className="font-display text-lg font-semibold mb-4">Estimated fill probability: {fillProbability}%</div>
                <button className="btn-primary w-full py-2.5 text-sm mb-2">Run Simulation</button>
                <button className="btn-ghost w-full py-2.5 text-sm">Save Scenario</button>
              </div>
            </Reveal>

            <Reveal delay={0.15}>
              <div className="card p-5">
                <h3 className="font-display font-semibold mb-3">Quick Actions</h3>
                <div className="space-y-2">
                  <button className="btn-primary w-full py-2.5 text-sm">Create PO</button>
                  <button className="btn-ghost w-full py-2.5 text-sm">Email Suppliers</button>
                  <button className="btn-ghost w-full py-2.5 text-sm">Add to Watchlist</button>
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.2}>
              <div className="card p-5">
                <h3 className="font-display font-semibold mb-3">Contacts</h3>
                <div className="space-y-3">
                  {[
                    { name: "Lina Park", role: "Supplier Relations · NorthStar" },
                    { name: "Marco Iglesias", role: "Account Manager · Pacific Supplies" },
                  ].map((c) => (
                    <div key={c.name} className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">{c.name}</div>
                        <div className="text-xs text-fg/40">{c.role}</div>
                      </div>
                      <div className="flex gap-2">
                        <button className="btn-ghost h-8 w-8 grid place-items-center"><Phone size={12} /></button>
                        <button className="btn-ghost h-8 w-8 grid place-items-center"><Mail size={12} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
