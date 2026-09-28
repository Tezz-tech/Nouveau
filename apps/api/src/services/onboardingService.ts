import {
  User,
  MtAccount,
  LpoaSignature,
  Subscription,
  getCompletedOnboardingSteps,
  type UserDocument,
} from "@nouveau/db";
import {
  canCompleteStep,
  completeStep,
  nextStep,
  progressFraction,
  stepsFor,
  ONBOARDING_STEP_DESCRIPTIONS,
  type OnboardingStep,
  type AccountType,
} from "@nouveau/core";
import { encryptSecret } from "@nouveau/security";
import { HttpError } from "../middleware/errorHandler";
import { getKmsProvider } from "../adapters/kms/provider";
import type { KycAdapter, KycSubmission } from "../adapters/kyc/KycAdapter";
import type { BrokerLinkAdapter } from "../adapters/brokerLink/BrokerLinkAdapter";
import type { PaymentAdapter } from "../adapters/payment/PaymentAdapter";
import { LPOA_DOCUMENT_VERSION, computeLpoaDocumentHash } from "./lpoaDocument";

export interface OnboardingStatus {
  accountType: AccountType;
  completedSteps: OnboardingStep[];
  nextStep: OnboardingStep | "complete";
  progressFraction: number;
  steps: { step: OnboardingStep; description: string; completed: boolean }[];
}

export function getOnboardingStatus(user: UserDocument): OnboardingStatus {
  const steps = stepsFor(user.accountType);
  const completedSteps = getCompletedOnboardingSteps(user);
  return {
    accountType: user.accountType,
    completedSteps,
    nextStep: nextStep(steps, completedSteps),
    progressFraction: progressFraction(steps, completedSteps),
    steps: steps.map((step) => ({
      step,
      description: ONBOARDING_STEP_DESCRIPTIONS[step],
      completed: completedSteps.includes(step),
    })),
  };
}

function assertCanCompleteStep(user: UserDocument, step: OnboardingStep): OnboardingStep[] {
  const steps = stepsFor(user.accountType);
  const completedSteps = getCompletedOnboardingSteps(user);
  if (!canCompleteStep(steps, step, completedSteps)) {
    throw new HttpError(409, `Cannot complete the "${step}" step right now — check /onboarding/status for what's next.`);
  }
  return completedSteps;
}

async function markStepComplete(user: UserDocument, step: OnboardingStep): Promise<void> {
  const steps = stepsFor(user.accountType);
  const completedSteps = getCompletedOnboardingSteps(user);
  user.onboarding.completedSteps = completeStep(steps, step, completedSteps);
  await user.save();
}

export async function submitIdentity(
  user: UserDocument,
  kyc: KycAdapter,
  submission: Omit<KycSubmission, "userId">
): Promise<{ verified: boolean; reason?: string }> {
  assertCanCompleteStep(user, "identity");

  const result = await kyc.submitVerification({ ...submission, userId: user.id });

  if (result.status === "verified") {
    user.kycStatus = "verified";
    await markStepComplete(user, "identity");
    return { verified: true };
  }

  user.kycStatus = result.status === "rejected" ? "rejected" : "pending";
  await user.save();
  return { verified: false, reason: result.reason };
}

/** Investor-track only: Nouveau opens a sub-account for the user at a
 *  partner broker. `canCompleteStep` already rejects this for a trader —
 *  "broker_account" isn't in the trader track's step list at all — so
 *  there's no need to re-check `user.accountType` here as well. */
export async function createBrokerAccount(
  user: UserDocument,
  input: { broker: string; login: string; serverName: string }
): Promise<void> {
  assertCanCompleteStep(user, "broker_account");

  await MtAccount.create({
    userId: user._id,
    broker: input.broker,
    login: input.login,
    serverName: input.serverName,
    ownership: "platform_opened",
    status: "pending",
  });

  await markStepComplete(user, "broker_account");
}

/** Trader-track only: the user links their own, pre-existing broker
 *  account — Nouveau never opens or funds this one. Mirrors
 *  `createBrokerAccount`'s shape exactly (broker/login/serverName only, no
 *  password yet) — the investor/read-only password is captured, and
 *  verified read-only, by the shared `credentials` step below. */
