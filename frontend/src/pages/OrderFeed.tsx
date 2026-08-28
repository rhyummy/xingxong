import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ListFilter, SlidersHorizontal, User, Paperclip, Send, PackagePlus } from "lucide-react";
import { Reveal } from "../components/Reveal";
import { StatusPill } from "../components/StatusPill";
import { AppShell } from "../components/AppShell";
import { useLenis } from "../lib/useLenis";
import { taskQueue, taskDetail } from "../lib/mockData";

const FILTERS = [
  { label: "Open", tone: "amber" as const },
  { label: "In-Progress", tone: "mint" as const },
  { label: "Blocked", tone: "rose" as const },
  { label: "Shipped", tone: "neutral" as const },
];

function TaskCard({ t, selected, onClick }: { t: any; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left card p-4 transition-all ${selected ? "border-fg/30 bg-panel2" : "hover:border-fg/15"}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">{t.id}</span>
        <StatusPill tone={t.priority === "P1" ? "rose" : t.priority === "P2" ? "amber" : "mint"}>{t.priority}</StatusPill>
      </div>
      <div className="text-xs text-fg/40 mb-2">
        PO: {t.po} {t.eta && <>· ETA: {t.eta}</>} {t.sla && <span className="text-rose ml-1">{t.sla}</span>}
      </div>
      {t.risk && (
        <div className="h-1.5 rounded-full bg-rose/20 mb-2">
          <div className="h-1.5 rounded-full bg-rose w-4/5" />
        </div>
      )}
      <div className="flex flex-wrap gap-2 text-xs text-fg/40">
        {t.ltVariance && <span>LT variance: {t.ltVariance}</span>}
        {t.supplier && <span>Supplier: {t.supplier}</span>}
      </div>
      <div className="flex items-center justify-between mt-2 text-[11px] text-fg/30">
        <span>{t.created ? `Created ${t.created}` : t.note || "No BOM"}</span>
        {t.updated && <span>Last update {t.updated}</span>}
      </div>
    </button>
  );
}

