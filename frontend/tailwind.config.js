/** @type {import('tailwindcss').Config} */

// Small helper so every color token supports Tailwind's opacity modifiers
// (bg-fg/40, text-amber/70, etc.) while still being swappable at runtime via
// the CSS custom properties defined in src/index.css.
function withOpacity(variable) {
  return ({ opacityValue }) => {
    if (opacityValue !== undefined) {
      return `rgb(var(${variable}) / ${opacityValue})`;
    }
    return `rgb(var(${variable}))`;
  };
}

export default {
  darkMode: ["selector", '[data-theme="dark"]'],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: withOpacity("--color-bg"),
        panel: withOpacity("--color-panel"),
        panel2: withOpacity("--color-panel2"),
        line: withOpacity("--color-line"),
        fg: withOpacity("--color-fg"),
        amber: withOpacity("--color-amber"),
        mint: withOpacity("--color-mint"),
        rose: withOpacity("--color-rose"),
        accent: withOpacity("--color-accent"),
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      boxShadow: {
        glow: "0 0 0 1px rgb(var(--color-line)), 0 20px 60px -20px rgb(var(--color-accent) / 0.35)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: 0, transform: "translateY(6px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: 1 },
          "50%": { opacity: 0.55 },
        },
      },
      animation: {
        "fade-in": "fade-in .5s cubic-bezier(0.22,1,0.36,1) both",
        "pulse-soft": "pulse-soft 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
