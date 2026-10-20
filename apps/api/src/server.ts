import { connectToDatabase } from "@nouveau/db";
import { getEnv } from "./config/env";
import { buildApiApp } from "./buildApiApp";

async function main() {
  const env = getEnv();

  if (env.TRADING_MODE === "live") {
    // The copy-trading engine exists, but live trading is still blocked until
    // real MetaApi credentials are wired (COPY_BROKER_PROVIDER=metaapi) and
    // reviewed — invariant #7 says live trading must never be an accident.
    throw new Error(
      "TRADING_MODE=live is not permitted yet — the copy engine runs in paper/simulator mode only until real MetaApi credentials are configured and reviewed."
    );
  }

  await connectToDatabase(env.MONGODB_URI);

  const app = buildApiApp();

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
