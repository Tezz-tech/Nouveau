import { connectToDatabase } from "@nouveau/db";
import { getEnv } from "./config/env";
import { createApp } from "./app";
import { getEmailAdapter } from "./adapters/email/provider";
import { SimulatorKycAdapter } from "./adapters/kyc/SimulatorKycAdapter";

async function main() {
  const env = getEnv();

  if (env.TRADING_MODE === "live") {
    // Nothing in Phase 2 places trades, but this is the earliest possible
    // point to refuse to boot at all with a misconfigured environment —
    // invariant #7 says live trading must never be an accident.
    throw new Error(
      "TRADING_MODE=live is not permitted yet — no broker adapter, no strategy engine, no kill switch exist. This is expected to fail until Phase 5+."
    );
  }

  await connectToDatabase(env.MONGODB_URI);

  const app = createApp({
    emailAdapter: getEmailAdapter(),
    kycAdapter: new SimulatorKycAdapter(),
    appBaseUrl: env.CORS_ORIGIN,
  });

  app.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`@nouveau/api listening on :${env.PORT} (${env.NODE_ENV}, TRADING_MODE=${env.TRADING_MODE})`);
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Fatal startup error:", err);
  process.exit(1);
});
