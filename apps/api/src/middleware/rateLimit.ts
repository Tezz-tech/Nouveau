import rateLimit from "express-rate-limit";
import { getEnv } from "../config/env";

/** Integration tests reuse one Express app instance across many requests
 *  from the same "IP" within seconds — real rate-limit windows would start
 *  rejecting legitimate test requests almost immediately, which isn't a
 *  guard against anything in that context. Skipping in `NODE_ENV=test` is
 *  the standard way to keep the middleware itself under test elsewhere
 *  (a dedicated rate-limit test can still construct one directly) without
 *  every unrelated integration test tripping over it. */
function skipInTest(): boolean {
  return getEnv().NODE_ENV === "test";
}

/** Signup, login, and password-reset are the classic brute-force/credential-
 *  stuffing targets — tighter limits here than the rest of the API. Applied
 *  per-route in auth.ts, not via `router.use`, so it never catches
 *  `GET /auth/session` (a harmless, credential-free read the frontend polls
 *  on every page load — gating it here would lock legitimate users out of
 *  their own session mid-onboarding) or `POST /auth/logout`. */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Try again later." },
  skip: skipInTest,
});

/** A looser, general-purpose limit for everything else — a backstop against
 *  abuse, not a tight per-endpoint policy. */
export const defaultRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
});
