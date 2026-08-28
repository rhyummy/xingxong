type Tone = "amber" | "mint" | "rose" | "neutral" | "accent";

const TONES: Record<Tone, string> = {
  amber: "bg-amber/15 text-amber",
  mint: "bg-mint/15 text-mint",
  rose: "bg-rose/15 text-rose",
  neutral: "bg-white/10 text-white/70",
  accent: "bg-accent/15 text-accent",
};

export function StatusPill({ tone = "neutral", children }: { tone?: Tone; children: React.ReactNode }) {
  return <span className={`pill ${TONES[tone]}`}>{children}</span>;
}
