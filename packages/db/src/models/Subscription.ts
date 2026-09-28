import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";

/**
 * The trader track's flat subscription fee (there is no profit to split —
 * Nouveau never holds or trades a trader's money, see
 * @nouveau/core's `defaultRevenueModelFor`). One document per user's
 * current plan. `stripeCustomerId`/`stripeSubscriptionId` stay null until a
 * real payment adapter is wired (Phase 2) — Phase 1's simulator payment
 * adapter creates these as `active` immediately, with both left null, so
 * onboarding never blocks on real billing existing yet.
 *
 * ASSUMPTION FLAGGED: field names say "stripe" because that's the most
 * common processor to name generically, but @nouveau/core's ledger.ts
 * already assumes Paystack elsewhere in this project (see
 * `recognizeSubscriptionRevenue`'s comment) — confirm the real processor
 * before Phase 2 wires a real PaymentAdapter, and rename these fields to
 * match whichever it turns out to be.
 */
const subscriptionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    plan: { type: String, enum: ["trader_monthly"], required: true },
    status: {
      type: String,
      enum: ["incomplete", "active", "past_due", "canceled"],
      default: "incomplete",
      required: true,
    },
    priceCents: { type: Number, required: true },
    currency: { type: String, default: "usd", required: true },
    stripeCustomerId: { type: String, required: false, default: null },
    stripeSubscriptionId: { type: String, required: false, default: null },
    currentPeriodEnd: { type: Date, required: false, default: null },
  },
  { timestamps: true }
);

export type SubscriptionDocument = HydratedDocument<InferSchemaType<typeof subscriptionSchema>>;

export const Subscription = model("Subscription", subscriptionSchema);
