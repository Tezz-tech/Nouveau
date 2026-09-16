# @nouveau/marketing

Part of the Nouveau monorepo — see the [root README](../../README.md) for
the overall platform. This package is the public marketing site: a public
marketing site for Nouveau, a professional trading firm offering
Fund Management, Trading Bots, and Trader Intelligence & Simulation.
Positioning is institutional-grade and deliberately vague about the
underlying trading strategy (proprietary by design) while being transparent
about allocation logic and risk controls.

**This is also the entire frontend, not just the public pages.** Login,
signup, password reset, and the five-step onboarding wizard live here too,
talking to the real `@nouveau/api` backend — they started out as a
separate `apps/web` project during Phase 2 and were merged back in once
that was flagged as the wrong call. There is deliberately no second
frontend app; see the root README's "One frontend, not several."

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
command.

Auth/onboarding pages need `@nouveau/api` actually running — see
`apps/api/README.md`. Copy `.env.example` to `.env.local` if the API isn't
on `http://localhost:4000` (the built-in default); `VITE_API_BASE_URL`
points at it.

## Deploying to Vercel

**This app moved into a monorepo at `apps/marketing/`.** If a Vercel
project is already connected to this repo, its **Root Directory** setting
needs to change to `apps/marketing` (Project Settings → General → Root
Directory) or the build will fail looking for `package.json` at the repo
root. Do this before the next push, or the deploy breaks.

This is a static single-page app (no server, no API routes), so Vercel's
default Vite preset handles it out of the box: it runs `npm run build` and
serves `dist/`. `vercel.json` adds the one thing the default preset doesn't
do for you — a catch-all rewrite to `index.html` so that client-side routes
resolve correctly on a hard refresh or direct link, instead of 404ing
(static files under `public/` are still served directly and aren't
affected by the rewrite). `package.json` also pins a `"node": ">=18.0.0"`
engine range.

**Set `VITE_API_BASE_URL` in the Vercel project's env vars** to wherever
`@nouveau/api` is actually deployed — Vite bakes it into the build at
build time (it's not read at runtime), so it must be set before the build
runs, not just present on the server afterward. Also update `apps/api`'s
own `CORS_ORIGIN` (and `COOKIE_SAME_SITE` if the two end up on different
domains — see `apps/api/README.md`) to point back at this app's real URL.

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
    ui/              design-system primitives (Button, Container, Accordion, form fields, Icon, Glow)
  content/           all page copy, as typed objects — see "Editing copy" below
  lib/
    motion.ts        centralised motion variants, easing, durations, stagger values
    api.ts           fetch wrapper for @nouveau/api (credentials: "include" — sessions are cookie-based)
    AuthContext.tsx  the one source of truth for "am I logged in" / onboarding status
  pages/             Home, Services, About, Support, NotFound — plus the real,
                     functional Login, Signup, ResetPasswordRequest, ResetPasswordConfirm
    onboarding/      OnboardingLayout (progress indicator + resumability redirect) + steps/
                     (IdentityStep, BrokerAccountStep, CredentialsStep, LpoaStep, CompleteStep)
public/
  images/            just the logo assets (logo-mark.png, logo-full.png) — see the Logo section below
.mcp.json            21st.dev MCP server config (url only — no secret; see below)
.env                 gitignored — holds TWENTYFIRST_API_KEY referenced by .mcp.json, and VITE_API_BASE_URL
```

Routes: `/`, `/services`, `/about`, `/support`, `/login`, `/signup`,
`/reset-password`, `/reset-password/confirm`, `/onboarding/*` (identity,
broker-account, credentials, lpoa, complete). The onboarding routes render
without the site's header/footer (see `App.tsx`'s `SiteLayout` split) — it's
a focused task flow, not a page to navigate away from mid-step.
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

## Logo

`src/components/ui/Logo.tsx` exports three variants, all built from the
client-supplied logo file (`public/images/logo-mark.png` — the gold icon,
cropped tight; `public/images/logo-full.png` — icon + cream "NOUVEAU"
wordmark, cropped tight; `public/favicon.png` — the icon, squared and
downsized):

- `LogoMark` — icon only, transparent, works on any surface.
- `LogoLockup` — icon image + **live** "Nouveau" text (`tone: "light" |
  "dark"` controls the text color). Used in the header, which toggles
  between a light and dark surface — the source file's wordmark is baked
  in as cream/white pixels and is only legible on a dark surface, so this
  variant re-renders the wordmark as real, color-adaptive text instead.
- `LogoFull` — the raw raster lockup, icon and wordmark together. Only use
  this where the background is guaranteed dark (`navy`/`navy-deep`) —
  currently the footer, the mobile drawer, and the Login/Signup dark side
  panels. If you place it near the top of a page, keep it clear of the
  fixed header's ~84px height (`top-28` or more) — the header is
  `position: fixed` with `z-50` and will silently paint over anything
  positioned underneath it.

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

There's no photography on the site at all now — the last remaining use (two
About-page team portraits) was removed along with the "people accountable"
section. The visual system is entirely icon- (`lucide-react`, via
`src/components/ui/Icon.tsx`) and glow-shape-driven
(`src/components/ui/Glow.tsx`). If photography comes back later, re-add a
`Figure`-style component with the same consistent-grade treatment described
in earlier project history, and a `CREDITS.md` documenting each source
(Unsplash/Pexels only, per the original brief).

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
