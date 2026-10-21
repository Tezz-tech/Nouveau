import { User, BotPlan, BotSubscription, MasterStrategy, MtAccount, type UserDocument } from "@nouveau/db";
import { HttpError } from "../middleware/errorHandler";
import type { PaymentAdapter } from "../adapters/payment/PaymentAdapter";
import type { CopyTradingAdapter } from "../adapters/copyTrading/CopyTradingAdapter";
import type { WebhookEvent } from "../adapters/payment/PaymentAdapter";

/** Starts a Paystack checkout for a chosen bot plan. Creates the plan on
 *  Paystack (and caches the code on BotPlan) the first time it's bought,
 *  same idempotent-by-stored-field discipline as the master-strategy seed
 *  script. No `BotSubscription` row exists yet at this point — see
 *  `handlePaymentSucceeded` for why that only happens once Paystack
 *  actually confirms payment via webhook, not optimistically here. */
export async function initiateCheckout(
  user: UserDocument,
  botPlanId: string,
  callbackUrl: string,
  paymentAdapter: PaymentAdapter
): Promise<{ authorizationUrl: string }> {
  const plan = await BotPlan.findOne({ _id: botPlanId, status: "active" });
  if (!plan) {
    throw new HttpError(404, "That bot plan doesn't exist.");
  }

  let planCode = plan.paystackPlanCode;
  if (!planCode) {
    const created = await paymentAdapter.createPlan({
      name: plan.name,
      priceCents: plan.priceCents,
      currency: plan.currency,
      interval: plan.interval,
    });
    planCode = created.planCode;
    plan.paystackPlanCode = planCode;
    await plan.save();
  }

  const result = await paymentAdapter.initializeTransaction({
    email: user.email,
    priceCents: plan.priceCents,
    currency: plan.currency,
    planCode,
    callbackUrl,
    metadata: { userId: user._id.toString(), botPlanId: plan._id.toString() },
  });

  return { authorizationUrl: result.authorizationUrl };
}

/**
 * A confirmed Paystack payment (`charge.success`/`subscription.create`).
 * Creates the real `BotSubscription` row — append-only: if the user
 * already had one (awaiting_link/active/past_due), it's marked
 * `superseded`, never mutated in place, same as every bot switch. If the
 * user already has a connected `MtAccount` (this is a bot *switch*, not a
 * first purchase), the new strategy subscription is applied immediately —
 * no re-linking needed, exactly the "switching bots is just re-pointing
 * the subscription" mechanism confirmed with the client. Otherwise the row
 * starts `awaiting_link`, waiting on `mtAccountService.linkMtAccount`.
 *
 * Idempotent against duplicate webhook delivery via
 * `paystackSubscriptionCode` uniqueness-by-lookup — Paystack (like most
 * webhook senders) does not guarantee exactly-once delivery.
 */
export async function handlePaymentSucceeded(event: WebhookEvent, copyTradingAdapter: CopyTradingAdapter): Promise<void> {
  const userId = typeof event.metadata?.userId === "string" ? event.metadata.userId : undefined;
  const botPlanId = typeof event.metadata?.botPlanId === "string" ? event.metadata.botPlanId : undefined;
  const subscriptionCode = event.subscriptionCode ?? event.reference;
  if (!userId || !botPlanId || !subscriptionCode) return; // not a checkout we recognize — ignore safely, never throw on a webhook we can't parse

  const alreadyApplied = await BotSubscription.findOne({ paystackSubscriptionCode: subscriptionCode });
  if (alreadyApplied) return;

  const [user, plan] = await Promise.all([User.findById(userId), BotPlan.findById(botPlanId)]);
  if (!user || !plan) return;

  if (event.customerCode && !user.paystackCustomerCode) {
    user.paystackCustomerCode = event.customerCode;
    await user.save();
  }

  const previous = await BotSubscription.findOne({
    userId: user._id,
    status: { $in: ["awaiting_link", "active", "past_due"] },
  }).sort({ createdAt: -1 });
  const existingLinkedAccount = previous?.mtAccountId ? await MtAccount.findOne({ _id: previous.mtAccountId, status: "linked" }) : null;

  if (previous) {
    previous.status = "superseded";
    await previous.save();
  }

  const next = await BotSubscription.create({
    userId: user._id,
    masterStrategyId: plan.masterStrategyId,
    botPlanId: plan._id,
    mtAccountId: existingLinkedAccount?._id,
    multiplier: plan.defaultMultiplier,
    paystackSubscriptionCode: subscriptionCode,
    status: existingLinkedAccount ? "active" : "awaiting_link",
  });

  if (existingLinkedAccount?.metaApiAccountId) {
    const strategy = await MasterStrategy.findById(plan.masterStrategyId);
    if (strategy?.copyFactoryStrategyId) {
      try {
        await copyTradingAdapter.subscribeToStrategy(existingLinkedAccount.metaApiAccountId, strategy.copyFactoryStrategyId, plan.defaultMultiplier);
        next.copyFactoryAppliedAt = new Date();
      } catch (err) {
        next.copyFactoryApplyError = err instanceof Error ? err.message : "Could not apply the new strategy subscription.";
      }
      await next.save();
    }
  }
}

/** `invoice.payment_failed` / `subscription.disable` — deactivates the
 *  matching row without ever mutating a different one. */
export async function handleSubscriptionDeactivated(event: WebhookEvent, status: "past_due" | "canceled"): Promise<void> {
  const code = event.subscriptionCode ?? event.reference;
  if (!code) return;
  await BotSubscription.findOneAndUpdate({ paystackSubscriptionCode: code, status: { $in: ["active", "past_due"] } }, { status });
}
