# @nouveau/marketing

Part of the Nouveau monorepo — see the [root README](../../README.md).
This package is the entire frontend: the public marketing site plus auth,
onboarding, and the account dashboard for Nouveau's copy-trading product. A
user signs up, picks a "bot" (a plan tied to a master MT5 account — see
`apps/api/README.md`), pays via Paystack, links their own MT5 account
through a hand-held wizard, and from then on trades from their chosen bot
are copied onto their account automatically by MetaApi's CopyFactory.

This is a from-scratch rebuild (2026-10-20) on top of the informational
site that survived that reset untouched (Home/Services/About/Support). The
prior investor/trader-dual-track architecture is preserved in git history
at tag `pre-reset-2026-10-20` but has nothing to do with this one.

## Stack

- **Vite + React 18 + TypeScript**, client-side routed with **React Router**.
- **Tailwind CSS**, brand palette as theme tokens. The public site is
  light-surface; the onboarding wizard matches it (same `components/ui/*`
  primitives). The dashboard (and nothing else) is a separate dark
  trading-shell look, via `pages/dashboard/components/DashboardUI.tsx` —
  deliberately not shared with the public site's components, so a dashboard
  visual change can never accidentally touch the marketing pages.
- **Framer Motion**, **GSAP + ScrollTrigger**, **Lenis** — unchanged from
  the public site's original build.
- **lucide-react** via `components/ui/Icon.tsx`'s semantic-name registry.
- **react-helmet-async** for per-route `<title>`/meta tags.

## Getting started

```bash
npm install
npm run dev -w @nouveau/marketing      # http://localhost:5173
npm run build -w @nouveau/marketing    # type-checks (tsc) and produces dist/
```

Everything past the public pages needs `@nouveau/api` running (see its own
README) — auth, the bot picker, and the dashboard all call it directly.
Set `VITE_API_BASE_URL` if it isn't on `http://localhost:4000`.
**Actually completing checkout or MT5 linking requires the API to have
real `PAYSTACK_SECRET_KEY`/`META_API_TOKEN` configured** — there's no
simulator for either (see `apps/api/README.md`), so clicking "Continue to
payment" or submitting the linking form against a dev API running on fake
credentials will fail at that real vendor call, not before.

## Pages

**Public** — `/`, `/services`, `/about`, `/support`, `*` (NotFound).
Untouched by this rebuild.

**Auth** — `/login`, `/signup` (email, full name, password, a risk
acknowledgement — no account-type choice anymore, there's one flow),
`/reset-password`, `/reset-password/confirm`.

**Onboarding** (`/onboarding/*`, `OnboardingLayout.tsx`) — a user's flow
stage (`choose_bot | awaiting_link | linking | link_failed | complete`,
from `GET /account/profile`'s `flow` field) drives which step they're
redirected to on every load, so refreshing mid-wizard or returning later
always lands in the right place:
- **`choose-bot`** — lists real `BotPlan`s from `GET /bots`; picking one
  calls `POST /subscription/checkout` and full-page-redirects to Paystack.
- **`pay/callback`** — where Paystack sends the browser back. Polls
  `GET /account/profile` until the webhook-confirmed payment shows up
  (webhooks can genuinely arrive after this redirect), then forwards into
  the wizard.
- **`link-account`** — the step the client specifically asked to be
  hand-held: explains what's needed and why before asking for it, a
  plain-language consent checkbox (trades will be placed automatically —
  that's the product, not a side effect), then submits to
  `POST /mt-account/link` and switches to polling `GET /mt-account/status`
  (MetaApi deploying/connecting a real account takes real time; this is
  never pretended to be instant). A failed attempt can be retried from this
  same screen.
- **`complete`** — done, links to the dashboard.

**Dashboard** (`/dashboard/*`, `DashboardLayout.tsx`) — **Overview**
(current bot + live connection status), **Billing** (switch bots — reuses
the exact same checkout flow as a first purchase; a new successful payment
is what re-points an already-linked account's subscription, confirmed
that's how CopyFactory is meant to be used, so there's no separate "switch"
endpoint), **Profile** (account + bot + linked-account summary — never a
credential).

## Deploying to Vercel

See the root README for the monorepo layout. Static Vite build; set
`VITE_API_BASE_URL` to the deployed `@nouveau/api` URL.
