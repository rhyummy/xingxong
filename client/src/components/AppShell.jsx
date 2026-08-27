import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { fetchHealth, fetchStats } from '../api.js';
import { WORKSPACES, WORKSPACE_TONE, clearSession } from '../workspaces.js';
import { Dot } from './ui.jsx';
import { useLenis } from '../lib/useLenis.js';

const NAV = [
  { to: '/', label: 'Overview', icon: '▦', end: true },
  { to: '/queue', label: 'Run Analysis', icon: '▶' },
  { to: '/parts', label: 'Parts', icon: '▤' },
  { to: '/approvals', label: 'Approvals', icon: '✓', badge: 'pendingApprovals' },
  { to: '/history', label: 'History', icon: '↻' },
];

function shiftName(d) {
  const h = d.getHours();
  if (h >= 6 && h < 14) return 'Shift A';
  if (h >= 14 && h < 22) return 'Shift B';
  return 'Shift C';
}

export default function AppShell({ session, onSignOut }) {
  const navigate = useNavigate();
  const [now, setNow] = useState(() => new Date());
  const [health, setHealth] = useState(null);
  const [stats, setStats] = useState(null);

  useLenis('.page');

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    fetchHealth().then(setHealth).catch(() => setHealth({ ok: false }));
    fetchStats().then(setStats).catch(() => {});
  }, []);

  const workspace = WORKSPACES.find((w) => w.id === session?.workspaceId) ?? WORKSPACES[0];
  const live = health?.catalogSource === 'supabase';

  function signOut() {
    clearSession();
    onSignOut();
    navigate('/signin', { replace: true });
  }

  return (
    <div className="shell">
      {/* ------------------------------------------------------ sidebar */}
      <aside className="side">
        <div className="side-brand">
          <span className="cmdbar-mark">S</span>
          <span>
            <b>Sentinel</b>
            <i>Procurement AI</i>
          </span>
        </div>

        <button className="side-ws" onClick={() => navigate('/signin')} title="Switch workspace">
          <Dot tone={WORKSPACE_TONE[workspace.status]} />
          <span>
            <b>{workspace.name.split(' ')[0]} Plant</b>
            <i>{workspace.location.split('—').pop().trim()}</i>
          </span>
          <span className="dim3">⇄</span>
        </button>

        <nav className="side-nav">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => (isActive ? 'on' : '')}>
              <span className="ico">{n.icon}</span>
              <span>{n.label}</span>
              {n.badge && stats?.[n.badge] > 0 && <span className="nbadge">{stats[n.badge]}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="side-foot">
          <div className="side-status">
            <Dot tone={live ? 'ok' : 'warn'} />
            <span>{live ? 'Live data' : 'Offline mode'}</span>
          </div>
          <div className="side-user">
            <span className="avatar">{(session?.operator ?? 'O')[0].toUpperCase()}</span>
            <span>
              <b>{session?.operator ?? 'Operator'}</b>
              <i>Buyer</i>
            </span>
          </div>
          <button className="btn sm wide" onClick={signOut}>Sign out</button>
        </div>
      </aside>

      {/* --------------------------------------------------------- main */}
      <div className="main">
        <header className="topbar">
          <div className="topbar-clock">
            <span className="mono">
              {now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })}
            </span>
            <span className="dim3">{shiftName(now)}</span>
          </div>
          <div className="cmdbar-spacer" />
          {stats && (
            <div className="topbar-pills">
              <span className="badge idle">{stats.totalParts} parts</span>
              {stats.partsAtRisk > 0 && <span className="badge crit">{stats.partsAtRisk} at risk</span>}
              {stats.pendingApprovals > 0 && <span className="badge warn">{stats.pendingApprovals} to approve</span>}
            </div>
          )}
        </header>

        <main className="page">
          <div className="page-wide">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
