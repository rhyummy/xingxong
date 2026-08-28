import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { fetchStats, fetchParts, fetchRuns } from '../api.js';
import { money } from '../money.js';
import ShaderBackground from '../components/ShaderBackground.jsx';
import ConstellationGrid from '../components/ConstellationGrid.jsx';
import { Bars3D, Pareto, Scatter, Donut3D } from '../components/Charts3D.jsx';
import Reveal from '../components/Reveal.jsx';

const GUARDRAIL_NAME = {
  'cost-threshold': 'Over budget',
  'supplier-score-threshold': 'Weak supplier',
  'demand-anomaly': 'Demand spike',
  'single-source-risk': 'One supplier',
};

/** Counts up to a value once the element scrolls into view. */
function Counter({ to, suffix = '', duration = 900 }) {
  const [n, setN] = useState(0);
  const ref = useRef(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (to == null) return;
    if (reduced) return setN(to);

    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const tick = (now) => {
        const t = Math.min(1, (now - start) / duration);
        // easeOutCubic, so it decelerates into the final figure
        setN(to * (1 - Math.pow(1 - t, 3)));
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.4 });

    io.observe(el);
    return () => io.disconnect();
  }, [to, duration, reduced]);

  const shown = Number.isInteger(to) ? Math.round(n) : n.toFixed(1);
  return <span ref={ref}>{shown}{suffix}</span>;
}

