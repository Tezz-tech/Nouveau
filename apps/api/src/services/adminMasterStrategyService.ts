import { MasterStrategy, type MasterStrategyDocument } from "@nouveau/db";
import { HttpError } from "../middleware/errorHandler";
import type { CopyTradingAdapter, FinalizeProviderStrategyInput, FinalizeProviderStrategyResult } from "../adapters/copyTrading/CopyTradingAdapter";

async function finalizeOrThrow502(
  copyTradingAdapter: CopyTradingAdapter,
  input: FinalizeProviderStrategyInput
): Promise<FinalizeProviderStrategyResult> {
  try {
    return await copyTradingAdapter.finalizeProviderStrategy(input);
  } catch (err) {
    throw new HttpError(502, `Could not finalize the CopyFactory strategy: ${err instanceof Error ? err.message : "unknown error"}`);
  }
}

export interface CreateMasterStrategyInput {
  name: string;
  description: string;
  maxTradeRiskPct?: number;
  /** Either an already-provisioned MetaApi account id, or full credentials
   *  to provision one fresh — exactly one of the two, same contract as
   *  `CopyTradingAdapter.ensureProviderStrategy`. A plaintext password
   *  passed here is used once for the provisioning call and never
   *  persisted — see MasterStrategy's own doc comment. */
  existingMetaApiAccountId?: string;
  broker?: string;
  login?: string;
  serverName?: string;
  tradingPassword?: string;
}

/**
 * Creates a `MasterStrategy`. The "already provisioned" path finalizes the
 * CopyFactory strategy immediately (fast — no deploy/connect wait) and
 * returns an `active` row. The "provision fresh" path only creates and
 * deploys the MetaApi account here (non-blocking, same discipline as
 * `mtAccountService.linkMtAccount` — an HTTP request must never block on
 * MetaApi's real deploy/connect time) and returns a `provisioning` row;
 * `syncProvisioning` below finishes the job once polling sees it connected.
 */
export async function createMasterStrategy(
  input: CreateMasterStrategyInput,
  copyTradingAdapter: CopyTradingAdapter
): Promise<MasterStrategyDocument> {
  if (input.existingMetaApiAccountId) {
    const existing = await MasterStrategy.findOne({ metaApiAccountId: input.existingMetaApiAccountId });
    if (existing) {
      throw new HttpError(409, "A master strategy already exists for that MetaApi account.");
    }
    const result = await finalizeOrThrow502(copyTradingAdapter, {
      metaApiAccountId: input.existingMetaApiAccountId,
      name: input.name,
      description: input.description,
      maxTradeRiskPct: input.maxTradeRiskPct,
    });
    return MasterStrategy.create({
      name: input.name,
      description: input.description,
      metaApiAccountId: input.existingMetaApiAccountId,
      copyFactoryStrategyId: result.copyFactoryStrategyId,
      maxTradeRiskPct: input.maxTradeRiskPct,
      copyFactoryStrategyConfig: result.appliedConfig,
      status: "active",
    });
  }

  if (!input.broker || !input.login || !input.serverName || !input.tradingPassword) {
    throw new HttpError(400, "Provide either an existing MetaApi account id, or broker/login/serverName/tradingPassword to provision one.");
  }

  let metaApiAccountId: string;
  try {
    metaApiAccountId = (
      await copyTradingAdapter.createProviderAccount({
        broker: input.broker,
        login: input.login,
        serverName: input.serverName,
        tradingPassword: input.tradingPassword,
      })
    ).metaApiAccountId;
  } catch (err) {
    // Nothing persisted — there's no partial MasterStrategy row left behind
    // to clean up, unlike mtAccountService.linkMtAccount (which always has
    // a row to mark "error" because the user-facing flow records consent
    // before attempting the MetaApi call).
    throw new HttpError(502, `Could not create the master account: ${err instanceof Error ? err.message : "unknown error"}`);
  }

  return MasterStrategy.create({
    name: input.name,
    description: input.description,
    metaApiAccountId,
    maxTradeRiskPct: input.maxTradeRiskPct,
    status: "provisioning",
  });
}

/** Polls a `provisioning` strategy's MetaApi connection and finalizes the
 *  CopyFactory strategy the first time it's seen connected — mirrors
 *  `mtAccountService.syncConnectionStatus`'s shape exactly. A no-op for a
 *  strategy that's already past "provisioning". */
export async function syncProvisioning(strategy: MasterStrategyDocument, copyTradingAdapter: CopyTradingAdapter): Promise<MasterStrategyDocument> {
  if (strategy.status !== "provisioning") return strategy;

  const result = await copyTradingAdapter.pollConnectionStatus(strategy.metaApiAccountId);

  if (result.stage === "failed") {
    strategy.status = "failed";
    strategy.lastError = { message: result.errorMessage ?? "Connection failed.", at: new Date() };
    await strategy.save();
    return strategy;
  }

  if (result.stage !== "connected") {
    return strategy; // still deploying/connecting — nothing to do yet
  }

  try {
    const finalized = await copyTradingAdapter.finalizeProviderStrategy({
      metaApiAccountId: strategy.metaApiAccountId,
      name: strategy.name,
      description: strategy.description,
      maxTradeRiskPct: strategy.maxTradeRiskPct ?? undefined,
    });
    strategy.copyFactoryStrategyId = finalized.copyFactoryStrategyId;
    strategy.copyFactoryStrategyConfig = finalized.appliedConfig;
    strategy.status = "active";
  } catch (err) {
    strategy.status = "failed";
    strategy.lastError = { message: err instanceof Error ? err.message : "Could not finalize the CopyFactory strategy.", at: new Date() };
  }
  await strategy.save();
  return strategy;
}

export function listMasterStrategies(): Promise<MasterStrategyDocument[]> {
  return MasterStrategy.find().sort({ createdAt: -1 });
}

export async function setMasterStrategyStatus(id: string, status: "active" | "paused"): Promise<MasterStrategyDocument> {
  const strategy = await MasterStrategy.findById(id);
  if (!strategy) throw new HttpError(404, "Master strategy not found.");
  if (strategy.status === "provisioning" || strategy.status === "failed") {
    throw new HttpError(409, `Cannot change status while the strategy is "${strategy.status}".`);
  }
  strategy.status = status;
  await strategy.save();
  return strategy;
}
