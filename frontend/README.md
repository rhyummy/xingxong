#Frontend

Enterprise procurement UI with a public marketing site, a dedicated login
flow, and a persistent-sidebar operations app (Dashboard, Order Feed, Order
Builder, Part Detail) — all themeable between dark and light mode.

## Setup

```bash
cd astraprocure
npm install
npm run dev
```

Visit http://localhost:5173 — it opens on the public landing page (`/`).

## Routes

| Path            | Page                                             |
| --------------- | ------------------------------------------------- |
| `/`             | Landing — public marketing page                   |
| `/login`        | Workspace selector + sign-in (credentials/SSO/MFA) |
| `/dashboard`    | Operations overview (KPIs, live feed, alerts)      |
| `/orders`       | Order Feed — task queue + task detail              |
| `/orders/new`   | Order Builder — composer, pricing, approvals       |
| `/parts/:sku`   | Part Detail — suppliers, history, fill simulator    |
| `/sign-in`      | Redirects to `/login` (back-compat)                |

## Structure

- `src/pages/` — one file per screen: `Landing`, `Login`, `Dashboard`,
  `OrderFeed`, `PartDetail`, `OrderBuilder`
- `src/components/AppShell.tsx` — shared authenticated-area layout: sidebar +
  sticky topbar + mobile slide-over nav. Every internal page renders its own
  content as `children` of this shell instead of duplicating header/nav code.
- `src/components/Sidebar.tsx` — persistent left nav: workspace switcher,
  sectioned links, theme toggle, user/sign-out. Exports `SIDEBAR_SECTIONS` so
  the mobile drawer in `AppShell` can reuse the same nav data.
- `src/components/ThemeToggle.tsx` — animated sun/moon dark/light switch.
- `src/lib/theme.tsx` — `ThemeProvider` + `useTheme()`. Persists the choice to
  `localStorage`, follows the OS preference live until the user overrides it,
  and toggles `data-theme` on `<html>`. `index.html` also carries a tiny
  inline script that applies the stored theme before React mounts, so there's
  no flash of the wrong theme on load.
- `src/lib/mockData.ts` — every page's data lives here; swap in real
  `fetch()` calls to your backend (e.g. `http://localhost:4000`) without
  touching layout code.
- `src/lib/useLenis.ts` — inertial smooth-scroll, mounted per page, respects
  `prefers-reduced-motion`.
- `src/components/Reveal.tsx` — scroll-triggered fade/rise wrapper (Framer
  Motion `whileInView`) used to stagger cards in as you scroll.
- `src/components/StatusPill.tsx` — shared pill badge (amber/mint/rose/neutral/accent).

## Theming

All colors are CSS custom properties defined in `src/index.css` under
`:root, [data-theme="dark"]` and `[data-theme="light"]`, and mapped into
Tailwind color names (`ink`, `panel`, `panel2`, `line`, `fg`, `amber`, `mint`,
`rose`, `accent`) in `tailwind.config.js` via an RGB-triplet + opacity-value
helper — so utilities like `bg-fg/10` or `text-amber/70` keep working under
both themes. Toggle it anywhere with `useTheme()` or drop in `<ThemeToggle />`.

## Connecting to your backend

Each page currently imports static data from `mockData.ts`. To wire up the
real API on port 4000, replace the import with a small hook, e.g.:

```ts
const [data, setData] = useState(mockKpis);
useEffect(() => {
  fetch("http://localhost:4000/api/kpis")
    .then(r => r.json())
    .then(setData)
    .catch(() => {}); // keeps mock data as fallback
}, []);
```

Real data when the backend is up, mock data (so the UI never looks empty)
when it's not.

## Design notes

- Palette: near-black `#0a0a0a` background / near-white `#f6f6f8` in light
  mode, with amber/mint/rose status pills and an inverted (bg↔fg) primary
  button that stays legible in either theme.
- Type: Space Grotesk for headings, Inter for body/UI, JetBrains Mono
  available for data-dense numbers.
- Motion: Lenis for smooth inertial scrolling + Framer Motion `whileInView`
  reveals on every card grid, so content settles into place as you scroll
  rather than popping in.
