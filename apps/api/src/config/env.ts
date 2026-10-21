import { z } from "zod";
import "dotenv/config";

/**
 * Every environment variable this service needs, validated once at
 * startup — a missing or malformed value fails fast and loud here, not
 * three requests later as an obscure `undefined is not a function`.
 *
 * Unlike every previous version of this file, there is no provider-toggle
 * pattern (`*_PROVIDER=simulator|real`) for MetaApi/CopyFactory or
 * Paystack — this build has no simulator for either, by explicit client
 * choice (there's no meaningful "fake" version of copy trading or of
 * taking real payment for it). Automated tests inject fake adapter
 * implementations directly through `createApp(deps)`'s dependency
 * injection (see `test/testApp.ts`) instead of selecting a provider.
 *
 * `META_API_TOKEN`/`PAYSTACK_SECRET_KEY` are deliberately `.optional()`
 * here, not required — this whole object is validated as ONE unit, so an
 * earlier version that required them unconditionally meant a missing
 * token crashed the entire server at boot, taking down login/signup/every
 * other unrelated route along with it (a real incident, not a hypothetical
 * one). "No simulator" was only ever meant to apply to the copy-trading
 * mechanics themselves — `adapters/copyTrading/provider.ts` and
 * `adapters/payment/provider.ts` are what actually enforce that now: each
 * returns a `NotConfigured*Adapter` when its token is missing, whose
 * methods throw a clear 503 only when a request genuinely needs the real
 * vendor call (checkout, account linking) — never a silent fake success,
 * and never something that blocks auth or any other unrelated route.
 */
const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(4000),
    MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
    SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
    CORS_ORIGIN: z.string().min(1).default("http://localhost:5173"),
    KMS_LOCAL_MASTER_KEY: z
      .string()
      .min(1, "KMS_LOCAL_MASTER_KEY is required (base64, 32 bytes decoded) — generate with `openssl rand -base64 32`"),
    /** Defaults to "lax", correct when apps/marketing and apps/api share a
     *  registrable domain. Set to "none" only if they're on genuinely
     *  different domains (e.g. two separate *.vercel.app projects) —
     *  browsers never send a Lax cookie on a cross-site fetch, which would
     *  otherwise make login silently fail in production. "none" forces
     *  `secure: true` regardless of NODE_ENV, since browsers require that
     *  combination. */
    COOKIE_SAME_SITE: z.enum(["lax", "none"]).default("lax"),
    EMAIL_PROVIDER: z.enum(["console", "resend"]).default("console"),
    RESEND_API_KEY: z.string().optional(),
    EMAIL_FROM: z.string().optional(),
    /** Real MetaApi token — covers both account provisioning (the official
     *  `metaapi.cloud-sdk`) and CopyFactory strategy/subscriber management
     *  (the official `metaapi.cloud-copyfactory-sdk`), both imported via
     *  their `/node` subpath — see adapters/copyTrading. Both packages are
     *  used directly rather than hand-rolled REST calls: CopyFactory's real
     *  client does non-trivial dynamic domain/region resolution internally
     *  that would be a real risk to reimplement by hand, and the package is
     *  already a zero-extra-cost transitive dependency of metaapi.cloud-sdk
     *  regardless. */
    META_API_TOKEN: z.string().optional(),
    PAYSTACK_SECRET_KEY: z.string().optional(),
    PAYSTACK_PUBLIC_KEY: z.string().optional(),
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
