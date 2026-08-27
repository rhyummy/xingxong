/**
 * Shared primitives for the console. Everything here is presentational —
 * no data fetching, no business rules.
 */

/* ------------------------------------------------------------------ status */

/** Maps every backend status string onto one semantic tone. */
export const TONE = {
  'auto-approved': 'ok',
  approved: 'ok',
  issued: 'ok',
  'on-track': 'ok',
  pass: 'ok',

  escalated: 'warn',
  'pending-approval': 'warn',
  'backup-sourced': 'warn',
  'reroute-inventory': 'warn',

  rejected: 'crit',
  blocked: 'crit',
  fail: 'crit',
};

export const toneOf = (status) => TONE[status] ?? 'idle';

/** Plain-English wording for backend status codes. */
const STATUS_WORDS = {
  'auto-approved': 'ordered',
  escalated: 'needs you',
  'pending-approval': 'waiting',
  approved: 'approved',
  rejected: 'rejected',
  issued: 'sent',
  'on-track': 'on time',
  'backup-sourced': 'backup found',
  'reroute-inventory': 'reroute stock',
  blocked: 'blocked',
};

export function StatusBadge({ status, label, tone, title }) {
  if (!status && !label) return null;
  return (
    <span className={`badge ${tone ?? toneOf(status)}`} title={title}>
      {label ?? STATUS_WORDS[status] ?? String(status).replace(/-/g, ' ')}
    </span>
  );
}

export function Dot({ tone = 'idle' }) {
  return <span className={`dot ${tone}`} />;
}

/** "Gearbox Coupling — Line C" reads lighter as "Gearbox Coupling · Line C". */
export const partName = (name = '') => name.replace(/\s*—\s*/g, ' · ');

/** Just the item, dropping the production line. */
export const shortName = (name = '') => name.split('—')[0].trim();

/* ------------------------------------------------------------------ panels */

export function Panel({ title, sub, right, children, className = '', bodyClass = '' }) {
  return (
    <section className={`panel ${className}`}>
      {(title || right) && (
        <header className="panel-head">
          {title && <h2>{title}</h2>}
          {sub && <span className="sub">{sub}</span>}
          {right && <div className="right">{right}</div>}
        </header>
      )}
      {children != null && <div className={`panel-body ${bodyClass}`}>{children}</div>}
    </section>
  );
}

export function MetricCard({ label, value, sub, tone }) {
  return (
    <div className="metric">
      <div className="k">{label}</div>
      <div className={`v ${tone ?? ''}`}>{value}</div>
      {sub && <div className="s">{sub}</div>}
    </div>
  );
}

export function Fact({ label, value }) {
  return (
    <div className="fact">
      <div className="k">{label}</div>
      <div className="v">{value}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ states */

export function ErrorBar({ message, onRetry }) {
  if (!message) return null;
  return (
    <div className="error-bar">
      <span className="mono">!</span>
      <span style={{ flex: 1 }}>{message}</span>
      {onRetry && (
        <button className="btn sm" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}

export function Empty({ children }) {
  return <div className="empty">{children}</div>;
}

export function Skeleton({ rows = 4 }) {
  return (
    <div style={{ padding: 13 }}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skel skel-row" />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ charts */

/** Horizontal score bar, 0–100. */
export function ScoreBar({ score, tone }) {
  const t = tone ?? (score >= 80 ? 'ok' : score >= 72 ? 'warn' : 'crit');
  return (
    <div className="meter" title={`Score ${score}/100`}>
      <i className={t} style={{ width: `${Math.max(0, Math.min(100, score))}%` }} />
    </div>
  );
}

/* -------------------------------------------------------------- guardrails */

const GUARDRAIL_LABEL = {
  'cost-threshold': 'Within budget',
  'supplier-score-threshold': 'Supplier is good enough',
  'demand-anomaly': 'Usage looks normal',
  'single-source-risk': 'Backup supplier exists',
  'no-supplier-available': 'Supplier available',
};

const ALL_GUARDRAILS = [
  'cost-threshold',
  'supplier-score-threshold',
  'demand-anomaly',
  'single-source-risk',
];

/** Every guardrail with its pass/fail mark — not only the ones that failed. */
export function GuardrailChecklist({ failed = [], explanations = {} }) {
  const codes = [...new Set([...ALL_GUARDRAILS, ...failed])];
  return (
    <div>
      {codes.map((code) => {
        const bad = failed.includes(code);
        return (
          <div key={code} className={`gr ${bad ? 'fail' : 'pass'}`}>
            <span className="m">{bad ? '✕' : '✓'}</span>
            <span>
              {GUARDRAIL_LABEL[code] ?? code}
              {bad && explanations[code] && <div className="why">{explanations[code]}</div>}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------- time */

export function relTime(iso) {
  if (!iso) return '—';
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

export function clockTime(iso) {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
}
