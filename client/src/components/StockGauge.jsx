/**
 * Stock-before-stockout gauge.
 *
 * One large ring carrying the headline number inside it, flanked by two
 * smaller rings for the figures that explain it. Reading the value from the
 * centre of its own arc is what makes the state legible at a glance: the arc
 * is the number, not a decoration beside it.
 */

const TONE_VAR = {
  ok: 'var(--ok)',
  warn: 'var(--warn)',
  crit: 'var(--crit)',
  accent: 'var(--accent)',
  ai: 'var(--ai)',
  idle: 'var(--idle)',
};

const col = (t) => TONE_VAR[t] ?? TONE_VAR.accent;

/**
 * A single ring. `pct` is 0-100; the arc starts at the top and sweeps
 * clockwise, with round caps so a small value still reads as a stroke rather
 * than a speck.
 */
export function Ring({
  pct = 0,
  size = 190,
  thickness = 18,
  tone = 'accent',
  children,
  title,
}) {
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const filled = (Math.max(0, Math.min(100, pct)) / 100) * c;

  return (
    <div className="ring" style={{ width: size, height: size }} title={title}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="var(--surface-3)" strokeWidth={thickness}
        />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke={col(tone)}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${c - filled}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="ring-arc"
        />
      </svg>
      <div className="ring-mid">{children}</div>
    </div>
  );
}

/**
 * The composed trio. Centre is stock cover; the satellites are the two numbers
 * a buyer needs next: how fast it is going, and how long it lasts.
 */
export default function StockGauge({
  currentStock,
  reorderThreshold,
  daysLeft,
  dailyRate,
  leadTimeDays,
  unitLabel = 'units',
}) {
  const coverPct = reorderThreshold ? (currentStock / reorderThreshold) * 100 : 0;
  const tone = coverPct <= 35 ? 'crit' : coverPct < 100 ? 'warn' : 'ok';

  // 30 days of cover is treated as fully stocked for the runway ring.
  const runwayPct = daysLeft != null ? Math.min(100, (daysLeft / 30) * 100) : 0;
  const runwayTone = daysLeft == null ? 'idle' : daysLeft <= 3 ? 'crit' : daysLeft <= 10 ? 'warn' : 'ok';

  // Delivery beating the runway is what actually matters here.
  const arrivesInTime = leadTimeDays != null && daysLeft != null && leadTimeDays <= daysLeft;
  const leadPct = leadTimeDays != null ? Math.min(100, (leadTimeDays / 21) * 100) : 0;

  return (
    <div className="stockgauge">
      <Ring
        pct={coverPct}
        size={196}
        thickness={19}
        tone={tone}
        title={`${currentStock} in stock against a reorder point of ${reorderThreshold}`}
      >
        <span className="rg-v">{currentStock}</span>
        <span className="rg-l">{unitLabel} left</span>
        <span className="rg-s">reorder at {reorderThreshold}</span>
      </Ring>

      <div className="stockgauge-side">
        <Ring
          pct={Math.min(100, (dailyRate / 12) * 100)}
          size={116}
          thickness={12}
          tone="accent"
          title={`Using about ${dailyRate} ${unitLabel} a day`}
        >
          <span className="rg-v sm">{dailyRate}</span>
          <span className="rg-l sm">per day</span>
        </Ring>

        <Ring
          pct={runwayPct}
          size={116}
          thickness={12}
          tone={runwayTone}
          title={
            daysLeft == null
              ? 'No usage recorded'
              : `About ${daysLeft} days of stock left`
          }
        >
          <span className="rg-v sm">{daysLeft ?? '—'}</span>
          <span className="rg-l sm">days left</span>
        </Ring>
      </div>

      {leadTimeDays != null && (
        <div className={`stockgauge-note ${arrivesInTime ? 'ok' : 'crit'}`}>
          <Ring pct={leadPct} size={54} thickness={7} tone={arrivesInTime ? 'ok' : 'crit'}>
            <span className="rg-v xs">{leadTimeDays}</span>
          </Ring>
          <span>
            {arrivesInTime
              ? `Delivery takes ${leadTimeDays} days. Arrives before you run out.`
              : `Delivery takes ${leadTimeDays} days. That is after you run out.`}
          </span>
        </div>
      )}
    </div>
  );
}
