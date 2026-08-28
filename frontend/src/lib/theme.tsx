import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ThemeMode = "dark" | "light";

const STORAGE_KEY = "astraprocure:theme";

interface ThemeContextValue {
  theme: ThemeMode;
  /** True while the value in state came from the user's OS preference
   * rather than an explicit in-app choice — used so the first toggle
   * always feels intentional instead of "fighting" a stale system value. */
  isSystemDefault: boolean;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSystemPreference(): ThemeMode {
  if (typeof window === "undefined" || !window.matchMedia) return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function readStoredTheme(): ThemeMode | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "dark" || stored === "light") return stored;
  } catch {
    // localStorage can throw in locked-down / private browsing contexts —
    // fall back to system preference rather than crash the app.
  }
  return null;
}

function applyThemeToDocument(theme: ThemeMode) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  root.style.colorScheme = theme;
  // Keep a plain class too, in case any third-party widget looks for it
  // instead of the data-attribute (e.g. some embedded chart libraries).
  root.classList.toggle("theme-light", theme === "light");
  root.classList.toggle("theme-dark", theme === "dark");
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const stored = useMemo(readStoredTheme, []);
  const [theme, setThemeState] = useState<ThemeMode>(stored ?? getSystemPreference());
  const [isSystemDefault, setIsSystemDefault] = useState(stored === null);

  // Apply immediately on mount and whenever the theme changes.
  useEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  // If the user never made an explicit choice, keep following the OS-level
  // preference live (e.g. macOS switching to Night Shift / Dark Mode
  // schedule automatically).
  useEffect(() => {
    if (!isSystemDefault || typeof window === "undefined" || !window.matchMedia) return;
    const media = window.matchMedia("(prefers-color-scheme: light)");
    const handler = (event: MediaQueryListEvent) => {
      setThemeState(event.matches ? "light" : "dark");
    };
    media.addEventListener?.("change", handler);
    return () => media.removeEventListener?.("change", handler);
  }, [isSystemDefault]);

  const setTheme = useCallback((next: ThemeMode) => {
    setIsSystemDefault(false);
    setThemeState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Ignore storage failures — theme still applies for this session.
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, isSystemDefault, setTheme, toggleTheme }),
    [theme, isSystemDefault, setTheme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a <ThemeProvider>. Did you forget to wrap <App />?");
  }
  return ctx;
}
