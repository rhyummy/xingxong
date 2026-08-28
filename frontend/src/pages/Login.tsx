import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Rocket, HelpCircle, ShieldCheck, Building2, Fingerprint, ArrowLeft } from "lucide-react";
import { Reveal } from "../components/Reveal";
import { StatusPill } from "../components/StatusPill";
import { ThemeToggle } from "../components/ThemeToggle";
import { workspaces } from "../lib/mockData";

const statusTone: Record<string, "mint" | "amber" | "neutral" | "rose"> = {
  Online: "mint",
  Maintenance: "amber",
  Restricted: "neutral",
  Offline: "rose",
};

/**
 * Full sign-in experience: pick an operating workspace/site, then
 * authenticate with corporate credentials (with optional hardware token
 * and SSO). This is the screen the Landing page's "Log in" button sends
 * people to, and what AppShell's sign-out action returns them to.
 */
export default function Login() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(workspaces[0].id);
  const [useToken, setUseToken] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    // Mock auth: in a real deployment this would hit /api/auth and only
    // navigate on success. Here we simulate a short network delay so the
    // loading state has something to show off.
    window.setTimeout(() => navigate("/dashboard"), 350);
  }

  return (
    <div className="min-h-screen bg-ink flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 md:px-8 py-5 border-b divider">
        <motion.div
          className="flex items-center gap-3"
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <Link to="/" className="flex items-center gap-3">
            <span className="h-9 w-9 rounded-full bg-fg text-ink grid place-items-center">
              <Rocket size={17} strokeWidth={2.3} />
            </span>
            <span className="font-display text-lg font-semibold tracking-tight">AstraProcure</span>
          </Link>
          <span className="hidden sm:block text-fg/40 text-sm ml-2">Secure Access · Operations</span>
        </motion.div>
        <div className="flex items-center gap-4">
          <ThemeToggle size="sm" />
          <button className="flex items-center gap-1.5 text-sm text-fg/70 hover:text-fg transition-colors">
            <HelpCircle size={16} /> Help
          </button>
        </div>
      </header>

      <div className="px-6 md:px-8 pt-4">
        <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-fg/40 hover:text-fg/70 transition-colors">
          <ArrowLeft size={12} /> Back to home
        </Link>
      </div>

      {/* Body */}
      <main className="flex-1 grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto w-full px-6 py-10">
        {/* Workspace selector */}
        <Reveal>
          <h1 className="font-display text-2xl font-semibold mb-1">Select Workspace</h1>
          <p className="text-fg/45 text-sm mb-6">
            Choose the plant or site you will operate in for this session.
          </p>

          <div className="space-y-3">
            {workspaces.map((ws, i) => (
              <Reveal key={ws.id} delay={i * 0.05}>
                <button
                  onClick={() => setSelected(ws.id)}
                  className={`w-full text-left card p-4 flex items-center justify-between transition-all ${
                    selected === ws.id ? "border-fg/30 bg-panel2" : "hover:border-fg/15"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="h-10 w-10 rounded-full bg-fg/5 grid place-items-center">
                      <Building2 size={16} className="text-fg/60" />
                    </span>
                    <div>
                      <div className="font-medium text-sm">{ws.name}</div>
                      <div className="text-fg/40 text-xs mt-0.5">{ws.meta}</div>
                      <div className="text-fg/30 text-xs mt-1">Timezone: {ws.tz} · Shift:</div>
                    </div>
                  </div>
                  <StatusPill tone={statusTone[ws.status]}>{ws.status}</StatusPill>
                </button>
              </Reveal>
            ))}
          </div>

          <div className="flex gap-3 mt-5">
            <button className="btn-ghost px-5 py-2.5 text-sm">Manage Sites</button>
            <button className="btn-primary px-5 py-2.5 text-sm">Add Site</button>
          </div>
          <p className="text-fg/30 text-xs mt-4 max-w-sm">
            Select a workspace before signing in. Site-specific access and roles will be applied to your session.
          </p>
        </Reveal>

        {/* Sign in form */}
        <Reveal delay={0.1}>
          <div className="card p-7">
            <h2 className="font-display text-xl font-semibold mb-1">Sign in to AstraProcure</h2>
            <p className="text-fg/45 text-sm mb-6">
              Enter your corporate credentials. Multi-factor authentication may be required for some sites.
            </p>

            <form onSubmit={handleSignIn} className="space-y-5">
              <div>
                <label className="text-xs text-fg/50 mb-1.5 block">Email or Employee ID</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="field w-full px-4 py-2.5 text-sm outline-none focus:border-fg/30"
                  placeholder="e.g. j.sullivan@procureco.com or 12489"
                />
              </div>

              <div>
                <label className="text-xs text-fg/50 mb-1.5 block">Password</label>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  className="field w-full px-4 py-2.5 text-sm outline-none focus:border-fg/30"
                  placeholder="Enter your password"
                />
                <div className="flex justify-between mt-1.5 text-xs">
                  <span className="text-fg/40">
                    Forgot your password? <button type="button" className="text-fg underline underline-offset-2">Reset</button>
                  </span>
                  <span className="flex items-center gap-1 text-fg/40">
                    <ShieldCheck size={12} /> MFA enforced for high-risk
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs text-fg/50 mb-1.5 block">Hardware Token / OTP</label>
                <div className="flex items-center gap-3">
                  <input
                    className="field flex-1 px-4 py-2.5 text-sm outline-none focus:border-fg/30"
                    placeholder="6-digit code"
                    disabled={!useToken}
                  />
                  <label className="flex items-center gap-2 text-xs text-fg/50 whitespace-nowrap">
                    <span
                      role="switch"
                      aria-checked={useToken}
                      onClick={() => setUseToken((v) => !v)}
                      className={`w-9 h-5 rounded-full cursor-pointer transition-colors relative ${useToken ? "bg-fg" : "bg-fg/15"}`}
                    >
                      <span
                        className={`absolute top-0.5 h-4 w-4 rounded-full bg-ink transition-transform ${useToken ? "translate-x-4" : "translate-x-0.5"}`}
                      />
                    </span>
                    Use hardware token
                  </label>
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs text-fg/50">
                <input type="checkbox" className="accent-fg" /> Remember this device for 30 days
              </label>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button type="submit" disabled={submitting} className="btn-primary px-6 py-2.5 text-sm flex items-center gap-2">
                  {submitting ? "Signing in…" : "Sign In"}
                </button>
                <label className="flex items-center gap-2 text-xs text-fg/50">
                  <input type="checkbox" className="accent-fg" /> Sign in as agent (admin/operator)
                </label>
                <button type="button" className="btn-ghost px-5 py-2.5 text-sm flex items-center gap-1.5 ml-auto">
                  <Fingerprint size={14} /> SSO
                </button>
              </div>

              <p className="text-fg/30 text-xs pt-2 border-t divider">
                If MFA fails, contact IT or use your backup hardware token. SSO will redirect you to your organization's
                identity provider for authentication.
              </p>
            </form>
          </div>
          <p className="text-center text-xs text-fg/30 mt-4">
            Not your workspace? <span className="text-fg/60 underline underline-offset-2 cursor-pointer">Change selection</span>
          </p>
        </Reveal>
      </main>

      <footer className="border-t divider px-6 md:px-8 py-5 flex flex-wrap gap-3 justify-between text-xs text-fg/30">
        <span>© 2026 AstraProcure · All rights reserved</span>
        <span className="flex gap-4">
          <span>Privacy</span>
          <span>Support</span>
          <span>Terms</span>
        </span>
      </footer>
    </div>
  );
}
