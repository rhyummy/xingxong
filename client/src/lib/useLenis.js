import { useEffect } from 'react';
import Lenis from 'lenis';

/**
 * Inertial smooth scrolling on the console's scroll container.
 *
 * The app scrolls inside `.page`, not the window, so Lenis is pointed at that
 * element rather than the document. Disabled outright when the viewer prefers
 * reduced motion — inertia is exactly what that setting exists to switch off.
 */
export function useLenis(selector = '.page') {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const wrapper = document.querySelector(selector);
    const content = wrapper?.firstElementChild;
    if (!wrapper || !content) return;

    const lenis = new Lenis({
      wrapper,
      content,
      duration: 0.85,
      easing: (t) => 1 - Math.pow(1 - t, 3),
      smoothWheel: true,
    });

    let frame;
    const raf = (time) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, [selector]);
}
