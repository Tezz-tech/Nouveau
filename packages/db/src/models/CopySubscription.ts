import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";

/**
 * One row = one investor's link to the master (CopyFactory "subscription").
 * `mode`/`multiplier`/`fixedLot` mirror @nouveau/core's CopySubscriptionConfig.
 * `status` gates copying: only "active" subscriptions receive master trades.
 */
const copySubscriptionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    mtAccountId: { type: Schema.Types.ObjectId, ref: "MtAccount", required: true },
    strategyId: { type: String, required: false, default: null },
    subscriberId: { type: String, required: false, default: null },
    status: { type: String, enum: ["pending", "active", "paused", "unsubscribed"], default: "pending", required: true },
    mode: { type: String, enum: ["multiplier", "fixed_lot", "balance_proportional"], default: "multiplier", required: true },
    multiplier: { type: Number, default: 1, required: true },
    fixedLot: { type: Number, required: false, default: null },
    maxTradeLot: { type: Number, default: 5, required: true },
    minTradeLot: { type: Number, default: 0.01, required: true },
    reverse: { type: Boolean, default: false, required: true },
    allowedSymbols: { type: [String], default: [], required: true },
  },
  { timestamps: true }
);

copySubscriptionSchema.index({ userId: 1, status: 1 });

export type CopySubscriptionDocument = HydratedDocument<InferSchemaType<typeof copySubscriptionSchema>>;

export const CopySubscription = model("CopySubscription", copySubscriptionSchema);
