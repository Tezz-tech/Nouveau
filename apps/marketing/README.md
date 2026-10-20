# @nouveau/marketing

Part of the Nouveau monorepo — see the [root README](../../README.md).
This package is the public marketing site: a public marketing site for
Nouveau, a professional trading firm offering Fund Management, Trading
Bots, and Trader Intelligence & Simulation. Positioning is
institutional-grade and deliberately vague about the underlying trading
strategy (proprietary by design) while being transparent about allocation
logic and risk controls.

**As of 2026-10-20, this is informational-only** — Home, Services, About,
Support, NotFound. Login, signup, onboarding, and the account dashboard
were removed along with the backend that powered them, pending a new
architecture pattern. That prior state (including the `apps/api` backend
and `packages/core`/`db`/`security`) is preserved in git history under the
tag `pre-reset-2026-10-20` if anything needs to be referenced while the new
pattern is designed.

## Stack

- **Vite + React 18 + TypeScript**, client-side routed with **React Router**.
- **Tailwind CSS** for styling, with the brand palette defined as theme
  tokens (no arbitrary hex values in components).
- **Framer Motion** for component-level animation, page transitions, and
  scroll reveals.
- **GSAP + ScrollTrigger** for `prefers-reduced-motion`-aware scroll sync
  (registered globally; available for any future scroll-driven sequence).
- **Lenis** for smooth scrolling (`lerp: 0.08`), synced to GSAP's ticker,
  and exposed via a `useLenis()` hook (`src/components/SmoothScroll.tsx`) so
  in-page anchor links (`#services`, `/support#faq`) scroll smoothly instead
  of jumping — React Router's `<Link>` doesn't trigger the browser's native
  hash-scroll behavior on its own, so `src/components/ScrollToTop.tsx`
  handles it explicitly on every route/hash change.
- **lucide-react** for the icon system (`src/components/ui/Icon.tsx` maps
  short semantic names — `fund`, `bots`, `intelligence`, etc. — to specific
  icons, so content files never import an icon library directly).
- **react-helmet-async** for per-route `<title>`, meta description, and
  Open Graph tags (there's no server-rendered `<head>` in a Vite SPA, so
  this is the mechanism instead of Next.js's metadata API).

## Getting started

Run from the monorepo root (dependencies are hoisted there):

```bash
npm install
npm run dev -w @nouveau/marketing      # starts Vite on http://localhost:5173
npm run build -w @nouveau/marketing    # type-checks (tsc) and produces a production build in dist/
npm run preview -w @nouveau/marketing  # serves the production build locally
```

Or `cd apps/marketing` first and drop the `-w @nouveau/marketing` from each
command. No backend, API, or env vars are needed to run this right now —
it's a static informational site.

## Pages

- `/` **Home**, `/services` **Services**, `/about` **About**, `/support`
  **Support** — the informational site, untouched by the 2026-10-20
  removal.
- `*` **NotFound** — catches everything else, including `/login`,
  `/signup`, `/dashboard/*`, which no longer resolve to anything. The
  header/footer still link to `/login` and `/signup` (not yet removed,
  since what replaces them is part of the new pattern still to come) — they
  currently 404 by design, not by bug.

## Deploying to Vercel

See the root README for the monorepo layout. This app deploys as a static
Vite build; no server runtime is required for it.