export async function linkBrokerAccount(
  user: UserDocument,
  input: { broker: string; login: string; serverName: string }
): Promise<void> {
  assertCanCompleteStep(user, "broker_link");

  await MtAccount.create({
    userId: user._id,
    broker: input.broker,
    login: input.login,
    serverName: input.serverName,
    ownership: "user_linked",
    status: "pending",
  });

  await markStepComplete(user, "broker_link");
}

/** Shared by both tracks. For an investor this just encrypts and stores the
 *  full trading password, same as always. For a trader, the account this
 *  writes to is `user_linked` (created by `linkBrokerAccount` just above),
 *  so this also verifies the password read-only through `brokerLink` before
 *  storing anything — a trader's live signals will be scoped to this
 *  account, so it's confirmed reachable before the step is allowed to
 *  complete. */
export async function captureCredentials(user: UserDocument, brokerLink: BrokerLinkAdapter, mt5Password: string): Promise<void> {
  assertCanCompleteStep(user, "credentials");

  const account = await MtAccount.findOne({ userId: user._id }).sort({ createdAt: -1 });
  if (!account) {
    throw new HttpError(409, "No broker account found — complete the broker account step first.");
  }
  if ((account.ownership === "user_linked") !== (user.accountType === "trader")) {
    // Should be unreachable given canCompleteStep's own gating, but this is
    // exactly the kind of pairing that must never silently drift — fail
    // loudly rather than encrypt the wrong kind of password onto this
    // account.
    throw new HttpError(409, "Account/credential mismatch — cannot continue.");
  }

  if (account.ownership === "user_linked") {
    const result = await brokerLink.verifyReadOnlyAccess({
      broker: account.broker,
      login: account.login,
      serverName: account.serverName,
      investorPassword: mt5Password,
    });
    if (!result.verified) {
      throw new HttpError(422, result.reason ?? "Couldn't verify that broker account.");
    }
    // Verification just confirmed this account is real and reachable —
    // meaningful new information a trader's account can have that an
    // investor's `pending` sub-account can't yet (nothing here has verified
    // that one against a real broker). Investor status is left untouched.
    account.status = "active";
  }

  const encrypted = await encryptSecret(mt5Password, getKmsProvider());
  account.credentialRef = encrypted;
  account.credentialKind = account.ownership === "user_linked" ? "investor_password" : "trading_password";
  await account.save();

  await markStepComplete(user, "credentials");
}

export async function signLpoa(
  user: UserDocument,
  input: { signedName: string; ipAddress: string; userAgent: string }
): Promise<void> {
  assertCanCompleteStep(user, "lpoa");

  if (input.signedName.trim().length < 3) {
    throw new HttpError(400, "Enter your full legal name to sign.");
  }

  await LpoaSignature.create({
    userId: user._id,
    documentVersion: LPOA_DOCUMENT_VERSION,
    documentHash: computeLpoaDocumentHash(),
    signedName: input.signedName.trim(),
    signedAt: new Date(),
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });

  await markStepComplete(user, "lpoa");
}

const TRADER_MONTHLY_PLAN = "trader_monthly" as const;

/** Trader-track only: picks up the flat subscription that pays for the AI
 *  trading assistance. There is no equivalent investor step — an investor
 *  pays via the profit split at settlement, not a subscription captured
 *  during onboarding. */
export async function selectPlan(user: UserDocument, payment: PaymentAdapter): Promise<void> {
  assertCanCompleteStep(user, "plan");

  const result = await payment.createSubscription({ userId: user.id, plan: TRADER_MONTHLY_PLAN });
  await Subscription.create({
    userId: user._id,
    plan: TRADER_MONTHLY_PLAN,
    status: result.status,
    priceCents: result.priceCents,
    currency: result.currency,
    stripeCustomerId: result.stripeCustomerId,
    stripeSubscriptionId: result.stripeSubscriptionId,
  });

  await markStepComplete(user, "plan");
}

