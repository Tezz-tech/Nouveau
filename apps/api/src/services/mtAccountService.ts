import { MtAccount, BotSubscription, MasterStrategy, type UserDocument, type MtAccountDocument } from "@nouveau/db";
import { encryptSecret, type KmsProvider } from "@nouveau/security";
import { HttpError } from "../middleware/errorHandler";
import type { CopyTradingAdapter } from "../adapters/copyTrading/CopyTradingAdapter";

const CONSENT_VERSION = "v1";

export interface LinkAccountInput {
  broker: string;
  login: string;
  serverName: string;
  /** Real, trading-capable MT5 password. Used once to encrypt-and-store
   *  and once to hand to MetaApi — never logged, never echoed back. */
  tradingPassword: string;
  consentIp: string;
  userAgent: string;
}

/**
 * Creates the user's `MtAccount`, records explicit consent that trades will
 * be placed automatically, kicks off MetaApi linking (without blocking on
 * it — see `CopyTradingAdapter.linkSubscriberAccount`'s own doc comment),
 * and attaches the account to the awaiting `BotSubscription`. The actual
 * strategy subscription (`subscribeToStrategy`) happens once polling
 * confirms the account is connected — see `syncConnectionStatus` below.
 */
export async function linkMtAccount(
  user: UserDocument,
  input: LinkAccountInput,
  copyTradingAdapter: CopyTradingAdapter,
  kmsProvider: KmsProvider
): Promise<MtAccountDocument> {
  const subscription = await BotSubscription.findOne({ userId: user._id, status: "awaiting_link" }).sort({ createdAt: -1 });
  if (!subscription) {
    throw new HttpError(409, "No pending bot subscription to link an account to — choose a bot and pay first.");
  }

  const existing = await MtAccount.findOne({ userId: user._id, status: { $ne: "closed" } });
  if (existing) {
    throw new HttpError(409, "You already have a linked MT5 account.");
  }

  const credentialRef = await encryptSecret(input.tradingPassword, kmsProvider);

  const account = await MtAccount.create({
    userId: user._id,
    broker: input.broker,
    login: input.login,
    serverName: input.serverName,
    credentialRef,
    consent: {
      version: CONSENT_VERSION,
      acceptedAt: new Date(),
      acceptedIp: input.consentIp,
      userAgent: input.userAgent,
    },
  });

  try {
    const { metaApiAccountId } = await copyTradingAdapter.linkSubscriberAccount({
      broker: input.broker,
      login: input.login,
      serverName: input.serverName,
      tradingPassword: input.tradingPassword,
    });
    account.metaApiAccountId = metaApiAccountId;
    account.copyFactorySubscriberConfigured = true; // the SUBSCRIBER role was set at account-creation time
    account.connectionStage = "deploying";
    await account.save();
  } catch (err) {
    account.status = "error";
    account.connectionStage = "failed";
    account.lastError = { message: err instanceof Error ? err.message : "Could not start linking that account.", at: new Date() };
    await account.save();
    throw new HttpError(422, account.lastError.message);
  }

  subscription.mtAccountId = account._id;
  await subscription.save();

  return account;
}

/**
 * Polls MetaApi for the account's current connection stage and, the moment
 * it first reaches "connected", applies the CopyFactory subscription for
 * whichever `BotSubscription` this account belongs to — this is the one
 * place `subscribeToStrategy` ever gets called for a newly linked account,
 * so it only fires once, right when there's finally something real to
 * subscribe.
 */
export async function syncConnectionStatus(mtAccount: MtAccountDocument, copyTradingAdapter: CopyTradingAdapter): Promise<MtAccountDocument> {
  if (!mtAccount.metaApiAccountId || mtAccount.connectionStage === "connected" || mtAccount.connectionStage === "failed") {
    return mtAccount;
  }

  const result = await copyTradingAdapter.pollConnectionStatus(mtAccount.metaApiAccountId);
  mtAccount.connectionStage = result.stage;

  if (result.stage === "failed") {
    mtAccount.status = "error";
    mtAccount.lastError = { message: result.errorMessage ?? "Connection failed.", at: new Date() };
  } else if (result.stage === "connected") {
    // The early return above means this function only ever reaches here
    // for an account that wasn't already "connected" — so this is always
    // the FIRST time it's seen as connected, which is exactly when the
    // strategy subscription should be applied, once.
    mtAccount.status = "linked";
    await applyStrategySubscription(mtAccount, copyTradingAdapter);
  }

  await mtAccount.save();
  return mtAccount;
}

async function applyStrategySubscription(mtAccount: MtAccountDocument, copyTradingAdapter: CopyTradingAdapter): Promise<void> {
  const subscription = await BotSubscription.findOne({ mtAccountId: mtAccount._id, status: "awaiting_link" }).sort({ createdAt: -1 });
  if (!subscription || !mtAccount.metaApiAccountId) return;

  const strategy = await MasterStrategy.findById(subscription.masterStrategyId);
  if (!strategy?.copyFactoryStrategyId) {
    subscription.copyFactoryApplyError = "Master strategy has no CopyFactory strategy configured.";
    await subscription.save();
    return;
  }

  try {
    await copyTradingAdapter.subscribeToStrategy(mtAccount.metaApiAccountId, strategy.copyFactoryStrategyId, subscription.multiplier);
    // `active` only once BOTH payment (the webhook already set
    // paystackSubscriptionCode/currentPeriodEnd) AND copying are real —
    // this is the second half of that transition, not the first.
    subscription.status = "active";
    subscription.copyFactoryAppliedAt = new Date();
  } catch (err) {
    subscription.copyFactoryApplyError = err instanceof Error ? err.message : "Could not apply the strategy subscription.";
  }
  await subscription.save();
}
