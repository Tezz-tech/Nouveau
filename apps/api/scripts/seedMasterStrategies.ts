import { connectToDatabase, disconnectFromDatabase, MasterStrategy } from "@nouveau/db";
import { getEnv } from "../src/config/env";
import { getCopyTradingAdapter } from "../src/adapters/copyTrading/provider";

/**
 * Idempotent — safe to re-run. Diffs each master's desired config against
 * what's already stored in `MasterStrategy.copyFactoryStrategyConfig` and
 * only pushes to CopyFactory again if something actually changed, rather
 * than blindly re-provisioning every run.
 *
 * Fill in MASTERS below once real account details exist — either
 * `existingMetaApiAccountId` (the account was already set up directly in
 * the MetaApi dashboard) or the full broker/login/serverName/
 * tradingPassword set to provision one fresh. A master account's
 * credentials are used once here and never persisted anywhere — they're
 * handed straight to MetaApi's account-creation call, not written to
 * MasterStrategy or any other collection.
 *
 * Run from apps/api, with a real META_API_TOKEN in .env:
 *
 *   npx tsx scripts/seedMasterStrategies.ts
 */
interface MasterConfig {
  name: string;
  description: string;
  maxTradeRiskPct?: number;
  existingMetaApiAccountId?: string;
  broker?: string;
  login?: string;
  serverName?: string;
  tradingPassword?: string;
}

const MASTERS: MasterConfig[] = [
  // {
  //   name: "Scalper",
  //   description: "Short-horizon intraday trades.",
  //   existingMetaApiAccountId: "fill-in-real-metaapi-account-id",
  // },
];

async function main() {
  const env = getEnv();
  await connectToDatabase(env.MONGODB_URI);
  const adapter = getCopyTradingAdapter();

  if (MASTERS.length === 0) {
    // eslint-disable-next-line no-console
    console.log("No master accounts configured yet — fill in MASTERS in this script, then re-run.");
    await disconnectFromDatabase();
    return;
  }

  for (const master of MASTERS) {
    const existing = master.existingMetaApiAccountId
      ? await MasterStrategy.findOne({ metaApiAccountId: master.existingMetaApiAccountId })
      : await MasterStrategy.findOne({ name: master.name });

    const desiredConfig = { name: master.name, description: master.description, maxTradeRiskPct: master.maxTradeRiskPct };
    if (existing && existing.copyFactoryStrategyId && JSON.stringify(existing.copyFactoryStrategyConfig) === JSON.stringify(desiredConfig)) {
      // eslint-disable-next-line no-console
      console.log(`${master.name}: already up to date, skipping.`);
      continue;
    }

    // eslint-disable-next-line no-console
    console.log(`${master.name}: provisioning/updating CopyFactory strategy...`);
    const result = await adapter.ensureProviderStrategy({
      name: master.name,
      description: master.description,
      maxTradeRiskPct: master.maxTradeRiskPct,
      existingMetaApiAccountId: existing?.metaApiAccountId ?? master.existingMetaApiAccountId,
      broker: master.broker,
      login: master.login,
      serverName: master.serverName,
      tradingPassword: master.tradingPassword,
    });

    if (existing) {
      existing.copyFactoryStrategyId = result.copyFactoryStrategyId;
      existing.copyFactoryStrategyConfig = desiredConfig;
      await existing.save();
    } else {
      await MasterStrategy.create({
        name: master.name,
        description: master.description,
        metaApiAccountId: result.metaApiAccountId,
        copyFactoryStrategyId: result.copyFactoryStrategyId,
        maxTradeRiskPct: master.maxTradeRiskPct,
        copyFactoryStrategyConfig: desiredConfig,
      });
    }
    // eslint-disable-next-line no-console
    console.log(`${master.name}: done (metaApiAccountId=${result.metaApiAccountId}, strategyId=${result.copyFactoryStrategyId})`);
  }

  await disconnectFromDatabase();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Seed failed:", err);
  process.exit(1);
});
