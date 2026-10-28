import { User, BotSubscription, MasterStrategy, BotPlan, MtAccount } from "@nouveau/db";

export interface UserActivityRow {
  userId: string;
  email: string;
  fullName: string;
  memberSince: string;
  role: string;
  subscription: { botName: string; planName: string; status: string } | null;
  mtAccount: { broker: string; status: string; connectionStage: string } | null;
}

export interface UserActivityPage {
  users: UserActivityRow[];
  total: number;
}

const PAGE_SIZE = 50;

/** One read-only summary row per user, for the admin "monitor user
 *  activity" view. Batches the subscription/strategy/plan/account lookups
 *  (one query per collection, not one per user) rather than an N+1 loop —
 *  this is the one admin list expected to actually grow. */
export async function listUserActivity(page = 1): Promise<UserActivityPage> {
  const skip = Math.max(0, page - 1) * PAGE_SIZE;
  const [users, total] = await Promise.all([
    User.find().sort({ createdAt: -1 }).skip(skip).limit(PAGE_SIZE),
    User.countDocuments(),
  ]);
  const userIds = users.map((u) => u._id);

  const subscriptions = await BotSubscription.find({
    userId: { $in: userIds },
    status: { $in: ["awaiting_link", "active", "past_due"] },
  }).sort({ createdAt: -1 });
  // Most recent non-superseded row per user — subscriptions are append-only,
  // so the first match per user after the sort above is the current one.
  const subByUser = new Map<string, (typeof subscriptions)[number]>();
  for (const sub of subscriptions) {
    const key = sub.userId.toString();
    if (!subByUser.has(key)) subByUser.set(key, sub);
  }

  const strategyIds = [...subByUser.values()].map((s) => s.masterStrategyId);
  const planIds = [...subByUser.values()].map((s) => s.botPlanId);
  const mtAccountIds = [...subByUser.values()].map((s) => s.mtAccountId).filter((id): id is NonNullable<typeof id> => Boolean(id));

  const [strategies, plans, mtAccounts] = await Promise.all([
    MasterStrategy.find({ _id: { $in: strategyIds } }),
    BotPlan.find({ _id: { $in: planIds } }),
    MtAccount.find({ _id: { $in: mtAccountIds } }),
  ]);
  const strategyById = new Map(strategies.map((s) => [s._id.toString(), s]));
  const planById = new Map(plans.map((p) => [p._id.toString(), p]));
  const mtAccountById = new Map(mtAccounts.map((a) => [a._id.toString(), a]));

  const rows: UserActivityRow[] = users.map((user) => {
    const sub = subByUser.get(user._id.toString());
    const strategy = sub ? strategyById.get(sub.masterStrategyId.toString()) : undefined;
    const plan = sub ? planById.get(sub.botPlanId.toString()) : undefined;
    const mtAccount = sub?.mtAccountId ? mtAccountById.get(sub.mtAccountId.toString()) : undefined;

    return {
      userId: user._id.toString(),
      email: user.email,
      fullName: user.fullName,
      memberSince: user.get("createdAt").toISOString(),
      role: user.role,
      subscription: sub && strategy && plan ? { botName: strategy.name, planName: plan.name, status: sub.status } : null,
      mtAccount: mtAccount ? { broker: mtAccount.broker, status: mtAccount.status, connectionStage: mtAccount.connectionStage } : null,
    };
  });

  return { users: rows, total };
}
