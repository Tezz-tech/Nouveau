import {
  User,
  MtAccount,
  LpoaSignature,
  getCompletedOnboardingSteps,
  type UserDocument,
} from "@nouveau/db";
import {
  canCompleteStep,
  completeStep,
  nextStep,
  progressFraction,
  ONBOARDING_STEPS,
  ONBOARDING_STEP_DESCRIPTIONS,
  type OnboardingStep,
} from "@nouveau/core";
import { encryptSecret } from "@nouveau/security";
import { HttpError } from "../middleware/errorHandler";
import { getKmsProvider } from "../adapters/kms/provider";
import type { KycAdapter, KycSubmission } from "../adapters/kyc/KycAdapter";
import { LPOA_DOCUMENT_VERSION, computeLpoaDocumentHash } from "./lpoaDocument";

export interface OnboardingStatus {
  completedSteps: OnboardingStep[];
  nextStep: OnboardingStep | "complete";
  progressFraction: number;
  steps: { step: OnboardingStep; description: string; completed: boolean }[];
}

export function getOnboardingStatus(user: UserDocument): OnboardingStatus {
  const completedSteps = getCompletedOnboardingSteps(user);
  return {
    completedSteps,
    nextStep: nextStep(completedSteps),
    progressFraction: progressFraction(completedSteps),
    steps: ONBOARDING_STEPS.map((step) => ({
      step,
      description: ONBOARDING_STEP_DESCRIPTIONS[step],
      completed: completedSteps.includes(step),
    })),
  };
}

function assertCanCompleteStep(user: UserDocument, step: OnboardingStep): OnboardingStep[] {
  const completedSteps = getCompletedOnboardingSteps(user);
  if (!canCompleteStep(step, completedSteps)) {
    throw new HttpError(409, `Cannot complete the "${step}" step right now — check /onboarding/status for what's next.`);
  }
  return completedSteps;
}

async function markStepComplete(user: UserDocument, step: OnboardingStep): Promise<void> {
  const completedSteps = getCompletedOnboardingSteps(user);
  user.onboarding.completedSteps = completeStep(step, completedSteps);
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
    status: "pending",
  });

  await markStepComplete(user, "broker_account");
}

export async function captureCredentials(user: UserDocument, mt5Password: string): Promise<void> {
  assertCanCompleteStep(user, "credentials");

  const account = await MtAccount.findOne({ userId: user._id }).sort({ createdAt: -1 });
  if (!account) {
    throw new HttpError(409, "No broker account found — complete the broker account step first.");
  }

  const encrypted = await encryptSecret(mt5Password, getKmsProvider());
  account.credentialRef = encrypted;
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
