import { useState, type ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, Menu, User, X } from "lucide-react";
import { Sidebar, SIDEBAR_SECTIONS } from "./Sidebar";
import { ThemeToggle } from "./ThemeToggle";

interface AppShellProps {
  /** Large page title shown in the sticky topbar (e.g. "Dashboard"). */
  title: string;
  /** Optional one-line context shown under the title on wider screens. */
  subtitle?: string;
  /** Extra controls rendered on the right of the topbar, before the bell
   * and profile menu (e.g. page-specific buttons like "New Order"). */
  actions?: ReactNode;
  children: ReactNode;
}

/**
 * Shared authenticated-area layout: a persistent desktop sidebar, a
 * slide-over mobile nav, and a sticky topbar with the page title, optional
 * page-specific actions, notifications, theme toggle and profile menu.
 * Every internal page (Dashboard, Order Feed, Order Builder, Part Detail)
 * renders its unique content as children of this shell instead of
 * duplicating its own header/nav chrome.
 */
export function AppShell({ title, subtitle, actions, children }: AppShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-ink flex">
      <Sidebar />

      {/* Mobile slide-over nav */}
      <AnimatePresence>
        {mobileNavOpen && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/60 z-40 md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileNavOpen(false)}
            />
            <motion.div
              className="fixed top-0 left-0 bottom-0 w-[80%] max-w-[300px] bg-panel border-r divider z-50 md:hidden flex flex-col"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="flex items-center justify-between px-4 h-16 border-b divider">
                <span className="font-display font-semibold text-sm">AstraProcure</span>
                <button
                  onClick={() => setMobileNavOpen(false)}
                  className="h-8 w-8 grid place-items-center rounded-full hover:bg-panel2"
                  aria-label="Close menu"
                >
                  <X size={16} />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
                {SIDEBAR_SECTIONS.map((section) => (
                  <div key={section.heading}>
                    <div className="px-3 mb-1.5 text-[10px] font-semibold tracking-wider uppercase text-fg/30">
                      {section.heading}
                    </div>
                    <div className="space-y-1">
                      {section.items.map((item) =>
                        item.to ? (
                          <NavLink
                            key={item.label}
                            to={item.to}
                            onClick={() => setMobileNavOpen(false)}
                            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
                          >
                            {item.icon}
                            <span>{item.label}</span>
                          </NavLink>
                        ) : (
                          <div key={item.label} className="nav-link opacity-45 cursor-not-allowed">
                            {item.icon}
                            <span>{item.label}</span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </nav>
              <div className="border-t divider p-3">
                <ThemeToggle showLabel />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main column */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-4 px-5 md:px-8 h-16 border-b divider bg-ink/85 backdrop-blur">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileNavOpen(true)}
              className="md:hidden h-9 w-9 grid place-items-center rounded-full bg-panel2 border divider"
              aria-label="Open menu"
            >
              <Menu size={16} />
            </button>
            <div className="min-w-0">
              <h1 className="font-display text-base md:text-lg font-semibold tracking-tight truncate">{title}</h1>
              {subtitle && <p className="hidden sm:block text-fg/40 text-xs truncate">{subtitle}</p>}
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3 shrink-0">
            {actions}
            <div className="hidden md:block">
              <ThemeToggle size="sm" />
            </div>
            <button className="btn-primary h-9 w-9 md:w-auto md:px-4 grid md:flex place-items-center gap-2 relative">
              <Bell size={14} />
              <span className="hidden md:inline text-sm">Alerts</span>
              <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-amber" />
            </button>
            <button
              onClick={() => navigate("/login")}
              className="btn-ghost h-9 w-9 md:w-auto md:px-4 grid md:flex place-items-center gap-2"
            >
              <User size={14} />
              <span className="hidden md:inline text-sm">Evelyn Carter</span>
            </button>
          </div>
        </header>

        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
