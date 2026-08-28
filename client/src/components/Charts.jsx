/**
 * Flat inline-SVG charts: bar lists, a line chart and a gauge.
 *
 * The donut and column chart that used to live here were replaced by the
 * extruded versions in Charts3D.jsx and removed rather than left to rot.
 */

const TONE_VAR = {
  ok: 'var(--ok)',
  warn: 'var(--warn)',
  crit: 'var(--crit)',
  ai: 'var(--ai)',
  accent: 'var(--accent)',
  idle: 'var(--idle)',
};

const color = (t) => TONE_VAR[t] ?? t ?? 'var(--accent)';

/* ----------------------------------------------------------------- legend */

/** Swatch list, paired with a donut or any categorical chart. */
export function Legend({ items = [] }) {
  return (
    <ul className="legend">
      {items.map((i) => (
        <li key={i.label}>
          <span className="sw" style={{ background: color(i.tone) }} />
          <span className="lg-l">{i.label}</span>
          <span className="lg-v mono">{i.value}</span>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------- bars */

/** Horizontal bar list. `data` is [{ label, value, tone }]. */
export function BarList({ data = [], max, unit = '' }) {
  const peak = max ?? Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="barlist">
      {data.map((d) => (
        <div className="barrow" key={d.label}>
          <span className="bl">{d.label}</span>
          <span className="bt">
            <i style={{ width: `${(d.value / peak) * 100}%`, background: color(d.tone) }} />
          </span>
          <span className="bv mono">{d.value}{unit}</span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------- line */

/**
 * Line chart with a faint grid, an area fill and an emphasised endpoint.
 * `highlightFrom` shades a trailing window (used for the anomaly test period).
 */
export function LineChart({
  series = [],
  height = 150,
  tone = 'accent',
  highlightFrom,
  baseline,
  yLabel,
}) {
  if (!series.length) return null;

  const w = 640;
  const padL = 34;
  const padB = 18;
  const padT = 8;
  const innerW = w - padL - 8;
  const innerH = height - padB - padT;

  const max = Math.max(...series, baseline ?? 0, 1);
  const step = series.length > 1 ? innerW / (series.length - 1) : innerW;

  const x = (i) => padL + i * step;
  const y = (v) => padT + innerH - (v / max) * innerH;

  const pts = series.map((v, i) => [x(i), y(v)]);
  const line = pts.map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)},${py.toFixed(1)}`).join(' ');
  const area = `${line} L${x(series.length - 1)},${padT + innerH} L${padL},${padT + innerH} Z`;
  const [lx, ly] = pts[pts.length - 1];

  const gridVals = [0, 0.5, 1].map((f) => Math.round(max * f));

  return (
    <svg className="linechart" viewBox={`0 0 ${w} ${height}`} role="img"
         aria-label={`${yLabel ?? 'Value'} over ${series.length} days, peak ${max}`}>
      {/* horizontal grid + y labels */}
      {gridVals.map((gv) => (
        <g key={gv}>
          <line x1={padL} x2={w - 8} y1={y(gv)} y2={y(gv)} stroke="var(--line-soft)" strokeWidth="1" />
          <text x={padL - 6} y={y(gv) + 3} textAnchor="end" className="axis">{gv}</text>
        </g>
      ))}

      {/* trailing window shading */}
      {highlightFrom != null && (
        <rect
          x={x(highlightFrom)} y={padT}
          width={w - 8 - x(highlightFrom)} height={innerH}
          fill="var(--warn-bg)"
        />
      )}

      {/* baseline reference */}
      {baseline != null && (
        <line
          x1={padL} x2={w - 8} y1={y(baseline)} y2={y(baseline)}
          stroke="var(--text-3)" strokeWidth="1" strokeDasharray="3 3"
        />
      )}

      <path d={area} fill={color(tone)} opacity=".12" />
      <path d={line} fill="none" stroke={color(tone)} strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
      <circle cx={lx} cy={ly} r="3" fill={color(tone)} />

      <text x={padL} y={height - 4} className="axis">{series.length}d ago</text>
      <text x={w - 8} y={height - 4} textAnchor="end" className="axis">today</text>
    </svg>
  );
}

/* ----------------------------------------------------------------- gauge */

/** Single-value progress bar with a target marker. */
export function Gauge({ value, max = 100, tone = 'accent', target }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="gauge">
      <i style={{ width: `${pct}%`, background: color(tone) }} />
      {target != null && <span className="gtick" style={{ left: `${(target / max) * 100}%` }} />}
    </div>
  );
}
