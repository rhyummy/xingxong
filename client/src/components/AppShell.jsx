import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { fetchHealth } from '../api.js';
import { WORKSPACES, WORKSPACE_TONE, clearSession } from '../workspaces.js';
import { Dot } from './ui.jsx';

const NAV = [
  { to: '/', label: 'Operations', end: true },
  { to: '/queue', label: 'Task Queue' },
  { to: '/parts', label: 'Parts' },
  { to: '/approvals', label: 'Approvals' },
  { to: '/history', label: 'Decision History' },
];

/** Factory shifts, IST. Used only for the command-bar readout. */
function currentShift(d) {
  const h = d.getHours();
  if (h >= 6 && h < 14) return 'A · 06:00–14:00';
  if (h >= 14 && h < 22) return 'B · 14:00–22:00';
  return 'C · 22:00–06:00';
}

export default function AppShell({ session, onSignOut }) {
  const navigate = useNavigate();
  const [now, setNow] = useState(() => new Date());
  const [health, setHealth] = useState(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    fetchHealth().then(setHealth).catch(() => setHealth({ ok: false }));
  }, []);

  const workspace = WORKSPACES.find((w) => w.id === session?.workspaceId) ?? WORKSPACES[0];

  function signOut() {
    clearSession();
    onSignOut();
    navigate('/signin', { replace: true });
  }

  return (
    <div className="shell">
      <header className="cmdbar">
        <div className="cmdbar-brand">
          <span className="cmdbar-mark">S</span>
          SupplyChain Sentinel
        </div>

        <button className="workspace-chip" onClick={() => navigate('/signin')} title="Switch workspace">
          <Dot tone={WORKSPACE_TONE[workspace.status]} />
          <span>{workspace.name}</span>
          <span className="dim3">▾</span>
        </button>

        <nav className="nav">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => (isActive ? 'on' : '')}>
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="cmdbar-spacer" />

        <div className="cmdbar-center">
          <div className="clock">
            <span className="label">Shift</span>
            <span className="v">{currentShift(now)}</span>
          </div>
          <div className="clock">
            <span className="label">Local · {workspace.tz}</span>
            <span className="v">
              {now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })}
            </span>
          </div>
        </div>

        <div className="cmdbar-right">
          <span className="badge idle" title={health?.catalogSource ? `Catalog: ${health.catalogSource}` : ''}>
            <Dot tone={health?.ok ? 'ok' : 'crit'} />
            {health?.catalogSource === 'supabase' ? 'live' : health?.ok ? 'fallback' : 'offline'}
          </span>
          <div className="clock" style={{ alignItems: 'flex-end' }}>
            <span className="v" style={{ fontFamily: 'var(--sans)', fontSize: 12 }}>
              {session?.operator ?? 'Operator'}
            </span>
            <span className="label">Procurement</span>
          </div>
          <button className="btn sm" onClick={signOut}>Sign out</button>
        </div>
      </header>

      <main className="page">
        <div className="page-wide">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
