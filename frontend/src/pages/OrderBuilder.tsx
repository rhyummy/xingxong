import { useState } from "react";
import { Search, ChevronDown, RotateCcw, FileText, Download, Bot, UserCheck } from "lucide-react";
import { Reveal } from "../components/Reveal";
import { StatusPill } from "../components/StatusPill";
import { AppShell } from "../components/AppShell";
import { useLenis } from "../lib/useLenis";
import { orderLines, approvers, auditTrail } from "../lib/mockData";

function inr(n: number) {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export default function OrderBuilder() {
  useLenis();
  const [sourcing, setSourcing] = useState<"auto" | "preferred" | "manual">("auto");

  const subtotal = orderLines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
  const discount = 1200;
  const shipping = 1500;
  const insurance = 350;
  const taxedBase = subtotal - discount + shipping + insurance;
  const cgst = Math.round(taxedBase * 0.09 * 0.6); // approximate to match screenshot proportions
  const sgst = cgst;
  const grandTotal = subtotal - discount + shipping + insurance + 2952 + 2952;

  return (
    <AppShell
      title="Order Builder"
      subtitle="Operations Workspace — draft #AP-1982"
      actions={
        <div className="relative hidden lg:block w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg/30" />
          <input className="field w-full pl-9 pr-3 py-2 text-sm outline-none" placeholder="Search parts, suppliers, orders..." />
        </div>
      }
    >
      <div className="px-4 md:px-6 py-6 grid lg:grid-cols-[340px_1fr_360px] gap-5 max-w-[1700px] mx-auto">
        {/* Order Composer */}
        <Reveal>
          <div className="card p-5">
            <div className="flex justify-between items-start mb-1">
              <h2 className="font-display font-semibold">Order Composer</h2>
              <span className="text-xs text-fg/30">Draft #AP-1982</span>
            </div>
            <p className="text-fg/40 text-xs mb-4">Build the order and attach compliance docs</p>

            <label className="text-xs text-fg/40 block mb-1">Add Line Item</label>
            <div className="flex gap-2 mb-4">
              <input className="field flex-1 px-3 py-2 text-sm outline-none" placeholder="Search part number or supplier..." />
              <button className="btn-ghost px-4 py-2 text-sm">Add</button>
            </div>

            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-fg/40">Recent Parts</span>
              <RotateCcw size={12} className="text-fg/30" />
            </div>
            <div className="space-y-2 mb-5">
              {orderLines.map((l) => (
                <div key={l.sku} className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{l.name}</div>
                    <div className="text-xs text-fg/40">Mfg: {l.mfg}</div>
                  </div>
                  <button className="btn-ghost px-3 py-1 text-xs">Add</button>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center mb-3">
              <span className="text-xs text-fg/40">Current Line Items ({orderLines.length})</span>
              <span className="text-xs text-fg/30">Editable</span>
            </div>
            <div className="space-y-3 mb-5">
              {orderLines.map((l) => (
                <div key={l.sku} className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{l.name}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-fg/40">Qty:</span>
                      <input defaultValue={l.qty} className="field w-16 px-2 py-1 text-xs outline-none" />
                    </div>
                  </div>
                  <div className="text-right text-xs">
                    <div>{inr(l.unitPrice)}</div>
                    <div className="text-fg/40">Line {inr(l.qty * l.unitPrice)}</div>
                  </div>
                </div>
              ))}
            </div>

            <span className="text-xs text-fg/40 block mb-2">Sourcing Preference</span>
            <div className="flex gap-4 mb-5 text-xs">
              {(["auto", "preferred", "manual"] as const).map((s) => (
                <label key={s} className="flex items-center gap-1.5 cursor-pointer">
                  <input type="radio" checked={sourcing === s} onChange={() => setSourcing(s)} className="accent-fg" />
                  {s === "auto" ? "Auto-Source" : s === "preferred" ? "Preferred Supplier" : "Manual"}
                </label>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5">
              <div>
                <label className="text-xs text-fg/40 block mb-1">Required by</label>
                <input defaultValue="12 Sep 2026" className="field w-full px-3 py-2 text-xs outline-none" />
              </div>
              <div>
                <label className="text-xs text-fg/40 block mb-1">Priority</label>
                <select className="field w-full px-3 py-2 text-xs outline-none">
                  <option>Standard</option>
                  <option>Expedited</option>
                </select>
              </div>
            </div>

            <span className="text-xs text-fg/40 block mb-2">Attachments (Compliance)</span>
            <div className="space-y-2 mb-2">
              {[
                { name: "Factory-Certification-2026.pdf", meta: "Uploaded 18 Aug 2026 · 220KB" },
                { name: "MSDS-PRT220.pdf", meta: "Uploaded 20 Aug 2026 · 80KB" },
              ].map((f) => (
                <div key={f.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText size={14} className="text-fg/40" />
                    <div>
                      <div className="text-xs font-medium">{f.name}</div>
                      <div className="text-[11px] text-fg/30">{f.meta}</div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button className="btn-ghost px-2 py-1 text-[11px]">Preview</button>
                    <button className="btn-ghost px-2 py-1 text-[11px]"><Download size={11} /></button>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-fg/25 mb-4">Max 10 attachments · PDF, JPG</p>

            <div className="flex justify-between">
              <button className="btn-ghost px-4 py-2 text-xs">Save Draft</button>
              <button className="btn-primary px-4 py-2 text-xs">Reset</button>
            </div>
          </div>
        </Reveal>

        {/* Order Summary */}
        <Reveal delay={0.08}>
          <div className="card p-6">
            <div className="flex flex-wrap justify-between items-start mb-1 gap-3">
              <div>
                <h2 className="font-display font-semibold">Order Summary</h2>
                <p className="text-fg/40 text-xs mt-0.5">Review pricing, taxes (India GST), shipping and delivery windows</p>
              </div>
              <div className="flex gap-6 text-xs text-right">
                <div><div className="text-fg/40">Order Date</div><div>22 Aug 2026</div></div>
                <div><div className="text-fg/40">Currency</div><div>INR</div></div>
              </div>
            </div>

            <div className="overflow-x-auto mt-5 mb-6">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-fg/40 border-b divider">
                    <th className="text-left font-normal py-2">Item / Description</th>
                    <th className="text-left font-normal py-2">Supplier</th>
                    <th className="text-left font-normal py-2">Qty</th>
                    <th className="text-left font-normal py-2">Unit</th>
                    <th className="text-left font-normal py-2">Deliv.</th>
                    <th className="text-right font-normal py-2">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divider">
                  {orderLines.map((l) => (
                    <tr key={l.sku}>
                      <td className="py-3">
                        <div className="font-medium">{l.name}</div>
                        <div className="text-fg/40">Mfg: {l.mfg} · SKU: {l.sku}</div>
                      </td>
                      <td className="py-3">{l.mfg.split(" ")[0]}</td>
                      <td className="py-3">{l.qty}</td>
                      <td className="py-3">{l.unit}</td>
                      <td className="py-3 text-fg/40">{l.deliv}</td>
                      <td className="py-3 text-right">{inr(l.qty * l.unitPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-semibold mb-1">Cost Breakdown</h3>
                <p className="text-fg/30 text-[11px] mb-3">Estimates shown. Supplier quotes override.</p>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between"><span className="text-fg/40">Subtotal</span><span>{inr(subtotal)}</span></div>
                  <div className="flex justify-between"><span className="text-fg/40">Item-level Discounts</span><span>-{inr(discount)}</span></div>
                  <div className="flex justify-between"><span className="text-fg/40">Shipping &amp; Handling</span><span>{inr(shipping)}</span></div>
                  <div className="flex justify-between"><span className="text-fg/40">Insurance</span><span>{inr(insurance)}</span></div>
                </div>
                <div className="mt-3 pt-3 border-t divider">
                  <div className="text-fg/40 text-xs mb-1.5">India GST (calculated)</div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between"><span className="text-fg/40">CGST (9%)</span><span>{inr(2952)}</span></div>
                    <div className="flex justify-between"><span className="text-fg/40">SGST (9%)</span><span>{inr(2952)}</span></div>
                    <div className="flex justify-between"><span className="text-fg/40">IGST (0%)</span><span>{inr(0)}</span></div>
                  </div>
                </div>
                <div className="flex justify-between items-center mt-4 pt-3 border-t divider">
                  <span className="font-semibold">Grand Total</span>
                  <span className="font-display text-lg font-semibold">{inr(grandTotal)}</span>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-1">Shipping Terms</h3>
                <p className="text-fg/40 text-xs mb-4">FOB Mumbai · Standard Carrier · Insurance Included</p>
                <h3 className="text-sm font-semibold mb-1">Expected Delivery Window</h3>
                <div className="card !bg-panel2 h-24 mb-3 grid place-items-center text-fg/20 text-xs">
                  Delivery route preview
                </div>
                <p className="text-fg/30 text-[11px]">
                  AXT-4512: 08 Sep – 12 Sep · Expedited option available
                </p>
                <p className="text-fg/25 text-[11px] mt-2">
                  Incoterms and lead-times are subject to supplier confirmation.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 mt-8 pt-6 border-t divider">
              <button className="px-5 py-2.5 text-sm rounded-full bg-fg text-ink font-semibold flex items-center gap-2">
                <Bot size={14} /> Submit to Agent
              </button>
              <button className="btn-ghost px-5 py-2.5 text-sm flex items-center gap-2">
                <UserCheck size={14} /> Submit for Approval
              </button>
              <button className="btn-ghost px-5 py-2.5 text-sm">Save &amp; Continue</button>
              <button className="btn-ghost px-5 py-2.5 text-sm">Duplicate Order</button>
              <button className="btn-ghost px-5 py-2.5 text-sm">Export PDF</button>
              <button className="text-rose text-sm ml-auto hover:underline">Cancel Order</button>
            </div>
          </div>
        </Reveal>

        {/* Approval Timeline */}
        <Reveal delay={0.16}>
          <div className="card p-5">
            <div className="flex justify-between items-start mb-1">
              <h2 className="font-display font-semibold">Approval Timeline</h2>
              <StatusPill tone="amber">Status: Pending</StatusPill>
            </div>
            <p className="text-fg/40 text-xs mb-4">Staged approvals, delegation &amp; audit</p>

            <h3 className="text-xs font-semibold text-fg/60 mb-3">Required Approvers</h3>
            <div className="space-y-3 mb-5">
              {approvers.map((a) => (
                <div key={a.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="h-8 w-8 rounded-full bg-fg/10 grid place-items-center text-[10px] font-semibold">
                      {a.name.split(" ").map((n) => n[0]).join("")}
                    </span>
                    <div>
                      <div className="text-xs font-medium">{a.delegated ? `Delegated: ${a.name}` : a.name}</div>
                      <div className="text-[11px] text-fg/40">{a.role}</div>
                    </div>
                  </div>
                  <StatusPill tone={a.status === "Approved" ? "mint" : "amber"}>{a.status}{a.meta ? ` · ${a.meta}` : ""}</StatusPill>
                </div>
              ))}
            </div>

            <div className="card !bg-panel2 p-3 mb-5">
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold">Conditional Rules</span>
                <span className="text-fg/30">Thresholds</span>
              </div>
              <p className="text-fg/40 text-[11px]">
                Orders over ₹50,000 require CFO approval. Orders with hazardous materials require Compliance sign-off.
              </p>
            </div>

            <h3 className="text-xs font-semibold text-fg/60 mb-3">Audit Trail</h3>
            <div className="space-y-3 mb-5">
              {auditTrail.map((a) => (
                <div key={a.title} className="flex justify-between items-start">
                  <div>
                    <div className="text-xs font-medium">{a.title}</div>
                    <div className="text-[11px] text-fg/30">{a.meta}</div>
                  </div>
                  <span className="text-[11px] text-fg/40">{a.status}</span>
                </div>
              ))}
            </div>

            <div className="card !bg-panel2 p-3 mb-5">
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold">Delegation</span>
                <span className="text-fg/30">Manage</span>
              </div>
              <p className="text-fg/40 text-[11px] mb-3">
                Delegate pending approvals to backups, or set auto-delegate after 48 hours.
              </p>
              <button className="field w-full px-3 py-2 text-xs text-left flex justify-between items-center">
                Assign to backup: Amit Rao <ChevronDown size={12} />
              </button>
            </div>

            <div className="pt-3 border-t divider">
              <div className="text-xs font-semibold text-rose mb-1">Danger Zone</div>
              <p className="text-fg/30 text-[11px] mb-3">Destructive actions require confirmation.</p>
              <div className="flex gap-2">
                <button className="btn-ghost flex-1 py-2 text-xs">Archive</button>
                <button className="flex-1 py-2 text-xs rounded-full bg-rose/15 text-rose font-medium">Void Order</button>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </AppShell>
  );
}
