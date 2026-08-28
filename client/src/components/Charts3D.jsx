import { useRef, useState } from 'react';

/**
 * Charts with real depth. Each bar is drawn as three faces (front, top, side)
 * projected on an isometric offset, so the solidity comes from geometry rather
 * than a gradient faked onto a flat rectangle. That difference is what stops
 * them reading as generated.
 */

const TONE = {
  ok: ['#2dd4a7', '#1fa981', '#17806160'],
  warn: ['#e0a63c', '#b8842c', '#8a631f60'],
  crit: ['#e5564e', '#b8443d', '#8a332e60'],
  accent: ['#4db8c4', '#3a929c', '#2b6d7460'],
  ai: ['#a78bfa', '#8468d4', '#634ea060'],
  idle: ['#6e7a83', '#586269', '#42494e60'],
};

const face = (tone, i) => (TONE[tone] ?? TONE.accent)[i];

/* ---------------------------------------------------------------- tooltip */

/**
 * Cursor-following tooltip shared by every chart here.
 *
 * Positioned against the wrapper rather than the page, so it stays correct
 * inside a scrolled panel. Returns the wrapper plus the handlers a chart binds
 * to its marks.
 */
export function useChartTip() {
  const [tip, setTip] = useState(null);
  const ref = useRef(null);

  const show = (content) => (e) => {
    const box = ref.current?.getBoundingClientRect();
    if (!box) return;
    setTip({
      content,
      x: e.clientX - box.left,
      y: e.clientY - box.top,
    });
  };
  const hide = () => setTip(null);

  const Tip = () =>
    tip ? (
      <div
        className="charttip"
        style={{
          left: tip.x,
          top: tip.y,
          // Flip to the left near the right edge so it never clips.
          transform: `translate(${tip.x > (ref.current?.clientWidth ?? 0) - 150 ? '-100%' : '0'}, -130%)`,
        }}
      >
        {tip.content}
      </div>
    ) : null;

  return { ref, show, hide, Tip };
}

function TipRow({ label, value }) {
  return (
    <span className="tiprow">
      <b>{label}</b>
      <i>{value}</i>
    </span>
  );
}

/* ------------------------------------------------------------ 3D columns */

/**
 * Extruded column chart. `data` is [{ label, value, tone }].
 * `depth` controls the isometric offset in px.
 */
