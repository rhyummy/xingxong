import { Moon, Sun } from "lucide-react";
import { useTheme } from "../lib/theme";

/**
 * A compact, accessible dark/light switch. Renders a pill-shaped track with
 * a sliding knob and swaps the sun/moon glyph so the current state is
 * legible even to someone skimming quickly.
 */
export function ThemeToggle({
  size = "md",
  showLabel = false,
  className = "",
}: {
  size?: "sm" | "md";
  showLabel?: boolean;
  className?: string;
}) {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === "light";

  const dims = size === "sm" ? { track: "w-12 h-7", knob: "h-5 w-5", icon: 11 } : { track: "w-14 h-8", knob: "h-6 w-6", icon: 13 };

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {showLabel && (
        <span className="text-xs text-fg/45 select-none">{isLight ? "Light mode" : "Dark mode"}</span>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={isLight}
        aria-label={`Switch to ${isLight ? "dark" : "light"} mode`}
        onClick={toggleTheme}
        className={`theme-toggle-track relative ${dims.track} rounded-full flex items-center px-1 transition-colors duration-200`}
      >
        <Sun
          size={dims.icon}
          className={`absolute left-1.5 transition-opacity duration-200 text-amber ${isLight ? "opacity-100" : "opacity-30"}`}
        />
        <Moon
          size={dims.icon}
          className={`absolute right-1.5 transition-opacity duration-200 text-accent ${isLight ? "opacity-30" : "opacity-100"}`}
        />
        <span
          className={`relative z-10 ${dims.knob} rounded-full bg-fg shadow-md transform transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            isLight ? "translate-x-[1.6rem]" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
