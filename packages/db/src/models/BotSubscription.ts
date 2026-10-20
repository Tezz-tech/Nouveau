import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";

/**
 * Append-only, same discipline this codebase already used for
 * `LedgerTransaction`: never mutate a settled row. Switching bots marks the
 * current row `superseded` and inserts a new one, so there's a free audit
 * trail of every plan a user has ever held, for no extra cost.
 */
const botSubscriptionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    masterStrategyId: { type: Schema.Types.ObjectId, ref: "MasterStrategy", required: true },
    botPlanId: { type: Schema.Types.ObjectId, ref: "BotPlan", required: true },
    /** Null until the user's MtAccount finishes linking. A paid-but-
     *  unlinked user is a real, trackable, queryable state
     *  (`status: "awaiting_link"`), not an edge case to special-case later —
     *  see apps/api's support-runbook query over this + MtAccount.status. */
    mtAccountId: { type: Schema.Types.ObjectId, ref: "MtAccount", required: false },
    /** Snapshotted from BotPlan.defaultMultiplier at creation/switch time —
     *  set explicitly, never re-derived from the plan later, so changing a
     *  plan's default multiplier never silently reprices an existing
     *  subscriber. */
    multiplier: { type: Number, required: true },
    paystackSubscriptionCode: { type: String, required: false },
    status: {
      type: String,
      enum: ["awaiting_link", "active", "past_due", "canceled", "superseded"],
      required: true,
      default: "awaiting_link",
    },
    /** Did the CopyFactory `updateSubscriber()` call for THIS row actually
     *  succeed — distinct from `MtAccount.copyFactorySubscriberConfigured`,
     *  which only tracks the one-time account-level role setting. */
    copyFactoryAppliedAt: { type: Date, required: false },
    copyFactoryApplyError: { type: String, required: false },
    currentPeriodEnd: { type: Date, required: false },
  },
  { timestamps: true }
);

export type BotSubscriptionDocument = HydratedDocument<InferSchemaType<typeof botSubscriptionSchema>>;

export const BotSubscription = model("BotSubscription", botSubscriptionSchema);
