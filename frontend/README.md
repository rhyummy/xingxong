# AstraProcure — Frontend

Dark enterprise procurement UI matching the 5 screens: Sign In & Workspace
Selector, Dashboard (Operations Overview), Order Feed & Task Queue, Part
Detail & Supplier Intelligence, Order Builder & Approval Flow.

## Setup

```bash
cd astraprocure
npm install
npm run dev
```

Visit http://localhost:5173 — it opens on `/sign-in` and routes to
`/dashboard`, `/orders`, `/parts/:sku`, `/orders/new`.

## Structure

- `src/pages/` — one file per screen (SignIn, Dashboard, OrderFeed, PartDetail, OrderBuilder)
- `src/lib/mockData.ts` — every page's data lives here; swap in real `fetch()`
  calls to your backend (e.g. `http://localhost:4000`) without touching layout code
- `src/lib/useLenis.ts` — inertial smooth-scroll (like likwid.co.in), mounted per page, respects `prefers-reduced-motion`
- `src/components/Reveal.tsx` — scroll-triggered fade/rise wrapper (Framer Motion `whileInView`) used to stagger cards in as you scroll
- `src/components/StatusPill.tsx` — shared pill badge (amber/mint/rose/neutral)

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

That's the same fallback pattern discussed earlier — real data when the
backend is up, mock data (so the UI never looks empty) when it's not.

## Design notes

- Palette: near-black `#0a0a0a` background, `#111214` cards, amber/mint/rose
  status pills, white primary actions — matches your screenshots exactly.
- Type: Space Grotesk for headings, Inter for body/UI, JetBrains Mono available for data-dense numbers.
- Motion: Lenis for smooth inertial scrolling + Framer Motion `whileInView` reveals on every card grid, so content settles into place as you scroll rather than popping in — the likwid.co.in reference feel, kept subtle since this is a working dashboard, not a marketing site.
