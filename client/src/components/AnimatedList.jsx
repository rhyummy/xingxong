import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

/**
 * Notification-feed entrance. Each child rises into place and the ones already
 * present shift down, so an agent finishing reads like a report arriving
 * rather than a block of markup appearing.
 *
 * `layout` on the items is what produces the settle: framer measures the shift
 * and tweens it instead of snapping.
 */
export default function AnimatedList({ children, className = '' }) {
  const reduced = useReducedMotion();
  const items = Array.isArray(children) ? children.filter(Boolean) : [children].filter(Boolean);

  if (reduced) {
    return <div className={`stack ${className}`}>{items}</div>;
  }

  return (
    <div className={`stack ${className}`}>
      <AnimatePresence initial={false}>
        {items.map((child, i) => (
          <motion.div
            key={child?.key ?? i}
            layout
            initial={{ opacity: 0, y: 26, scale: 0.965 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.97 }}
            transition={{
              type: 'spring',
              stiffness: 320,
              damping: 26,
              mass: 0.7,
              opacity: { duration: 0.22 },
            }}
          >
            {child}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
