import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Rocket,
  ArrowRight,
  Menu,
  X,
  Bot,
  ShieldCheck,
  Boxes,
  GitBranch,
  BarChart3,
  Building2,
  Check,
  Quote,
  Github,
  Twitter,
  Linkedin,
} from "lucide-react";
import { Reveal } from "../components/Reveal";
import { ThemeToggle } from "../components/ThemeToggle";
import { useLenis } from "../lib/useLenis";

const NAV_LINKS = [
  { label: "Product", href: "#product" },
  { label: "Workflow", href: "#workflow" },
  { label: "Security", href: "#security" },
  { label: "Pricing", href: "#pricing" },
];

const STATS = [
  { value: "98.4%", label: "Inventory accuracy across connected sites" },
  { value: "1.2M+", label: "Requisitions autonomously processed / month" },
  { value: "124ms", label: "Median API latency, p95 under 400ms" },
  { value: "40+", label: "ERP, supplier & logistics integrations" },
];

const FEATURES = [
  {
    icon: Bot,
    title: "Autonomous ordering",
    body: "Agents watch stock levels and lead times, then raise, route, and reconcile purchase orders without a human in the loop for routine buys.",
  },
  {
    icon: GitBranch,
    title: "Configurable approval chains",
    body: "Model multi-step sign-off with delegation, thresholds, and SLA countdowns so nothing critical stalls waiting on one inbox.",
  },
  {
    icon: Boxes,
    title: "Live inventory intelligence",
    body: "A single part record ties together suppliers, price history, MOQ exceptions, and every open order across every site.",
  },
  {
    icon: ShieldCheck,
    title: "Compliance built in",
    body: "Every decision, approval, and exception is written to an immutable audit trail — exportable for quality and finance reviews.",
  },
  {
    icon: Building2,
    title: "Multi-site workspaces",
    body: "Switch between plants, distribution centers, and assembly sites with role-scoped access and independent supplier books.",
  },
  {
    icon: BarChart3,
    title: "Fill-rate simulation",
    body: "Model order quantity against lead time before you commit spend, with a live fill-probability curve per SKU.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Connect your suppliers & ERP",
    body: "Bring existing supplier contacts, price books, and your ERP or spreadsheet exports in through guided onboarding.",
  },
  {
    n: "02",
    title: "Let agents draft requisitions",
    body: "Reorder points and lead-time models trigger draft purchase orders automatically, ranked by fill probability and cost.",
  },
  {
    n: "03",
    title: "Approve, reroute, or escalate",
    body: "Reviewers see risk flags and SLA countdowns up front, and can reroute to a backup supplier in a click.",
  },
  {
    n: "04",
    title: "Audit and optimize",
    body: "Every action lands in a searchable audit trail feeding back into better reorder points and supplier scoring.",
  },
];

/**
 * Public marketing / landing page — the entry point at "/". Introduces
 * AstraProcure, links through to the Login screen, and offers a "view live
 * demo" shortcut straight into the authenticated Dashboard for evaluators.
 */
