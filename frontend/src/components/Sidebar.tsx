import { useState, type ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ListOrdered,
  PackagePlus,
  Boxes,
  LineChart,
  Users,
  Settings,
  ShieldCheck,
  ChevronsLeft,
  ChevronsRight,
  Building2,
  LogOut,
  Rocket,
  Lock,
} from "lucide-react";
import { workspaces } from "../lib/mockData";
import { ThemeToggle } from "./ThemeToggle";

interface NavItem {
  label: string;
  to?: string;
  icon: ReactNode;
  badge?: string;
  disabled?: boolean;
}

interface NavSection {
  heading: string;
  items: NavItem[];
}

export const SIDEBAR_SECTIONS: NavSection[] = [
  {
    heading: "Overview",
    items: [{ label: "Dashboard", to: "/dashboard", icon: <LayoutDashboard size={17} /> }],
  },
  {
    heading: "Operations",
    items: [
      { label: "Order Feed", to: "/orders", icon: <ListOrdered size={17} /> },
      { label: "New Order", to: "/orders/new", icon: <PackagePlus size={17} /> },
      { label: "Parts Catalog", to: "/parts/AX-4521-PL", icon: <Boxes size={17} /> },
    ],
  },
  {
    heading: "Insights",
    items: [
      { label: "Analytics", icon: <LineChart size={17} />, badge: "Soon", disabled: true },
      { label: "Suppliers", icon: <Building2 size={17} />, badge: "Soon", disabled: true },
    ],
  },
  {
    heading: "Administration",
    items: [
      { label: "Team & Roles", icon: <Users size={17} />, badge: "Soon", disabled: true },
      { label: "Settings", icon: <Settings size={17} />, badge: "Soon", disabled: true },
      { label: "Compliance", icon: <ShieldCheck size={17} />, badge: "Soon", disabled: true },
    ],
  },
];

/**
 * Persistent left navigation used across every authenticated screen
 * (Dashboard, Order Feed, Order Builder, Part Detail). Collapses to an
 * icon-only rail to give dense data screens more breathing room, and
 * carries the workspace switcher, theme toggle, and session controls so
 * they don't have to be duplicated in every page's own header.
 */
export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const activeWorkspace = workspaces[0];

  return (
    <aside
      className={`hidden md:flex flex-col shrink-0 border-r divider bg-panel/60 backdrop-blur h-screen sticky top-0 transition-[width] duration-200 ease-out ${
        collapsed ? "w-[76px]" : "w-[264px]"
      }`}
    >
      {/* Brand */}
      <div className={`flex items-center gap-3 px-4 h-16 border-b divider ${collapsed ? "justify-center px-0" : ""}`}>
        <button
          onClick={() => navigate("/dashboard")}
          className="h-9 w-9 shrink-0 rounded-full bg-fg text-ink grid place-items-center"
          aria-label="Go to dashboard"
        >
          <Rocket size={16} strokeWidth={2.3} />
        </button>
        {!collapsed && (
          <div className="min-w-0">
            <div className="font-display text-sm font-semibold tracking-tight truncate">AstraProcure</div>
            <div className="text-[11px] text-fg/35 truncate">Procurement Ops</div>
          </div>
        )}
      </div>

      {/* Workspace switcher */}
      <div className={`px-3 pt-3 ${collapsed ? "px-2" : ""}`}>
        <button
          onClick={() => navigate("/login")}
          title={activeWorkspace.name}
          className={`w-full flex items-center gap-2.5 rounded-xl border divider bg-panel2 px-3 py-2.5 text-left hover:border-fg/20 transition-colors ${
            collapsed ? "justify-center px-0" : ""
          }`}
        >
          <span className="h-7 w-7 shrink-0 rounded-full bg-mint/15 text-mint grid place-items-center">
            <Building2 size={14} />
          </span>
          {!collapsed && (
            <span className="min-w-0">
              <span className="block text-xs font-medium truncate">{activeWorkspace.name}</span>
              <span className="block text-[11px] text-fg/35 truncate">Switch workspace</span>
            </span>
          )}
        </button>
      </div>

      {/* Nav sections */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {SIDEBAR_SECTIONS.map((section) => (
          <div key={section.heading}>
            {!collapsed && (
              <div className="px-3 mb-1.5 text-[10px] font-semibold tracking-wider uppercase text-fg/30">
                {section.heading}
              </div>
            )}
            <div className="space-y-1">
              {section.items.map((item) =>
                item.to ? (
                  <NavLink
                    key={item.label}
                    to={item.to}
                    end={item.to === "/dashboard"}
                    className={({ isActive }) =>
                      `nav-link ${isActive ? "active" : ""} ${collapsed ? "justify-center px-0" : ""}`
                    }
                    title={collapsed ? item.label : undefined}
                  >
                    {item.icon}
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </NavLink>
                ) : (
                  <div
                    key={item.label}
                    aria-disabled
                    title={collapsed ? `${item.label} — coming soon` : undefined}
                    className={`nav-link cursor-not-allowed opacity-45 ${collapsed ? "justify-center px-0" : ""}`}
                  >
                    {item.icon}
                    {!collapsed && (
                      <span className="flex items-center gap-1.5 truncate">
                        {item.label}
                        <Lock size={10} className="text-fg/40" />
                      </span>
                    )}
                    {!collapsed && item.badge && (
                      <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-fg/10 text-fg/40">
                        {item.badge}
                      </span>
                    )}
                  </div>
                )
              )}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer: theme + user + collapse */}
      <div className="border-t divider p-3 space-y-3">
        {!collapsed ? (
          <div className="flex items-center justify-between px-1">
            <ThemeToggle size="sm" />
            <button
              onClick={() => setCollapsed(true)}
              className="h-7 w-7 grid place-items-center rounded-full hover:bg-panel2 text-fg/40 hover:text-fg/80 transition-colors"
              aria-label="Collapse sidebar"
            >
              <ChevronsLeft size={15} />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <ThemeToggle size="sm" />
            <button
              onClick={() => setCollapsed(false)}
              className="h-7 w-7 grid place-items-center rounded-full hover:bg-panel2 text-fg/40 hover:text-fg/80 transition-colors"
              aria-label="Expand sidebar"
            >
              <ChevronsRight size={15} />
            </button>
          </div>
        )}

        <button
          onClick={() => navigate("/login")}
          className={`w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2 hover:bg-panel2 transition-colors ${
            collapsed ? "justify-center px-0" : ""
          }`}
        >
          <span className="h-8 w-8 shrink-0 rounded-full bg-accent/15 text-accent grid place-items-center text-xs font-semibold">
            EC
          </span>
          {!collapsed && (
            <span className="min-w-0 text-left">
              <span className="block text-xs font-medium truncate">Evelyn Carter</span>
              <span className="block text-[11px] text-fg/35 truncate">Procurement Manager</span>
            </span>
          )}
          {!collapsed && <LogOut size={14} className="ml-auto text-fg/35" />}
        </button>
      </div>
    </aside>
  );
}
