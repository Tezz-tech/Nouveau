# Nouveau — marketing site

A public marketing site for Nouveau, an automated trading platform whose
whole product is a mechanic: half of every deposit is held in reserve and
never traded. No backend, no auth, no live data — every form is visual only
and every button either routes to another page or does nothing.

## Stack

- **Vite + React 18 + TypeScript**, client-side routed with **React Router**.
- **Tailwind CSS** for styling, with the brand palette defined as theme
  tokens (no arbitrary hex values in components).
- **Framer Motion** for component-level animation, page transitions, and
  scroll reveals.
- **GSAP + ScrollTrigger** for the pinned, scrubbed "Split" sequence on the
  home page and the image parallax.
- **Lenis** for smooth scrolling (`lerp: 0.08`), synced to GSAP's ticker so
  ScrollTrigger stays accurate.
- **react-helmet-async** for per-route `<title>`, meta description, and
  Open Graph tags (there's no server-rendered `<head>` in a Vite SPA, so
  this is the mechanism instead of Next.js's metadata API).

## Getting started

```bash
npm install
npm run dev       # starts Vite on http://localhost:5173
npm run build     # type-checks (tsc -b) and produces a production build in dist/
npm run preview   # serves the production build locally
```

## Project structure

```
src/
  components/       shared components (Header, Footer, Split, MobileDrawer, ...)
    motion/          small reusable motion primitives (RevealLines, Hairline, CountUp, Parallax)
    ui/              design-system primitives (Button, Container, Accordion, form fields, PlanCard, Figure, StatFigure)
  content/           all page copy, as typed objects — see "Editing copy" below
  hooks/             small shared hooks (active-section tracking for the how-it-works TOC)
  lib/motion.ts      centralised motion variants, easing, durations, stagger values
  pages/             one file per route
public/
  images/            downloaded photography + CREDITS.md documenting each source
```

## Changing the palette

All brand colours live in **`tailwind.config.ts`** under `theme.extend.colors`
(`paper`, `paper-2`, `ink`, `slate`, `navy`, `navy-deep`, `navy-line`, `gold`,
`gold-light`, `gold-deep`) and are mirrored as CSS custom properties in
**`src/index.css`** (`:root`) for the couple of places that need a raw CSS
value (e.g. GSAP tweens in `Split.tsx`, which animate `backgroundColor`
directly and can't use a Tailwind class). If you change a colour, update it
in both places.

Note the deliberate constraint in the brief: gold never fills a large area
(no gold buttons/panels), and gold text on the light `paper`/`paper-2`
backgrounds must use `gold-deep`, not `gold` — `gold` is reserved for the
navy/navy-deep surfaces, where it has enough contrast to read.

## Changing the fonts

Fonts are loaded from Google Fonts via the `<link>` tags in **`index.html`**
(`Fraunces` for display/headings, `Archivo` for body/UI text, `IBM Plex
Mono` for money figures and statistics). The CSS variables that map them to
Tailwind's `font-display` / `font-text` / `font-mono` utilities are set in
**`src/index.css`**. To swap a typeface: change the Google Fonts URL in
`index.html` and the corresponding `--font-*` variable in `index.css`.

## Editing copy

Every word on the site lives in **`src/content/*.ts`** as typed objects —
`home.ts`, `howItWorks.ts`, `pricing.ts`, `about.ts`, `support.ts`,
`auth.ts`, and shared nav/footer/legal text in `site.ts`. Edit these files
directly; the page components in `src/pages/` just import and render them,
so copy changes never require touching JSX.

## The signature interaction

`src/components/Split.tsx` is the pinned, scroll-scrubbed sequence on the
home page (`/#split`) that shows a $20 deposit dividing into a reserve half
(fixed, untouched) and a traded half (which doubles, then collapses to
zero). It's built with GSAP + ScrollTrigger on desktop/tablet. Below a
768px breakpoint — and whenever `prefers-reduced-motion` is set — it swaps
to `SplitMobile`, a shorter, unpinned vertical retelling of the same four
beats, rather than trying to force the pinned sequence onto a small screen.

## Motion system

`src/lib/motion.ts` centralises the easing curve
(`cubic-bezier(0.22, 1, 0.36, 1)`), durations, and stagger values, plus a
handful of named variants (`clipRiseLine` for the hero, `hairlineDraw`,
`settleFromLeft`, `softAppear`). Deliberately not every section uses the
same reveal — the brief calls out uniform "fade-up on scroll" as the
clearest tell of a templated site, so treatments vary: clip-mask text only
in the hero, hairline draws under stats and headings, a left-settle for
sequential/editorial content, plain opacity for dense copy blocks like
accordions and pull quotes. `prefers-reduced-motion` is respected
throughout — reduced-motion visitors get final states instantly, not a
half-animated version.

## Images

All photography is in `public/images/`, sourced from Unsplash and Pexels
only (both free for commercial use) and downloaded as WebP. See
`public/images/CREDITS.md` for the source URL and photographer for each
file. Every photo gets the same CSS grade (`src/components/ui/Figure.tsx`)
— slight desaturation, shadows cooled toward navy — so the set reads as
commissioned rather than stock.
