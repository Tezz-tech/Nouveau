import type { Express } from "express";
import { createApp } from "./app";
import { getEnv } from "./config/env";
import { getEmailAdapter } from "./adapters/email/provider";
import { SimulatorKycAdapter } from "./adapters/kyc/SimulatorKycAdapter";
import { getBrokerLinkAdapter } from "./adapters/brokerLink/provider";
import { getPaymentAdapter } from "./adapters/payment/provider";
import { getMarketDataAdapter } from "./adapters/marketData/provider";
import { getNarrationAdapter } from "./adapters/narration/provider";

/**
 * Shared between server.ts (a traditional long-running host) and
 * api/index.ts (the Vercel serverless entrypoint) so the two entrypoints
 * can never drift on which adapters/config the production app actually
 * uses — one of them getting updated without the other would be a silent,
 * hard-to-notice bug.
 */
export function buildApiApp(): Express {
  const env = getEnv();
  return createApp({
    emailAdapter: getEmailAdapter(),
    kycAdapter: new SimulatorKycAdapter(),
    brokerLinkAdapter: getBrokerLinkAdapter(),
    paymentAdapter: getPaymentAdapter(),
    marketDataAdapter: getMarketDataAdapter(),
    narrationAdapter: getNarrationAdapter(),
    appBaseUrl: env.CORS_ORIGIN,
  });
}
