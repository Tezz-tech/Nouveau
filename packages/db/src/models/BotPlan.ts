import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";

/**
 * A purchasable plan tied to exactly one `MasterStrategy` — paying for this
 * plan is what links a subscriber's account to that master's bot.
 */
const botPlanSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    masterStrategyId: { type: Schema.Types.ObjectId, ref: "MasterStrategy", required: true, index: true },
    /** Decimal-string bigint cents, never a native numeric BSON type — same
     *  convention as every other money field in this codebase (see
     *  @nouveau/core's `Cents`/`cents()`). A previous, now-deleted
     *  Subscription model stored this as a plain `Number`; don't repeat
     *  that deviation. */
    priceCents: { type: String, required: true },
    currency: { type: String, required: true, default: "NGN" },
    paystackPlanCode: { type: String, required: false },
    interval: { type: String, enum: ["monthly"], required: true, default: "monthly" },
    /** The CopyFactory risk multiplier applied when a subscriber on this
     *  plan is linked or switched — snapshotted onto
     *  `BotSubscription.multiplier` at that moment, not re-derived from
     *  here later (so changing a plan's default never silently reprices an
     *  existing subscriber). */
    defaultMultiplier: { type: Number, required: true, default: 1 },
    status: { type: String, enum: ["active", "retired"], default: "active", required: true },
  },
  { timestamps: true }
);

export type BotPlanDocument = HydratedDocument<InferSchemaType<typeof botPlanSchema>>;

export const BotPlan = model("BotPlan", botPlanSchema);
