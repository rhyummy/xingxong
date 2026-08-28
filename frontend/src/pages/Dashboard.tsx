import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Pause, TriangleAlert, Bell, User, RefreshCw, TrendingUp } from "lucide-react";
import { Reveal } from "../components/Reveal";
import { StatusPill } from "../components/StatusPill";
import { useLenis } from "../lib/useLenis";
import { kpis, liveFeed, alerts, supplierConnections } from "../lib/mockData";

const tagTone: Record<string, "amber" | "mint" | "neutral"> = {
  ACK: "amber",
  NEW: "mint",
  HOLD: "neutral",
};

export default function Dashboard() {
  useLenis();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-ink">
      {/* Top bar */}
      <header className="flex flex-wrap items-center justify-between gap-4 px-8 py-4 border-b divider sticky top-0 bg-ink/90 backdrop-blur z-20">
        <button
          onClick={() => navigate("/orders")}
          className="btn-ghost px-4 py-2 text-sm flex items-center gap-2"
        >
          Workspace: North Hub · Receiving
          <span className="text-white/40">Switch</span>
        </button>
        <div className="flex items-center gap-6 text-xs text-white/40">
          <span>Current Shift</span>
          <span>Local Time</span>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-primary px-4 py-2 text-sm flex items-center gap-2 relative">
            <Bell size={14} /> Alerts
            <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-amber" />
          </button>
          <span className="hidden md:block text-xs text-white/40">Press ? for shortcuts</span>
          <button className="btn-ghost px-4 py-2 text-sm flex items-center gap-2">
            <User size={14} /> Evelyn Carter
          </button>
        </div>
      </header>

      <main className="px-8 py-8 grid lg:grid-cols-[260px_1fr_320px] gap-6 max-w-[1600px] mx-auto">
        {/* KPI column */}
        <div className="space-y-4">
          {kpis.map((k, i) => (
            <Reveal key={k.label} delay={i * 0.06}>
              <div className="card p-5">
                <div className="flex items-start justify-between">
                  <span className="text-white/45 text-xs">{k.label}</span>
                  {i === 0 && <TrendingUp size={14} className="text-mint" />}
                </div>
                <div className="font-display text-2xl font-semibold mt-1">{k.value}</div>
                <div className="text-white/35 text-xs mt-1">{k.sub}</div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Live feed */}
        <Reveal delay={0.1}>
          <div className="card p-6 h-full">
            <div className="flex items-start justify-between mb-1">
              <div>
                <h2 className="font-display font-semibold">Live Order Feed</h2>
                <p className="text-white/40 text-xs mt-0.5">
                  Chronological actions and incoming requisitions — newest first
                </p>
              </div>
              <span className="text-white/30 text-xs whitespace-nowrap">
                Showing {liveFeed.length} of {liveFeed.length} · Real-time
              </span>
            </div>
            <p className="text-white/25 text-[11px] mb-4">
              Keyboard: A = Acknowledge, P = Pause, E = Escalate
            </p>

            <div className="divide-y divider">
              {liveFeed.map((row, i) => (
                <motion.div
                  key={row.part}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                  className="py-4 flex flex-wrap items-center gap-4"
                >
                  <StatusPill tone={tagTone[row.tag]}>{row.tag}</StatusPill>
                  <div className="min-w-[150px]">
                    <div className="text-xs text-white/40">{row.actor}</div>
                    <div className="text-sm font-medium">{row.part}</div>
                    <div className="text-xs text-white/40">{row.desc}</div>
                  </div>
                  <div className="min-w-[90px]">
                    <div className="text-xs text-white/40">Qty {row.qty.toLocaleString()}</div>
                    <div className="text-xs text-white/30">Requested</div>
                  </div>
                  <div className="min-w-[110px]">
                    <div className="text-xs text-white/40">ETA {row.eta}</div>
                    <div className="text-xs text-white/30">{row.status}</div>
                  </div>
                  <div className="min-w-[110px] text-xs text-white/40">
                    Supplier: <span className="text-white/70">{row.supplier}</span>
                  </div>
                  <div className="h-8 w-8 rounded-full grid place-items-center text-xs font-semibold border divider">
                    {row.score}
                  </div>
                  <div className="flex gap-2 ml-auto">
                    <button className="h-8 w-8 grid place-items-center rounded-full bg-mint/15 text-mint hover:bg-mint/25 transition-colors">
                      <Check size={14} />
                    </button>
                    <button className="h-8 w-8 grid place-items-center rounded-full bg-white/10 text-white/70 hover:bg-white/15 transition-colors">
                      <Pause size={14} />
                    </button>
                    <button className="h-8 w-8 grid place-items-center rounded-full bg-rose/15 text-rose hover:bg-rose/25 transition-colors">
                      <TriangleAlert size={14} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </Reveal>

        {/* Right rail */}
        <div className="space-y-4">
          <Reveal delay={0.15}>
            <div className="card p-5">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-display text-sm font-semibold">Active Alerts</h3>
                <button className="text-xs text-white/40">Collapse</button>
              </div>
              <div className="space-y-3">
                {alerts.map((a) => (
                  <div key={a.title} className="flex gap-2.5">
                    <span className={`mt-1 h-2 w-2 rounded-full ${a.tone === "amber" ? "bg-amber" : "bg-mint"}`} />
                    <div>
                      <div className="text-sm font-medium">{a.title}</div>
                      <div className="text-xs text-white/40 mt-0.5">{a.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.2}>
            <div className="card p-5">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-display text-sm font-semibold">System Health</h3>
                <button className="text-xs text-white/40">Expand</button>
              </div>
              <p className="text-white/40 text-xs mb-2">API Latency (p95)</p>
              <div className="font-display text-2xl font-semibold mb-3">124 ms</div>
              <p className="text-white/40 text-xs mb-2">Supplier Connections</p>
              <div className="space-y-2">
                {supplierConnections.map((s) => (
                  <div key={s.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${s.tone === "mint" ? "bg-mint" : s.tone === "amber" ? "bg-amber" : "bg-rose"}`} />
                      {s.name}
                    </span>
                    <span className="text-white/40">{s.status}</span>
                  </div>
                ))}
              </div>
              <button className="btn-primary w-full mt-4 py-2 text-xs flex items-center justify-center gap-1.5">
                <RefreshCw size={12} /> Attempt Reconnect
              </button>
            </div>
          </Reveal>

          <Reveal delay={0.25}>
            <div className="card p-5">
              <h3 className="font-display text-sm font-semibold mb-3">Recent Events</h3>
              <p className="text-white/40 text-xs mb-3">Quick log of notable system events</p>
              <div className="space-y-2 text-xs text-white/40">
                <div>13:40 · Auto-scaler adjusted agent pool +2</div>
                <div>13:35 · CoreBind: session re-keyed</div>
                <div>13:28 · NovaParts: partial shipment on NX-9912</div>
              </div>
            </div>
          </Reveal>
        </div>
      </main>
    </div>
  );
}
