import { BotSubscription, MtAccount, type UserDocument } from "@nouveau/db";

/**
 * There's no generic onboarding-step tracker this time (the old
 * `packages/core`'s onboarding module, deleted in the reset, existed to
 * handle two branching account-type flows — this product has exactly one,
 * linear flow). Where a user is in it is derived entirely from whether
 * they have a live `BotSubscription` and how far its `MtAccount` has
 * gotten connecting — not tracked as separate state that could drift from
 * the records it would be describing.
 */
export type FlowStage = "choose_bot" | "awaiting_link" | "linking" | "link_failed" | "complete";

export interface FlowStatus {
  stage: FlowStage;
  subscription: { masterStrategyId: string; botPlanId: string; status: string } | null;
  mtAccount: { connectionStage: string; status: string; lastError: string | null } | null;
}

export async function getFlowStatus(user: UserDocument): Promise<FlowStatus> {
  const subscription = await BotSubscription.findOne({
    userId: user._id,
    status: { $in: ["awaiting_link", "active", "past_due"] },
  }).sort({ createdAt: -1 });

  if (!subscription) {
    return { stage: "choose_bot", subscription: null, mtAccount: null };
  }

  const subSummary = {
    masterStrategyId: subscription.masterStrategyId.toString(),
    botPlanId: subscription.botPlanId.toString(),
    status: subscription.status,
  };

  const mtAccount = subscription.mtAccountId ? await MtAccount.findById(subscription.mtAccountId) : null;
  if (!mtAccount) {
    return { stage: "awaiting_link", subscription: subSummary, mtAccount: null };
  }

  const mtSummary = {
    connectionStage: mtAccount.connectionStage,
    status: mtAccount.status,
    lastError: mtAccount.lastError?.message ?? null,
  };

  if (mtAccount.connectionStage === "failed") {
    return { stage: "link_failed", subscription: subSummary, mtAccount: mtSummary };
  }
  if (mtAccount.connectionStage !== "connected") {
    return { stage: "linking", subscription: subSummary, mtAccount: mtSummary };
  }
  return { stage: "complete", subscription: subSummary, mtAccount: mtSummary };
}