export function Bars3D({ data = [], height = 200, depth = 13, unit = '' }) {
  const tip = useChartTip();
  if (!data.length) return null;

  const w = 640;
  const padL = 40;
  const padB = 34;
  const padT = 16;
  const innerW = w - padL - depth - 12;
  const innerH = height - padB - padT;

  const max = Math.max(...data.map((d) => d.value), 1);
  const slot = innerW / data.length;
  const barW = Math.min(56, slot * 0.6);

  const gridVals = [0, 0.5, 1].map((f) => Math.round(max * f));
  const y = (v) => padT + innerH - (v / max) * innerH;

  return (
    <div className="chartwrap" ref={tip.ref}>
    <tip.Tip />
    <svg className="chart3d" viewBox={`0 0 ${w} ${height}`} role="img"
         aria-label={data.map((d) => `${d.label}: ${d.value}`).join(', ')}>
      {gridVals.map((gv) => (
        <g key={gv}>
          <line x1={padL} x2={w - 12} y1={y(gv)} y2={y(gv)} stroke="var(--line-soft)" />
          <text x={padL - 8} y={y(gv) + 4} textAnchor="end" className="axis">{gv}</text>
        </g>
      ))}

      {data.map((d, i) => {
        const x = padL + i * slot + (slot - barW) / 2;
        const top = y(d.value);
        const bh = padT + innerH - top;
        if (bh <= 0) return null;

        return (
          <g key={d.label}
             onMouseMove={tip.show(<TipRow label={d.label} value={`${d.value}${unit}`} />)}
             onMouseLeave={tip.hide}>
            {/* invisible hit area, so thin bars are still easy to hover */}
            <rect x={x - 6} y={padT} width={barW + depth + 12} height={innerH} fill="transparent" />
            {/* side face, offset up-right for the isometric read */}
            <polygon
              points={`${x + barW},${top} ${x + barW + depth},${top - depth} ${x + barW + depth},${top - depth + bh} ${x + barW},${top + bh}`}
              fill={face(d.tone, 1)}
            />
            {/* top face */}
            <polygon
              points={`${x},${top} ${x + depth},${top - depth} ${x + barW + depth},${top - depth} ${x + barW},${top}`}
              fill={face(d.tone, 0)}
              opacity="0.85"
            />
            {/* front face */}
            <rect x={x} y={top} width={barW} height={bh} fill={face(d.tone, 0)} />

            <text x={x + barW / 2 + depth / 2} y={top - depth - 6} textAnchor="middle" className="val">
              {d.value}{unit}
            </text>
            <text x={x + barW / 2} y={height - 12} textAnchor="middle" className="axis">
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
    </div>
  );
}

/* ----------------------------------------------------------------- pareto */

/**
 * Pareto: bars descending by frequency, with a cumulative percentage line and
 * an 80% reference. Answers "which few causes account for most of the problem".
 */
export function Pareto({ data = [], height = 230, unit = '' }) {
  const tip = useChartTip();
  if (!data.length) return null;

  const sorted = [...data].sort((a, b) => b.value - a.value);
  const total = sorted.reduce((s, d) => s + d.value, 0) || 1;

  let running = 0;
  const cum = sorted.map((d) => {
    running += d.value;
    return (running / total) * 100;
  });

  const w = 640;
  const padL = 40;
  const padR = 42;
  const padB = 40;
  const padT = 18;
  const depth = 10;
  const innerW = w - padL - padR;
  const innerH = height - padB - padT;

  const max = Math.max(...sorted.map((d) => d.value), 1);
  const slot = innerW / sorted.length;
  const barW = Math.min(52, slot * 0.58);

  const yBar = (v) => padT + innerH - (v / max) * innerH;
  const yPct = (p) => padT + innerH - (p / 100) * innerH;
  const cx = (i) => padL + i * slot + slot / 2;

  const linePts = cum.map((p, i) => `${i ? 'L' : 'M'}${cx(i)},${yPct(p).toFixed(1)}`).join(' ');

  // The "vital few": categories before cumulative crosses 80%.
  const vitalCount = cum.findIndex((p) => p >= 80) + 1;

  return (
    <div className="chartwrap" ref={tip.ref}>
    <tip.Tip />
    <svg className="chart3d" viewBox={`0 0 ${w} ${height}`} role="img"
         aria-label={`Pareto: ${vitalCount} of ${sorted.length} causes account for 80%`}>
      {[0, 25, 50, 75, 100].map((p) => (
        <g key={p}>
          <line x1={padL} x2={w - padR} y1={yPct(p)} y2={yPct(p)} stroke="var(--line-soft)" />
          <text x={w - padR + 6} y={yPct(p) + 4} className="axis">{p}%</text>
        </g>
      ))}

      {/* 80% reference, the line that defines the vital few */}
      <line
        x1={padL} x2={w - padR} y1={yPct(80)} y2={yPct(80)}
        stroke="var(--warn)" strokeWidth="1" strokeDasharray="4 4" opacity="0.7"
      />

      {sorted.map((d, i) => {
        const x = padL + i * slot + (slot - barW) / 2;
        const top = yBar(d.value);
        const bh = padT + innerH - top;
        const tone = i < vitalCount ? 'crit' : 'idle';
        return (
          <g key={d.label}
             onMouseMove={tip.show(
               <>
                 <TipRow label={d.label} value={`${d.value}${unit}`} />
                 <TipRow label="Share" value={`${Math.round((d.value / total) * 100)}%`} />
                 <TipRow label="Cumulative" value={`${Math.round(cum[i])}%`} />
               </>
             )}
             onMouseLeave={tip.hide}>
            <rect x={x - 6} y={padT} width={barW + depth + 12} height={innerH} fill="transparent" />
            <polygon
              points={`${x + barW},${top} ${x + barW + depth},${top - depth} ${x + barW + depth},${top - depth + bh} ${x + barW},${top + bh}`}
              fill={face(tone, 1)}
            />
            <polygon
              points={`${x},${top} ${x + depth},${top - depth} ${x + barW + depth},${top - depth} ${x + barW},${top}`}
              fill={face(tone, 0)} opacity="0.85"
            />
            <rect x={x} y={top} width={barW} height={bh} fill={face(tone, 0)} />
            <text x={x + barW / 2} y={height - 22} textAnchor="middle" className="axis">{d.label}</text>
            <text x={x + barW / 2} y={height - 9} textAnchor="middle" className="axis dim">
              {d.value}{unit}
            </text>
          </g>
        );
      })}

      <path d={linePts} fill="none" stroke="var(--accent)" strokeWidth="1.8" />
      {cum.map((p, i) => (
        <circle key={i} cx={cx(i)} cy={yPct(p)} r="3.2" fill="var(--accent)" />
      ))}
    </svg>
    </div>
  );
}

/* ------------------------------------------------------------- scatter */

/**
 * Scatter plot with quadrant shading. `points` is
 * [{ x, y, label, tone, size }]. Optional `threshold` lines mark the
 * boundary that separates acceptable from not.
 */
export function Scatter({
  points = [], height = 250, xLabel = '', yLabel = '',
  xThreshold, yThreshold,
}) {
  const tip = useChartTip();
  if (!points.length) return null;

  const w = 640;
  const padL = 48;
  const padR = 14;
  const padB = 40;
  const padT = 14;
  const innerW = w - padL - padR;
  const innerH = height - padB - padT;

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const xMin = Math.min(...xs) * 0.95;
  const xMax = Math.max(...xs) * 1.05;
  const yMin = 0;
  const yMax = Math.max(...ys) * 1.1;

  const px = (v) => padL + ((v - xMin) / (xMax - xMin || 1)) * innerW;
  const py = (v) => padT + innerH - ((v - yMin) / (yMax - yMin || 1)) * innerH;

  const xTicks = [xMin, (xMin + xMax) / 2, xMax];
  const yTicks = [yMin, yMax / 2, yMax];

  return (
    <div className="chartwrap" ref={tip.ref}>
    <tip.Tip />
    <svg className="chart3d" viewBox={`0 0 ${w} ${height}`} role="img"
         aria-label={`Scatter of ${points.length} points, ${xLabel} against ${yLabel}`}>
      {/* danger quadrant: past both thresholds */}
      {xThreshold != null && yThreshold != null && (
        <rect
          x={px(xThreshold)} y={padT}
          width={Math.max(0, w - padR - px(xThreshold))}
          height={Math.max(0, py(yThreshold) - padT)}
          fill="var(--crit-bg)"
        />
      )}

      {yTicks.map((t) => (
        <g key={`y${t}`}>
          <line x1={padL} x2={w - padR} y1={py(t)} y2={py(t)} stroke="var(--line-soft)" />
          <text x={padL - 7} y={py(t) + 4} textAnchor="end" className="axis">{Math.round(t)}</text>
        </g>
      ))}
      {xTicks.map((t) => (
        <text key={`x${t}`} x={px(t)} y={height - 22} textAnchor="middle" className="axis">
          {Math.round(t)}
        </text>
      ))}

      {xThreshold != null && (
        <line x1={px(xThreshold)} x2={px(xThreshold)} y1={padT} y2={padT + innerH}
              stroke="var(--warn)" strokeDasharray="4 4" opacity="0.8" />
      )}
      {yThreshold != null && (
        <line x1={padL} x2={w - padR} y1={py(yThreshold)} y2={py(yThreshold)}
              stroke="var(--warn)" strokeDasharray="4 4" opacity="0.8" />
      )}

      {points.map((p, i) => (
        <g key={p.label ?? i}
           onMouseMove={tip.show(<span className="tipone">{p.label}</span>)}
           onMouseLeave={tip.hide}
           style={{ cursor: 'crosshair' }}>
          {/* generous transparent hit area over each mark */}
          <circle cx={px(p.x)} cy={py(p.y)} r={(p.size ?? 5) + 8} fill="transparent" />
          {/* soft halo gives the dots a lit, dimensional feel */}
          <circle cx={px(p.x)} cy={py(p.y)} r={(p.size ?? 5) + 4}
                  fill={face(p.tone, 0)} opacity="0.13" />
          <circle cx={px(p.x)} cy={py(p.y)} r={p.size ?? 5}
                  fill={face(p.tone, 0)} stroke="var(--bg)" strokeWidth="1" />
        </g>
      ))}

      <text x={padL + innerW / 2} y={height - 5} textAnchor="middle" className="axis">{xLabel}</text>
      <text x={12} y={padT + innerH / 2} textAnchor="middle" className="axis"
            transform={`rotate(-90 12 ${padT + innerH / 2})`}>{yLabel}</text>
    </svg>
    </div>
  );
}

/* --------------------------------------------------------------- ring 3D */

/** Donut given depth by a darker offset ring sitting beneath it. */
export function Donut3D({ slices = [], size = 150, thickness = 22, center, centerLabel }) {
  const tip = useChartTip();
  const total = slices.reduce((s, x) => s + x.value, 0);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const cy = size / 2;

  // Precompute arc offsets once so the two passes stay in sync.
  let acc = 0;
  const arcs = slices.map((s) => {
    const len = total > 0 ? (s.value / total) * c : 0;
    const arc = { ...s, len, offset: acc };
    acc += len;
    return arc;
  });

  return (
    <div className="donut-wrap chartwrap" ref={tip.ref}>
      <tip.Tip />
      <svg width={size} height={size + 8} viewBox={`0 0 ${size} ${size + 8}`} role="img"
           aria-label={slices.map((s) => `${s.label}: ${s.value}`).join(', ')}>
        {/* shadow ring, offset down to imply thickness */}
        <g transform={`rotate(-90 ${size / 2} ${cy})`}>
          {arcs.map((a, i) => (
            <circle key={`s${i}`} cx={size / 2} cy={cy + 6} r={r}
                    fill="none" stroke={face(a.tone, 1)} strokeWidth={thickness}
                    strokeDasharray={`${a.len} ${c - a.len}`} strokeDashoffset={-a.offset} />
          ))}
        </g>
        <g transform={`rotate(-90 ${size / 2} ${cy})`}>
          <circle cx={size / 2} cy={cy} r={r} fill="none"
                  stroke="var(--surface-3)" strokeWidth={thickness} />
          {arcs.map((a, i) => (
            <circle key={`f${i}`} cx={size / 2} cy={cy} r={r}
                    fill="none" stroke={face(a.tone, 0)} strokeWidth={thickness}
                    strokeDasharray={`${a.len} ${c - a.len}`} strokeDashoffset={-a.offset}
                    style={{ cursor: 'pointer' }}
                    onMouseMove={tip.show(
                      <TipRow
                        label={a.label}
                        value={`${a.value} · ${total ? Math.round((a.value / total) * 100) : 0}%`}
                      />
                    )}
                    onMouseLeave={tip.hide} />
          ))}
        </g>
      </svg>
      <div className="donut-center" style={{ marginTop: -8 }}>
        <div className="donut-v">{center ?? total}</div>
        {centerLabel && <div className="donut-l">{centerLabel}</div>}
      </div>
    </div>
  );
}
