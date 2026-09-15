import { getEnv } from "../../config/env";
import type { EmailAdapter } from "./EmailAdapter";
import { ConsoleEmailAdapter } from "./ConsoleEmailAdapter";
import { ResendEmailAdapter } from "./ResendEmailAdapter";

let cached: EmailAdapter | undefined;

/**
 * Resend is the client's chosen provider (2026-09-15), but this only
 * constructs a `ResendEmailAdapter` when `EMAIL_PROVIDER=resend` is
 * explicitly set (env.ts already refuses to boot with that set and no
 * `RESEND_API_KEY`/`EMAIL_FROM`) — otherwise it's `ConsoleEmailAdapter`,
 * same as before, so nothing sends real email until a deployment
 * deliberately opts in.
 */
export function getEmailAdapter(): EmailAdapter {
  if (!cached) {
    const env = getEnv();
    cached =
      env.EMAIL_PROVIDER === "resend"
        ? new ResendEmailAdapter(env.RESEND_API_KEY!, env.EMAIL_FROM!)
        : new ConsoleEmailAdapter();
  }
  return cached;
}
