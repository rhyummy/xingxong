/**
 * MOCK DATA — no backend equivalent yet.
 *
 * Multi-site operation is out of scope for the current backend: everything
 * runs against one catalog. These entries drive the workspace selector and
 * the site chip in the command bar only; nothing here reaches the pipeline.
 * Replace with a `GET /api/workspaces` call when sites become real.
 */
export const WORKSPACES = [
  { id: 'north',   name: 'North Manufacturing Plant', location: 'Block A3 — Pune, MH',      tz: 'IST', status: 'online' },
  { id: 'river',   name: 'River Distribution Center', location: 'Dock 7 — Chennai, TN',     tz: 'IST', status: 'maintenance' },
  { id: 'east',    name: 'East Warehouse',            location: 'Lot 2 — Kolkata, WB',      tz: 'IST', status: 'degraded' },
  { id: 'central', name: 'Central Packaging Hub',     location: 'Harbor Rd — Kochi, KL',    tz: 'IST', status: 'offline' },
];

export const WORKSPACE_TONE = {
  online: 'ok',
  maintenance: 'warn',
  degraded: 'warn',
  offline: 'crit',
};

const KEY = 'sentinel.session';

export function loadSession() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveSession(session) {
  try {
    localStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    /* private browsing — session simply will not persist */
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing to do */
  }
}
