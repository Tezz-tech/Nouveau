# Nouveau — marketing site

A public marketing site for Nouveau, a professional trading firm offering
Fund Management, Trading Bots, and Trader Intelligence & Simulation.
Positioning is institutional-grade and deliberately vague about the
underlying trading strategy (proprietary by design) while being transparent
about allocation logic and risk controls. No backend, no auth, no live data
— every form is visual only and every button either routes to another page
or does nothing.

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

```bash
npm install
npm run dev       # starts Vite on http://localhost:5173
npm run build     # type-checks (tsc) and produces a production build in dist/
npm run preview   # serves the production build locally
```

## Deploying to Vercel

This is a static single-page app (no server, no API routes), so Vercel's
default Vite preset handles it out of the box: it runs `npm run build` and
serves `dist/`. `vercel.json` adds the one thing the default preset doesn't
do for you — a catch-all rewrite to `index.html` so that client-side routes
resolve correctly on a hard refresh or direct link, instead of 404ing
(static files under `public/` are still served directly and aren't
affected by the rewrite). `package.json` also pins a `"node": ">=18.0.0"`
engine range.

Two ways to ship it:

- **Vercel CLI, no git required**: `npx vercel` from this directory (first
  run prompts you to log in and link/create a project), then `npx vercel
  --prod` to promote it to production.
- **Git-connected, auto-deploy on push**: push this directory to a GitHub/
  GitLab/Bitbucket repo and import it at vercel.com/new — every push then
  deploys automatically, with preview deployments on branches/PRs.

The only thing worth doing once you have a real domain: update `site.url`
in `src/content/site.ts` and the URLs in `public/sitemap.xml` — they
currently point at the placeholder `https://nouveau.example`.

## Project structure

```
src/
  components/       shared components (Header, Footer, MobileDrawer, SmoothScroll, ScrollToTop, PageWipe, Seo)
    motion/          motion primitives (RevealLines, Hairline)
    ui/              design-system primitives (Button, Container, Accordion, form fields, Figure, Icon, Glow)
  content/           all page copy, as typed objects — see "Editing copy" below
  lib/motion.ts      centralised motion variants, easing, durations, stagger values
  pages/             one file per route: Home, Services, About, Support, Login, Signup, NotFound
public/
  images/            the two About-page portraits + CREDITS.md documenting their source
.mcp.json            21st.dev MCP server config (url only — no secret; see below)
.env                 gitignored — holds TWENTYFIRST_API_KEY referenced by .mcp.json
```

Routes: `/`, `/services`, `/about`, `/support`, `/login`, `/signup`.
`/pricing` and `/how-it-works` from an earlier iteration of this site were
removed along with the reserve-mechanic content model they described.

## Changing the palette

All brand colours live in **`tailwind.config.ts`** under `theme.extend.colors`
(`paper`, `paper-2`, `ink`, `slate`, `slate-light`, `navy`, `navy-deep`,
`navy-line`, `gold`, `gold-light`, `gold-deep`) and are mirrored as CSS
custom properties in **`src/index.css`** (`:root`). If you change a colour,
update it in both places.

Gold text on the light `paper`/`paper-2` backgrounds must use `gold-deep`,
not `gold` — `gold` is reserved for the navy/navy-deep surfaces, where it
has enough contrast to read. `slate-light` exists specifically for
secondary/muted text on dark surfaces (the footer) — plain `slate` fails
WCAG AA (3.4:1) against `navy-deep`; `slate-light` clears it (6.1:1). If you
introduce a new gold-on-light or slate-on-dark text combination anywhere,
verify contrast before shipping it — it's easy to reintroduce this exact
failure mode by copying a pattern from a light-background section into a
dark one, or vice versa.

## Changing the fonts

Fonts are loaded from Google Fonts via the `<link>` tag in **`index.html`**
(`Space Grotesk` for display/headings, `Inter` for body/UI text,
`JetBrains Mono` for money figures and statistics). The CSS variables that
map them to Tailwind's `font-display` / `font-text` / `font-mono` utilities
are set in **`src/index.css`**. To swap a typeface: change the Google Fonts
URL in `index.html` and the corresponding `--font-*` variable in
`index.css`.

## Editing copy

Every word on the site lives in **`src/content/*.ts`** as typed objects —
`home.ts`, `services.ts`, `about.ts`, `support.ts`, `auth.ts`, and shared
nav/footer/legal text in `site.ts`. Edit these files directly; the page
components in `src/pages/` just import and render them, so copy changes
never require touching JSX.

**The flags/currencies row mentioned in an earlier brief was intentionally
left out** — it implied a specific list of supported countries and
currencies, which is a factual claim that shouldn't be invented. Add it
back (e.g. a new section in `home.ts` plus a small marquee or grid
component) once you have the real list.

## Motion system

`src/lib/motion.ts` centralises the easing curve
(`cubic-bezier(0.22, 1, 0.36, 1)`), durations, and stagger values, plus a
handful of named variants (`clipRiseLine` for the hero, `hairlineDraw`,
`settleFromLeft`, `softAppear`). `prefers-reduced-motion` is respected
throughout — reduced-motion visitors get final states instantly rather
than a half-animated version. `src/components/ui/Glow.tsx` is the soft
blurred-radial background shape used behind hero/CTA sections for visual
energy — navy/gold only, low opacity, never a rainbow gradient.

## Images

Only the two About-page team portraits remain (`public/images/`), sourced
from Unsplash/Pexels — see `CREDITS.md`. The rest of the site's visual
system is icon- and glow-shape-driven rather than photography-driven.

## 21st.dev MCP server

`.mcp.json` registers the 21st.dev "Magic" MCP server (UI component
generation via `/ui` prompts) as an HTTP server, referencing
`${TWENTYFIRST_API_KEY}` rather than embedding the key directly — the key
itself lives in the gitignored `.env` file and was also set as a
user-level Windows environment variable. **MCP servers connect at session
startup**, so a running Claude Code session won't pick this up until it's
restarted. If you rotate the key, update both `.env` and the Windows
environment variable (`setx TWENTYFIRST_API_KEY "..."`, or via System
Properties → Environment Variables), since `setx` only affects future
sessions, not the one it's run from.
