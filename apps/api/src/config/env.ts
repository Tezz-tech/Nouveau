import { z } from "zod";
import "dotenv/config";

/**
 * Every environment variable this service needs, validated once at
 * startup — a missing or malformed value fails fast and loud here, not
 * three requests later as an obscure `undefined is not a function`.
 *
 * `TRADING_MODE` is defined here even though nothing in Phase 2 reads it
 * yet, specifically so it exists, defaults to `paper`, and is validated
 * from day one — per invariant #7, it should never be possible for this
 * value to silently default to `live` because someone forgot to set it.
 */
const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(4000),
    MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
    SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
    CORS_ORIGIN: z.string().min(1).default("http://localhost:5174"),
    KMS_LOCAL_MASTER_KEY: z
      .string()
      .min(1, "KMS_LOCAL_MASTER_KEY is required (base64, 32 bytes decoded) — generate with `openssl rand -base64 32`"),
    TRADING_MODE: z.enum(["paper", "live"]).default("paper"),
    /** Client chose Resend (2026-09-15) as the real email provider, but
     *  defaults to `console` so a dev machine or CI run can never send real
     *  email just because RESEND_API_KEY happens to be set in the shell. */
    EMAIL_PROVIDER: z.enum(["console", "resend"]).default("console"),
    RESEND_API_KEY: z.string().optional(),
    EMAIL_FROM: z.string().optional(),
  })
  .refine((env) => env.EMAIL_PROVIDER !== "resend" || Boolean(env.RESEND_API_KEY && env.EMAIL_FROM), {
    message: "RESEND_API_KEY and EMAIL_FROM are required when EMAIL_PROVIDER=resend",
    path: ["EMAIL_PROVIDER"],
  });

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

/** Lazy + cached rather than evaluated at import time, so tests can set
 *  `process.env` before the first call without fighting module load order. */
export function getEnv(): Env {
  if (!cached) {
    cached = envSchema.parse(process.env);
  }
  return cached;
}

/** Test-only escape hatch to force re-validation after mutating
 *  `process.env` mid-suite. */
export function resetEnvCache(): void {
  cached = undefined;
}
