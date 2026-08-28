/**
 * Badge with a rotating conic border. Reserved for state that genuinely needs
 * the eye: a demand spike, an order waiting on a human. Using it anywhere else
 * would spend the attention it buys.
 */
export default function AnimatedBadge({ text, tone = 'crit', title }) {
  return (
    <span className={`abadge abadge-${tone}`} title={title}>
      <span className="abadge-spin" aria-hidden="true" />
      <span className="abadge-inner">
        <span className="abadge-dot" />
        {text}
      </span>
    </span>
  );
}
