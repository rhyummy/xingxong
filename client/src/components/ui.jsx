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

export function StatusBadge({ status, label, tone, title }) {
  if (!status && !label) return null;
  return (
    <span className={`badge ${tone ?? toneOf(status)}`} title={title}>
      {label ?? String(status).replace(/-/g, ' ')}
    </span>
  );
}

export function Dot({ tone = 'idle' }) {
  return <span className={`dot ${tone}`} />;
}

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

/**
 * Inline usage sparkline. Deliberately plain: an area fill, the series line,
 * and an emphasised final point. `markFrom` shades the recent window that the
 * anomaly test compares against the baseline.
 */
export function Sparkline({ series, height = 46, markFrom, tone = 'var(--accent)' }) {
  if (!series?.length) return null;

  const w = 300;
  const h = height;
  const max = Math.max(...series, 1);
  const step = series.length > 1 ? w / (series.length - 1) : w;

  const pts = series.map((v, i) => [i * step, h - (v / max) * (h - 4) - 2]);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} L${w},${h} L0,${h} Z`;
  const [lx, ly] = pts[pts.length - 1];

  const markX = markFrom != null ? markFrom * step : null;

  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img"
         aria-label={`Usage trend, peak ${max} units per day`}>
      {markX != null && (
        <rect x={markX} y="0" width={w - markX} height={h} fill="var(--warn-bg)" />
      )}
      <path d={area} fill={tone} opacity=".1" />
      <path d={line} fill="none" stroke={tone} strokeWidth="1.25" vectorEffect="non-scaling-stroke" />
      <circle cx={lx} cy={ly} r="2.2" fill={tone} />
    </svg>
  );
}

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
  'cost-threshold': 'Order value within auto-approval ceiling',
  'supplier-score-threshold': 'Supplier score meets the minimum',
  'demand-anomaly': 'Demand is routine, not anomalous',
  'single-source-risk': 'A fallback supplier exists',
  'no-supplier-available': 'A supplier is available',
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