export default function Landing() {
  useLenis();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-ink">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b divider bg-ink/85 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 md:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="h-8 w-8 rounded-full bg-fg text-ink grid place-items-center">
              <Rocket size={15} strokeWidth={2.3} />
            </span>
            <span className="font-display font-semibold tracking-tight">AstraProcure</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((l) => (
              <a key={l.label} href={l.href} className="px-3 py-2 text-sm text-fg/60 hover:text-fg transition-colors">
                {l.label}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle size="sm" />
            <Link to="/login" className="btn-ghost px-4 py-2 text-sm">
              Log in
            </Link>
            <Link to="/login" className="btn-primary px-4 py-2 text-sm flex items-center gap-1.5">
              Get started <ArrowRight size={14} />
            </Link>
          </div>

          <button
            className="md:hidden h-9 w-9 grid place-items-center rounded-full bg-panel2 border divider"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t divider px-6 py-4 space-y-3">
            {NAV_LINKS.map((l) => (
              <a key={l.label} href={l.href} className="block text-sm text-fg/70" onClick={() => setMobileMenuOpen(false)}>
                {l.label}
              </a>
            ))}
            <div className="flex items-center justify-between pt-3 border-t divider">
              <ThemeToggle size="sm" showLabel />
            </div>
            <div className="flex gap-3 pt-1">
              <Link to="/login" className="btn-ghost flex-1 text-center px-4 py-2 text-sm">
                Log in
              </Link>
              <Link to="/login" className="btn-primary flex-1 text-center px-4 py-2 text-sm">
                Get started
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 md:px-8 pt-16 pb-20 md:pt-24 md:pb-28 grid lg:grid-cols-2 gap-12 items-center">
        <Reveal>
          <span className="pill bg-accent/15 text-accent mb-5">
            <Rocket size={12} /> Now processing 1.2M+ requisitions monthly
          </span>
          <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight leading-[1.08] mb-5">
            Procurement operations,
            <br className="hidden sm:block" /> run by agents your team trusts.
          </h1>
          <p className="text-fg/50 text-base md:text-lg max-w-xl mb-8 leading-relaxed">
            AstraProcure watches your inventory, drafts and routes purchase orders, and keeps every
            approval, exception, and supplier conversation in one auditable feed — across every plant,
            warehouse, and assembly site you run.
          </p>
          <div className="flex flex-wrap items-center gap-3 mb-8">
            <Link to="/login" className="btn-primary px-6 py-3 text-sm flex items-center gap-2">
              Start free <ArrowRight size={14} />
            </Link>
            <Link to="/dashboard" className="btn-ghost px-6 py-3 text-sm">
              View live demo
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-fg/35">
            <span className="flex items-center gap-1.5"><Check size={13} className="text-mint" /> No credit card required</span>
            <span className="flex items-center gap-1.5"><Check size={13} className="text-mint" /> Live in under a week</span>
            <span className="flex items-center gap-1.5"><Check size={13} className="text-mint" /> SOC 2-aligned controls</span>
          </div>
        </Reveal>

        {/* Stylized product preview (custom-built, not a screenshot) */}
        <Reveal delay={0.1}>
          <div className="card p-4 md:p-5 shadow-glow">
            <div className="flex items-center gap-2 mb-4">
              <span className="h-2.5 w-2.5 rounded-full bg-rose/60" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber/60" />
              <span className="h-2.5 w-2.5 rounded-full bg-mint/60" />
              <span className="ml-auto text-[11px] text-fg/30">Live Order Feed</span>
            </div>
            <div className="space-y-2.5">
              {[
                { tag: "ACK", part: "PART-9931-X", sub: "Hex screw, M6 x 12", tone: "amber" as const },
                { tag: "NEW", part: "PART-2247-B", sub: "Filter assembly, inline", tone: "mint" as const },
                { tag: "HOLD", part: "PART-0145-Q", sub: "Circuit board, A7 revision", tone: "neutral" as const },
              ].map((row, i) => (
                <motion.div
                  key={row.part}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.15 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                  className="flex items-center gap-3 rounded-xl bg-panel2 border divider px-3 py-2.5"
                >
                  <span
                    className={`pill ${
                      row.tone === "amber" ? "bg-amber/15 text-amber" : row.tone === "mint" ? "bg-mint/15 text-mint" : "bg-fg/10 text-fg/70"
                    }`}
                  >
                    {row.tag}
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-medium truncate">{row.part}</div>
                    <div className="text-[11px] text-fg/35 truncate">{row.sub}</div>
                  </div>
                  <div className="ml-auto h-6 w-16 rounded-full bg-fg/5" />
                </motion.div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2.5 mt-4">
              {[
                { label: "Fill Rate", value: "92.1%" },
                { label: "Pending", value: "14" },
                { label: "Latency", value: "124ms" },
              ].map((k) => (
                <div key={k.label} className="rounded-xl bg-panel2 border divider px-3 py-2.5">
                  <div className="text-[10px] text-fg/35">{k.label}</div>
                  <div className="font-display text-sm font-semibold mt-0.5">{k.value}</div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* Stats strip */}
      <section className="border-y divider bg-panel/40">
        <div className="max-w-7xl mx-auto px-6 md:px-8 py-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {STATS.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.06}>
              <div className="font-display text-2xl md:text-3xl font-semibold">{s.value}</div>
              <div className="text-fg/40 text-xs mt-1 max-w-[220px]">{s.label}</div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="product" className="max-w-7xl mx-auto px-6 md:px-8 py-20 md:py-24">
        <Reveal>
          <span className="text-xs font-semibold tracking-wider uppercase text-accent">Product</span>
          <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight mt-2 mb-4 max-w-2xl">
            Everything a procurement desk needs, none of the busywork.
          </h2>
          <p className="text-fg/45 max-w-2xl mb-12">
            AstraProcure replaces spreadsheets and inbox threads with a single operational surface —
            purpose-built for teams juggling multiple sites, suppliers, and approval policies.
          </p>
        </Reveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.05}>
              <div className="card p-6 h-full">
                <span className="h-10 w-10 rounded-xl bg-accent/15 text-accent grid place-items-center mb-4">
                  <f.icon size={18} />
                </span>
                <h3 className="font-display font-semibold mb-1.5">{f.title}</h3>
                <p className="text-fg/45 text-sm leading-relaxed">{f.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Workflow steps */}
      <section id="workflow" className="border-y divider bg-panel/40">
        <div className="max-w-7xl mx-auto px-6 md:px-8 py-20 md:py-24">
          <Reveal>
            <span className="text-xs font-semibold tracking-wider uppercase text-mint">Workflow</span>
            <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight mt-2 mb-12 max-w-2xl">
              From reorder point to receiving dock, in four steps.
            </h2>
          </Reveal>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 0.08}>
                <div className="relative pl-1">
                  <div className="font-display text-4xl font-semibold text-fg/10 mb-3">{s.n}</div>
                  <h3 className="font-semibold mb-1.5">{s.title}</h3>
                  <p className="text-fg/45 text-sm leading-relaxed">{s.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="max-w-5xl mx-auto px-6 md:px-8 py-20 md:py-24 text-center">
        <Reveal>
          <Quote size={28} className="mx-auto text-fg/15 mb-6" />
          <p className="font-display text-xl md:text-2xl font-medium leading-snug max-w-3xl mx-auto mb-6">
            "We cut approval backlog by more than half in the first quarter, and finally have one place
            to answer 'where is this order' without paging three different systems."
          </p>
          <div className="text-sm font-medium">Marta Ruiz</div>
          <div className="text-xs text-fg/40">Director of Procurement Operations, mid-size industrial manufacturer</div>
        </Reveal>
      </section>

      {/* Security strip */}
      <section id="security" className="border-y divider bg-panel/40">
        <div className="max-w-7xl mx-auto px-6 md:px-8 py-16 grid md:grid-cols-[1fr_auto] gap-8 items-center">
          <Reveal>
            <h2 className="font-display text-2xl font-semibold tracking-tight mb-2">Security & compliance by default</h2>
            <p className="text-fg/45 max-w-xl text-sm leading-relaxed">
              Role-scoped workspaces, hardware-token and SSO sign-in, and an immutable audit trail on every
              approval and exception — designed to satisfy quality, finance, and IT review at once.
            </p>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="flex flex-wrap gap-3">
              {["SOC 2-aligned", "ISO 27001-aligned", "GDPR-ready", "Audit-exportable"].map((badge) => (
                <span key={badge} className="pill bg-fg/5 text-fg/60 border divider">
                  <ShieldCheck size={12} className="text-mint" /> {badge}
                </span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* CTA banner */}
      <section id="pricing" className="max-w-7xl mx-auto px-6 md:px-8 py-20 md:py-28">
        <Reveal>
          <div className="card p-10 md:p-14 text-center shadow-glow">
            <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight mb-4">
              Ready to modernize procurement?
            </h2>
            <p className="text-fg/45 max-w-lg mx-auto mb-8">
              Talk to our team about rollout across your sites, or explore the live demo workspace right now —
              no setup required.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link to="/login" className="btn-primary px-6 py-3 text-sm flex items-center gap-2">
                Get started <ArrowRight size={14} />
              </Link>
              <Link to="/dashboard" className="btn-ghost px-6 py-3 text-sm">
                Explore the demo
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="border-t divider">
        <div className="max-w-7xl mx-auto px-6 md:px-8 py-14 grid sm:grid-cols-2 lg:grid-cols-5 gap-10">
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2.5 mb-3">
              <span className="h-8 w-8 rounded-full bg-fg text-ink grid place-items-center">
                <Rocket size={15} strokeWidth={2.3} />
              </span>
              <span className="font-display font-semibold tracking-tight">AstraProcure</span>
            </Link>
            <p className="text-fg/40 text-sm max-w-xs leading-relaxed mb-4">
              Autonomous procurement operations for multi-site manufacturing, distribution and assembly teams.
            </p>
            <div className="flex gap-3 text-fg/35">
              <a href="#" aria-label="Twitter" className="hover:text-fg/70 transition-colors"><Twitter size={16} /></a>
              <a href="#" aria-label="LinkedIn" className="hover:text-fg/70 transition-colors"><Linkedin size={16} /></a>
              <a href="#" aria-label="GitHub" className="hover:text-fg/70 transition-colors"><Github size={16} /></a>
            </div>
          </div>

          {[
            { heading: "Product", links: ["Overview", "Order Feed", "Order Builder", "Part Intelligence"] },
            { heading: "Company", links: ["About", "Careers", "Blog", "Contact"] },
            { heading: "Resources", links: ["Documentation", "API Reference", "Status", "Changelog"] },
            { heading: "Legal", links: ["Privacy", "Terms", "Security", "DPA"] },
          ].map((col) => (
            <div key={col.heading}>
              <div className="text-xs font-semibold tracking-wider uppercase text-fg/30 mb-3">{col.heading}</div>
              <ul className="space-y-2">
                {col.links.map((l) => (
                  <li key={l}>
                    <a href="#" className="text-sm text-fg/45 hover:text-fg/80 transition-colors">
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t divider px-6 md:px-8 py-5 flex flex-wrap gap-3 justify-between text-xs text-fg/30 max-w-7xl mx-auto">
          <span>© 2026 AstraProcure · All rights reserved</span>
          <span>Built for multi-site procurement teams.</span>
        </div>
      </footer>
    </div>
  );
}
