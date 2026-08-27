import { motion, useReducedMotion } from 'framer-motion';

/**
 * Scroll-triggered fade-and-rise wrapper.
 *
 * Kept deliberately short and small in travel: this is a working console, not
 * a landing page, and an operator scanning a table should never be waiting on
 * an animation. `once` means content settles one time and stays put.
 * Returns children untouched when the viewer prefers reduced motion.
 */
export default function Reveal({ children, delay = 0, className = '' }) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15, margin: '0px 0px -40px 0px' }}
      transition={{ duration: 0.32, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
