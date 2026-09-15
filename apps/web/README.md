# @nouveau/web

The authenticated app — separate from `@nouveau/marketing` (the public,
unauthenticated site) on purpose, since the two have completely different
concerns (marketing is static and visual-only; this one talks to a real
API and manages a real session). Phase 2 covers login/signup and the
five-step onboarding wizard; the user dashboard (Phase 6) and admin
dashboard (Phase 7) will live here too.

## What this app owns

- **`lib/AuthContext.tsx`** — the one source of truth for "am I logged in"
  and "what's my onboarding status," fetched from the API on load and
  refreshed after every auth/onboarding action. Every page reads from this
  instead of managing its own session state.
- **`pages/onboarding/OnboardingLayout.tsx`** — the persistent progress
  indicator and the resumability redirect: on load, if the URL doesn't
  match where the backend says the user actually is, it redirects to the
  real next step. This is a UX convenience only — `@nouveau/api` enforces
  the same ordering independently and is the actual security boundary.
- **`pages/onboarding/steps/*`** — one component per wizard step, each
  showing the same plain-English description defined once in
  `@nouveau/core`'s `ONBOARDING_STEP_DESCRIPTIONS` (via the API's
  `/onboarding/status` response, not duplicated here).

## What this app must never do

- **Never hold its own copy of the LPOA text.** `LpoaStep.tsx` fetches it
  from `GET /onboarding/lpoa-document` specifically so what a user reviews
  and signs is always the exact text the backend hashes — a hardcoded copy
  here could drift from that silently.
- **Never let a step render without the backend's onboarding status having
  loaded.** `OnboardingLayout` blocks rendering the wizard until `onboarding`
  is populated — showing a step before knowing the real progress state
  risks letting a user submit into a step they're not actually eligible
  for yet (the API still rejects it, but the UI shouldn't offer it).
- **Never send a credential (MT5 password) anywhere except the one POST
  that submits it.** `CredentialsStep` clears its own local state
  immediately after submit, success or failure.

## Environment

Copy `.env.example` to `.env.local` — `VITE_API_BASE_URL` should point at
wherever `@nouveau/api` is running (`http://localhost:4000` by default).

## Running

```bash
npm run dev -w @nouveau/web       # http://localhost:5174 — needs @nouveau/api running separately
npm run build -w @nouveau/web
```
