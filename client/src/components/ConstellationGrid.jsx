/**
 * Interactive node mesh. Converted from the supplied TypeScript component:
 * types removed, Tailwind wrapper replaced with project CSS, palette retuned
 * to the console teal, and the canvas made transparent so it can layer over
 * other backgrounds.
 *
 * Spring-mass-damping physics: nodes are pushed by cursor velocity and pulled
 * back to their anchor by Hooke's law.
 */
import { useEffect, useRef } from 'react';

export default function ConstellationGrid({ height = '100%' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Static grid under reduced motion: draw once, no physics loop.
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    let width = 0;
    let h = 0;
    let dpr = 1;

    const mouse = { x: -1000, y: -1000, prevX: -1000, prevY: -1000, vx: 0, vy: 0, radius: 200 };
    let nodes = [];

    const initNodes = () => {
      nodes = [];
      const spacing = 58;
      const cols = Math.ceil(width / spacing) + 1;
      const rows = Math.ceil(h / spacing) + 1;
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x = i * spacing;
          const y = j * spacing;
          nodes.push({
            x, y, vx: 0, vy: 0, baseX: x, baseY: y,
            radius: Math.random() * 1.1 + 1,
            // Part-code style labels rather than hex, to fit the domain.
            label: `P-${1000 + ((i * 7 + j * 3) % 40)}`,
            pulse: Math.random() * Math.PI * 2,
          });
        }
      }
    };

    const handleResize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect?.width ?? window.innerWidth;
      h = rect?.height ?? window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      initNodes();
    };

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };
    const handleMouseLeave = () => { mouse.x = -1000; mouse.y = -1000; };

    handleResize();
    window.addEventListener('resize', handleResize);
    if (!reduced) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseleave', handleMouseLeave);
    }

    let lastTime = performance.now();

    const render = (now) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      mouse.vx = (mouse.x - mouse.prevX) / (dt * 1000 || 1);
      mouse.vy = (mouse.y - mouse.prevY) / (dt * 1000 || 1);
      mouse.prevX = mouse.x;
      mouse.prevY = mouse.y;
      const speed = Math.sqrt(mouse.vx * mouse.vx + mouse.vy * mouse.vy);

      const nodeColor = '168, 179, 187';
      const accentColor = '77, 184, 196';

      // Transparent, so this layers over the shader or a flat ground.
      ctx.clearRect(0, 0, width, h);

      const SPRING_K = 18;
      const DAMPING = 0.82;

      for (const n of nodes) {
        n.pulse += dt * 3;
        const dx = mouse.x - n.x;
        const dy = mouse.y - n.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < mouse.radius && dist > 0) {
          const power = 1 - dist / mouse.radius;
          const force = power * (1400 + speed * 140);
          const angle = Math.atan2(dy, dx);
          n.vx -= Math.cos(angle) * force * dt;
          n.vy -= Math.sin(angle) * force * dt;
        }

        n.vx += (n.baseX - n.x) * SPRING_K * dt;
        n.vy += (n.baseY - n.y) * SPRING_K * dt;
        n.vx *= DAMPING;
        n.vy *= DAMPING;
        n.x += n.vx * dt * 60;
        n.y += n.vy * dt * 60;
      }

      const MAX_CONN = 78;
      const MAX_CONN_SQ = MAX_CONN * MAX_CONN;

      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const n2 = nodes[j];
          const ndx = n.x - n2.x;
          const ndy = n.y - n2.y;
          const distSq = ndx * ndx + ndy * ndy;
          if (distSq < MAX_CONN_SQ) {
            const nDist = Math.sqrt(distSq);
            const alpha = (1 - nDist / MAX_CONN) * 0.14;
            ctx.strokeStyle = `rgba(${nodeColor}, ${alpha})`;
            ctx.lineWidth = 0.7;
            ctx.beginPath();
            ctx.moveTo(n.x, n.y);
            ctx.lineTo(n2.x, n2.y);
            ctx.stroke();
          }
        }
      }

      for (const n of nodes) {
        const dx = mouse.x - n.x;
        const dy = mouse.y - n.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const isNear = dist < mouse.radius;
        const baseAlpha = isNear ? 0.9 : 0.2 + Math.sin(n.pulse) * 0.08;

        ctx.fillStyle = isNear
          ? `rgba(${accentColor}, ${baseAlpha})`
          : `rgba(${nodeColor}, ${baseAlpha})`;

        const r = isNear ? n.radius * 2.1 : n.radius + Math.sin(n.pulse) * 0.3;
        ctx.beginPath();
        ctx.arc(n.x, n.y, Math.max(0.5, r), 0, Math.PI * 2);
        ctx.fill();

        if (dist < 90) {
          const ring = ((n.pulse * 20) % 30) + 4;
          ctx.strokeStyle = `rgba(${accentColor}, ${(1 - ring / 34) * 0.35})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(n.x, n.y, ring, 0, Math.PI * 2);
          ctx.stroke();

          ctx.font = '9px "JetBrains Mono", ui-monospace, monospace';
          ctx.fillStyle = `rgba(${accentColor}, 0.8)`;
          ctx.fillText(n.label, n.x + 10, n.y - 10);
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    if (reduced) render(performance.now());
    else animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height }} />;
}
