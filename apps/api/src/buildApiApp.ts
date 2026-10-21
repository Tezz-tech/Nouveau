import type { Express } from "express";
import { createApp } from "./app";
import { getEnv } from "./config/env";
import { getEmailAdapter } from "./adapters/email/provider";
import { getPaymentAdapter } from "./adapters/payment/provider";
import { getCopyTradingAdapter } from "./adapters/copyTrading/provider";
import { getKmsProvider } from "./adapters/kms/provider";

/**
 * Shared between server.ts (a traditional long-running host) and
 * vercelHandler.ts (the Vercel serverless entrypoint) so the two
 * entrypoints can never drift on which adapters/config the production app
 * actually uses.
 */
export function buildApiApp(): Express {
  const env = getEnv();
  return createApp({
    emailAdapter: getEmailAdapter(),
    paymentAdapter: getPaymentAdapter(),
    copyTradingAdapter: getCopyTradingAdapter(),
    kmsProvider: getKmsProvider(),
    appBaseUrl: env.CORS_ORIGIN,
  });
}
