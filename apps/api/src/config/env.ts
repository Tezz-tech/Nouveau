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
    CORS_ORIGIN: z.string().min(1).default("http://localhost:5173"),
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
    /** Defaults to "lax", which is correct when apps/marketing and apps/api share
     *  a registrable domain (e.g. app.example.com + api.example.com — the
     *  common case, and how local dev works since both are on localhost).
     *  Set to "none" only if they're deployed on genuinely different
     *  domains (e.g. a Vercel *.vercel.app frontend calling a Render
     *  *.onrender.com API) — browsers never send a Lax cookie on a
     *  cross-site fetch, which would otherwise make login silently fail in
     *  production while working fine in dev. "none" forces `secure: true`
     *  regardless of NODE_ENV, since browsers require that combination. */
    COOKIE_SAME_SITE: z.enum(["lax", "none"]).default("lax"),
    /** Trader-track integrations. Every one of these defaults to a safe,
     *  synthetic-data simulator — the same "build the seam, default to a
     *  stub" discipline as EMAIL_PROVIDER above — until the client supplies
     *  real vendor credentials (see apps/marketing's README for what each
     *  real value needs). `metaapi` is the existing hinted vendor
     *  (`MtAccount.metaApiId`/`copyFactoryId`) for both market data and
     *  broker-account linking; the real payment value name is a
     *  placeholder — `packages/core/src/ledger.ts` already assumes
     *  Paystack elsewhere in this project, so confirm the processor before
     *  wiring a real PaymentAdapter. */
    MARKET_DATA_PROVIDER: z.enum(["simulator", "metaapi"]).default("simulator"),
    BROKER_LINK_PROVIDER: z.enum(["simulator", "metaapi"]).default("simulator"),
    PAYMENT_PROVIDER: z.enum(["simulator", "real"]).default("simulator"),
    LLM_NARRATION_PROVIDER: z.enum(["template", "anthropic"]).default("template"),
    META_API_TOKEN: z.string().optional(),
    /** The MetaApi account id (not a broker login) of one dedicated demo
     *  account Nouveau keeps connected purely as a market-data feed for
     *  every trader's signal requests — see MetaApiMarketDataAdapter. */
    META_API_ACCOUNT_ID: z.string().optional(),
    ANTHROPIC_API_KEY: z.string().optional(),
  })
  .refine((env) => env.EMAIL_PROVIDER !== "resend" || Boolean(env.RESEND_API_KEY && env.EMAIL_FROM), {
    message: "RESEND_API_KEY and EMAIL_FROM are required when EMAIL_PROVIDER=resend",
    path: ["EMAIL_PROVIDER"],
  })
  .refine((env) => env.MARKET_DATA_PROVIDER !== "metaapi" || Boolean(env.META_API_TOKEN), {
    message: "META_API_TOKEN is required when MARKET_DATA_PROVIDER=metaapi",
    path: ["MARKET_DATA_PROVIDER"],
  })
  .refine((env) => env.MARKET_DATA_PROVIDER !== "metaapi" || Boolean(env.META_API_ACCOUNT_ID), {
    message: "META_API_ACCOUNT_ID is required when MARKET_DATA_PROVIDER=metaapi (the shared house MT account used as the market-data feed)",
    path: ["MARKET_DATA_PROVIDER"],
  })
  .refine((env) => env.BROKER_LINK_PROVIDER !== "metaapi" || Boolean(env.META_API_TOKEN), {
    message: "META_API_TOKEN is required when BROKER_LINK_PROVIDER=metaapi",
    path: ["BROKER_LINK_PROVIDER"],
  })
  .refine((env) => env.LLM_NARRATION_PROVIDER !== "anthropic" || Boolean(env.ANTHROPIC_API_KEY), {
    message: "ANTHROPIC_API_KEY is required when LLM_NARRATION_PROVIDER=anthropic",
    path: ["LLM_NARRATION_PROVIDER"],
  })
  .refine(
    (env) =>
      env.TRADING_MODE !== "live" ||
      (env.MARKET_DATA_PROVIDER !== "simulator" && env.BROKER_LINK_PROVIDER !== "simulator" && env.PAYMENT_PROVIDER !== "simulator"),
    {
      message:
        "TRADING_MODE=live cannot run on simulated market data, broker linking, or payments — set MARKET_DATA_PROVIDER/BROKER_LINK_PROVIDER/PAYMENT_PROVIDER to a real provider first.",
      path: ["TRADING_MODE"],
    }
  );

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
