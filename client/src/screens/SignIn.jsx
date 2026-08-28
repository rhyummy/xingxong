import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { WORKSPACES, WORKSPACE_TONE, saveSession } from '../workspaces.js';
import { StatusBadge, ErrorBar } from '../components/ui.jsx';

const SITE_GLYPH = { online: '▣', maintenance: '▧', degraded: '▨', offline: '▢' };

/**
 * Entry screen: pick the site you are operating, then authenticate.
 *
 * Sign-in is a local demo gate — there is no auth backend, and the API's own
 * protection is the shared-secret header on approval endpoints. Credentials
 * are not sent anywhere.
 */
export default function SignIn({ onSignIn }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [workspaceId, setWorkspaceId] = useState(WORKSPACES[0].id);
  const [operator, setOperator] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState(null);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return WORKSPACES;
    return WORKSPACES.filter(
      (w) => w.name.toLowerCase().includes(q) || w.location.toLowerCase().includes(q)
    );
  }, [query]);

  const selected = WORKSPACES.find((w) => w.id === workspaceId);

  function submit(e) {
    e.preventDefault();
    if (!operator.trim()) return setError('Enter your email or employee ID.');
    if (selected?.status === 'offline') return setError('That site is offline. Choose another workspace.');

    const session = { operator: operator.trim(), workspaceId, remember };
    if (remember) saveSession(session);
    onSignIn(session);
    navigate('/app', { replace: true });
  }

  return (
    <div className="auth-wrap">
      <header className="cmdbar">
        <div className="cmdbar-brand">
          <span className="cmdbar-mark">S</span>
          SupplyChain Sentinel
        </div>
        <span className="dim3" style={{ fontSize: 12 }}>Secure access · Operations</span>
        <div className="cmdbar-spacer" />
        <span className="label">Autonomous procurement console</span>
      </header>

      <div className="auth-body">
        <div className="auth-card">
          {/* ------------------------------------------------ workspace */}
          <div className="auth-col stack" style={{ gap: 14 }}>
            <div>
              <h1>Select workspace</h1>
              <p className="dim3" style={{ fontSize: 12, marginTop: 3 }}>
                Choose the plant or site you will operate for this session.
              </p>
            </div>

            <input
              className="input"
              placeholder="Search sites…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search workspaces"
            />

            <div className="stack" style={{ gap: 7 }}>
              {shown.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  className={`ws-item ${workspaceId === w.id ? 'on' : ''}`}
                  onClick={() => { setWorkspaceId(w.id); setError(null); }}
                  disabled={w.status === 'offline'}
                >
                  <span className="ws-mark">{SITE_GLYPH[w.status]}</span>
                  <span>
                    <span className="ws-name">{w.name}</span>
                    <span className="ws-sub" style={{ display: 'block' }}>
                      {w.location} · {w.tz}
                    </span>
                  </span>
                  <StatusBadge label={w.status} tone={WORKSPACE_TONE[w.status]} />
                </button>
              ))}
              {shown.length === 0 && <div className="empty">No sites match “{query}”.</div>}
            </div>

            <div className="row">
              <button type="button" className="btn sm" disabled title="Site administration is not part of this build">
                Add workspace
              </button>
              <span className="note">Site-specific roles apply once you sign in.</span>
            </div>
          </div>

          {/* --------------------------------------------------- sign in */}
          <div className="auth-col">
            <form className="stack" style={{ gap: 14 }} onSubmit={submit}>
              <div>
                <h1>Sign in</h1>
                <p className="dim3" style={{ fontSize: 12, marginTop: 3 }}>
                  Operating as {selected?.name ?? '—'}.
                </p>
              </div>

              <ErrorBar message={error} />

              <label className="field">
                <span className="label">Email or employee ID</span>
                <input
                  className="input"
                  placeholder="r.garg@plant.co or 12489"
                  value={operator}
                  onChange={(e) => { setOperator(e.target.value); setError(null); }}
                  autoComplete="username"
                />
              </label>

              <label className="field">
                <span className="label">Password</span>
                <input
                  className="input"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </label>

              <div className="row" style={{ justifyContent: 'space-between' }}>
                <label className="row" style={{ fontSize: 12, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                  />
                  Remember this device
                </label>
                <button type="button" className="btn sm" disabled title="Not part of this build">
                  Forgot password
                </button>
              </div>

              <button className="btn primary wide" type="submit">
                Sign in to {selected?.name?.split(' ')[0] ?? 'workspace'}
              </button>

              <p className="note">
                Demo access gate — credentials are not transmitted. API writes are protected
                server-side by a shared secret on the approval endpoints.
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
