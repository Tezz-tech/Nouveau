import { BotSubscription, MasterStrategy, BotPlan, MtAccount, type UserDocument } from "@nouveau/db";
import { getFlowStatus, type FlowStatus } from "./flowStatusService";

export interface ProfileSummary {
  email: string;
  fullName: string;
  memberSince: string;
  flow: FlowStatus;
  bot: { name: string; description: string } | null;
  plan: { name: string; priceCents: string; currency: string; interval: string } | null;
  mtAccount: { broker: string; login: string; serverName: string; status: string; connectionStage: string } | null;
}

/** Read-only account summary for the dashboard's Profile page. Never
 *  includes a credential — MtAccount's `credentialRef` (the
 *  envelope-encrypted trading password) is deliberately left off this
 *  shape entirely, not just unset. */
export async function getProfileSummary(user: UserDocument): Promise<ProfileSummary> {
  const flow = await getFlowStatus(user);

  const subscription = flow.subscription
    ? await BotSubscription.findOne({ userId: user._id, status: { $in: ["awaiting_link", "active", "past_due"] } }).sort({
        createdAt: -1,
      })
    : null;

  const [strategy, plan, mtAccount] = await Promise.all([
    subscription ? MasterStrategy.findById(subscription.masterStrategyId) : null,
    subscription ? BotPlan.findById(subscription.botPlanId) : null,
    subscription?.mtAccountId ? MtAccount.findById(subscription.mtAccountId) : null,
  ]);

  return {
    email: user.email,
    fullName: user.fullName,
    memberSince: user.get("createdAt").toISOString(),
    flow,
    bot: strategy ? { name: strategy.name, description: strategy.description } : null,
    plan: plan ? { name: plan.name, priceCents: plan.priceCents, currency: plan.currency, interval: plan.interval } : null,
    mtAccount: mtAccount
      ? {
          broker: mtAccount.broker,
          login: mtAccount.login,
          serverName: mtAccount.serverName,
          status: mtAccount.status,
          connectionStage: mtAccount.connectionStage,
        }
      : null,
  };
}