export default function OrderFeed() {
  useLenis();
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState("Open");
  const [selectedId, setSelectedId] = useState(taskDetail.id);

  return (
    <AppShell
      title="Order Feed"
      subtitle="Operations workspace — signed in as Elena Marques"
      actions={
        <button
          onClick={() => navigate("/orders/new")}
          className="btn-ghost px-4 py-2 text-sm hidden sm:flex items-center gap-2"
        >
          <PackagePlus size={14} /> New Order
        </button>
      }
    >
      <div className="px-5 md:px-8 py-6 max-w-[1600px] mx-auto">
        <Reveal>
          <div className="flex flex-wrap items-center gap-3 mb-6">
            {FILTERS.map((f) => (
              <button
                key={f.label}
                onClick={() => setActiveFilter(f.label)}
                className={`pill transition-all ${
                  activeFilter === f.label ? "bg-fg text-ink" : `bg-fg/5 text-fg/60 hover:bg-fg/10`
                }`}
              >
                {f.label}
              </button>
            ))}
            <span className="text-fg/30 text-xs ml-2">Date: 2026-08-20 — 2026-08-27</span>
            <div className="flex-1" />
            <div className="relative w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg/30" />
              <input className="field w-full pl-9 pr-3 py-2 text-sm outline-none" placeholder="Search by part, PO, supplier" />
            </div>
            <button className="btn-ghost h-9 w-9 grid place-items-center"><ListFilter size={14} /></button>
            <button className="btn-ghost h-9 w-9 grid place-items-center"><SlidersHorizontal size={14} /></button>
          </div>
        </Reveal>

        <div className="grid lg:grid-cols-[380px_1fr] gap-6">
          {/* Task list */}
          <div>
            <Reveal>
              <div className="flex items-center justify-between mb-2">
                <span className="text-rose text-xs font-medium">Critical · SLA &lt;24h · {taskQueue.critical.length} tasks</span>
                <span className="text-fg/30 text-xs">Manual reorder enabled</span>
              </div>
              <div className="space-y-3 mb-6">
                {taskQueue.critical.map((t, i) => (
                  <Reveal key={t.id} delay={i * 0.05}>
                    <TaskCard t={t} selected={selectedId === t.id} onClick={() => setSelectedId(t.id)} />
                  </Reveal>
                ))}
              </div>
            </Reveal>

            <Reveal>
              <div className="flex items-center justify-between mb-2">
                <span className="text-mint text-xs font-medium">High · SLA 1–3d · {taskQueue.high.length} tasks</span>
                <span className="text-fg/30 text-xs">Auto-prioritized</span>
              </div>
              <div className="space-y-3">
                {taskQueue.high.map((t, i) => (
                  <Reveal key={t.id} delay={i * 0.05}>
                    <TaskCard t={t} selected={selectedId === t.id} onClick={() => setSelectedId(t.id)} />
                  </Reveal>
                ))}
              </div>
            </Reveal>
          </div>

          {/* Task detail */}
          <Reveal delay={0.1}>
            <div className="card p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
                <h2 className="font-display font-semibold text-lg">
                  {taskDetail.id} · {taskDetail.po}
                </h2>
                <div className="flex items-center gap-2">
                  <StatusPill tone="rose">{taskDetail.sla}</StatusPill>
                  <span className="text-xs text-fg/40">ETA: {taskDetail.eta}</span>
                  <span className="h-8 w-8 rounded-full bg-fg/10 grid place-items-center"><User size={14} /></span>
                </div>
              </div>
              <p className="text-fg/40 text-xs mb-6">
                {taskDetail.supplier} · Priority {taskDetail.priority} · Assigned to: {taskDetail.assignee}
              </p>

              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <h3 className="text-sm font-semibold mb-3">Agent Decisions</h3>
                  <div className="space-y-4">
                    {taskDetail.decisions.map((d) => (
                      <div key={d.title} className="text-xs">
                        <div className="font-medium text-fg/90">{d.title}</div>
                        {d.meta && <div className="text-fg/40 mt-0.5">{d.meta}</div>}
                        <div className="text-fg/25 mt-1">{d.time}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-3">Communications</h3>
                  <div className="space-y-4">
                    {taskDetail.comms.map((c) => (
                      <div key={c.time} className="text-xs">
                        <div className="text-fg/90">
                          <span className="font-medium">{c.author}:</span> {c.text}
                        </div>
                        <div className="text-fg/25 mt-1">{c.time}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-3">Attachments</h3>
                  <div className="space-y-3">
                    {taskDetail.attachments.map((a) => (
                      <div key={a.name} className="flex items-start gap-2">
                        <Paperclip size={14} className="text-fg/40 mt-0.5" />
                        <div className="text-xs">
                          <div className="font-medium">{a.name}</div>
                          <div className="text-fg/40">{a.meta} · {a.date}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <h3 className="text-sm font-semibold mt-6 mb-2">Compact Timeline</h3>
                  <div className="h-1.5 rounded-full bg-fg/10 mb-2">
                    <div className="h-1.5 rounded-full bg-mint w-2/3" />
                  </div>
                  <p className="text-fg/40 text-xs">
                    Line items: order placed → supplier confirmation → partial ship → invoice received
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 mt-8 pt-6 border-t divider">
                <button className="btn-ghost px-4 py-2 text-xs">Create Exception</button>
                <button className="btn-ghost px-4 py-2 text-xs">Tag for Audit</button>
                <span className="text-fg/30 text-xs">Selected: {selectedId}</span>
                <div className="flex-1 relative min-w-[200px]">
                  <input className="field w-full pl-4 pr-9 py-2.5 text-sm outline-none" placeholder="Write a message or @mention" />
                  <Send size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-fg/40" />
                </div>
                <button className="btn-ghost px-5 py-2.5 text-sm">Cancel</button>
                <button className="px-5 py-2.5 text-sm rounded-full bg-amber text-black/80 font-semibold hover:opacity-85 transition-opacity">
                  Reroute
                </button>
                <button className="btn-primary px-5 py-2.5 text-sm">Approve</button>
              </div>
              <p className="text-fg/25 text-[11px] mt-3">
                Shortcuts: Enter - Open task · A - Approve · R - Reroute · C - Cancel · ↑/↓ - Reorder
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </AppShell>
  );
}