export default function Landing() {
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const heroRef = useRef(null);

  const [stats, setStats] = useState(null);
  const [parts, setParts] = useState([]);
  const [runs, setRuns] = useState([]);

  // Hero content drifts and fades as you scroll past it.
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : 90]);
  const heroFade = useTransform(scrollYProgress, [0, 0.75], [1, reduced ? 1 : 0]);

  useEffect(() => {
    Promise.all([fetchStats(), fetchParts(), fetchRuns(30)])
      .then(([s, p, r]) => { setStats(s); setParts(p); setRuns(r); })
      .catch(() => {});
  }, []);

  /* --------------------------------------------------------- chart data */

  const guardTally = {};
  runs.forEach((r) => (r.failed_guardrails ?? []).forEach((g) => {
    guardTally[g] = (guardTally[g] ?? 0) + 1;
  }));
  const paretoData = Object.entries(guardTally)
    .map(([k, v]) => ({ label: GUARDRAIL_NAME[k] ?? k, value: v }));

  // Stock cover against unit cost: the top-right quadrant is expensive and
  // nearly out, which is exactly what the agent triages first.
  const scatterPoints = parts
    .filter((p) => p.unitCost && p.reorderThreshold)
    .slice(0, 40)
    .map((p) => {
      const cover = (p.currentStock / p.reorderThreshold) * 100;
      return {
        x: Math.round(cover),
        y: Math.round(p.unitCost),
        label: `${p.id} · ${Math.round(cover)}% cover · ${money(p.unitCost)}`,
        tone: p.triggerReady ? (cover <= 35 ? 'crit' : 'warn') : 'ok',
        size: p.criticality === 'critical' ? 7 : p.criticality === 'high' ? 5.5 : 4.5,
      };
    });

  const catTally = {};
  parts.forEach((p) => {
    catTally[p.category] ??= 0;
    if (p.triggerReady) catTally[p.category]++;
  });
  const catData = Object.entries(catTally).map(([k, v]) => ({
    label: k.slice(0, 6),
    value: v,
    tone: v > 3 ? 'crit' : v > 0 ? 'warn' : 'ok',
  }));

  const auto = runs.filter((r) => r.status === 'auto-approved').length;
  const escalated = runs.length - auto;

  return (
    <div className="landing">
      {/* ==================================================== hero */}
      <section className="hero" ref={heroRef}>
        <div className="hero-bg">
          <ShaderBackground className="hero-shader" />
          <div className="hero-mesh"><ConstellationGrid /></div>
          <div className="hero-scrim" />
        </div>

        <motion.div className="hero-content" style={{ y: heroY, opacity: heroFade }}>
          <span className="hero-eyebrow">Autonomous procurement</span>
          <h1 className="hero-title">
            Your factory reorders<br />itself.
          </h1>
          <p className="hero-sub">
            Four agents watch every spare part, pick the supplier, and place the order.
            Anything risky stops for you, with the reasoning attached.
          </p>

          <div className="hero-cta">
            <button className="btn primary lg" onClick={() => navigate('/signin')}>
              Open the console
            </button>
            <button
              className="btn lg"
              onClick={() => document.getElementById('proof')?.scrollIntoView({ behavior: 'smooth' })}
            >
              See it working
            </button>
          </div>

          <div className="hero-stats">
            <div>
              <b><Counter to={stats?.totalParts ?? 0} /></b>
              <i>parts watched</i>
            </div>
            <div>
              <b><Counter to={stats?.partsAtRisk ?? 0} /></b>
              <i>at risk now</i>
            </div>
            <div>
              <b><Counter to={stats?.decisionsProcessed ?? 0} /></b>
              <i>decisions made</i>
            </div>
            <div>
              <b>1.2<span className="unit">s</span></b>
              <i>per decision</i>
            </div>
          </div>
        </motion.div>

        <div className="hero-scroll">scroll</div>
      </section>

      {/* ================================================= the problem */}
      <section className="band">
        <Reveal>
          <div className="band-head">
            <span className="hero-eyebrow">The problem</span>
            <h2 className="band-title">A routine reorder takes four days.</h2>
            <p className="band-sub">
              Buyers compare the same suppliers by hand, every time. Parts run out before
              anyone notices. Nothing scales without hiring more people.
            </p>
          </div>
        </Reveal>
      </section>

      {/* ==================================================== proof */}
      <section className="band" id="proof">
        <Reveal>
          <div className="band-head">
            <span className="hero-eyebrow">Live data</span>
            <h2 className="band-title">Running right now on {stats?.totalParts ?? 40} parts.</h2>
          </div>
        </Reveal>

        <div className="l-2" style={{ marginTop: 26 }}>
          <Reveal>
            <div className="glass">
              <h3>What stops an order</h3>
              <p className="band-note">
                Two causes account for most escalations. Fix those and the rest handles itself.
              </p>
              <Pareto data={paretoData} height={230} />
            </div>
          </Reveal>

          <Reveal delay={0.06}>
            <div className="glass">
              <h3>Where the risk sits</h3>
              <p className="band-note">
                Stock cover against unit price. Red zone is expensive and nearly empty.
              </p>
              <Scatter
                points={scatterPoints}
                height={230}
                xLabel="Stock cover %"
                yLabel="Unit price"
                xThreshold={100}
              />
            </div>
          </Reveal>
        </div>

        <div className="l-2" style={{ marginTop: 14 }}>
          <Reveal>
            <div className="glass">
              <h3>Low stock by category</h3>
              <Bars3D data={catData} height={210} />
            </div>
          </Reveal>

          <Reveal delay={0.06}>
            <div className="glass split">
              <div>
                <h3>Handled without a human</h3>
                <p className="band-note">
                  Safe orders go out on their own. The rest come to you.
                </p>
                <div className="mini-legend">
                  <span><i style={{ background: 'var(--ok)' }} /> Automated {auto}</span>
                  <span><i style={{ background: 'var(--warn)' }} /> Sent to you {escalated}</span>
                </div>
              </div>
              <Donut3D
                slices={[
                  { label: 'Automated', value: auto, tone: 'ok' },
                  { label: 'Sent to you', value: escalated, tone: 'warn' },
                ]}
                center={runs.length ? `${Math.round((auto / runs.length) * 100)}%` : '0%'}
                centerLabel="automated"
              />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ================================================= the agents */}
      <section className="band">
        <Reveal>
          <div className="band-head">
            <span className="hero-eyebrow">How it works</span>
            <h2 className="band-title">Four questions, answered in order.</h2>
          </div>
        </Reveal>

        <div className="steps">
          {[
            { n: '01', q: 'How much do we need?', a: 'Reads 90 days of usage and spots spikes that mean a machine is failing, not just busier production.' },
            { n: '02', q: 'Who should supply it?', a: 'Scores every supplier on reliability, defects, price and delivery time.' },
            { n: '03', q: 'Is it safe to order?', a: 'Four checks. All pass and the order goes out. Any fail and it comes to you with the reason.' },
            { n: '04', q: 'Will it arrive in time?', a: 'Compares delivery against how long stock lasts. Finds a backup supplier when it will not make it.' },
          ].map((s, i) => (
            <Reveal key={s.n} delay={i * 0.05}>
              <div className="step">
                <span className="step-n">{s.n}</span>
                <h3>{s.q}</h3>
                <p>{s.a}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ================================================= the AI moment */}
      <section className="band">
        <Reveal>
          <div className="ai-quote">
            <span className="hero-eyebrow ai">AI advisor</span>
            <blockquote>
              “The gearbox coupling is being used 4.5 times faster than normal, but every
              other part on that line looks fine. This is a machine problem, not a
              stock problem.”
            </blockquote>
            <div className="ai-verdict">
              <span className="badge ai">Investigate equipment</span>
              <span className="band-note">
                It did not order {money(7866144)} of parts. It said the machine is broken.
              </span>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ==================================================== close */}
      <section className="band close">
        <Reveal>
          <h2 className="band-title">See it run.</h2>
          <p className="band-sub">Pick a part, watch four agents work through it in about a second.</p>
          <button className="btn primary lg" onClick={() => navigate('/signin')}>
            Open the console
          </button>
        </Reveal>
        <p className="band-foot">SupplyChain Sentinel · AgentXcelerate</p>
      </section>
    </div>
  );
}
