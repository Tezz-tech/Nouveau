import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";

/**
 * Append-only record of each follower copy (one row per follower per master
 * trade). Mirrors CopyFactory's subscription-transaction history, stored
 * locally so the dashboard can show "what did you copy and why" without a
 * vendor round-trip.
 */
const copyTradeSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    subscriptionId: { type: Schema.Types.ObjectId, ref: "CopySubscription", required: true, index: true },
    masterTicket: { type: String, required: true },
    symbol: { type: String, required: true },
    side: { type: String, enum: ["buy", "sell"], required: true },
    masterLot: { type: Number, required: true },
    followerLot: { type: Number, required: true },
    status: { type: String, enum: ["copied", "skipped", "failed"], required: true },
    reason: { type: String, required: true },
    providerReference: { type: String, required: false, default: null },
  },
  { timestamps: true }
);

copyTradeSchema.index({ userId: 1, createdAt: -1 });

export type CopyTradeDocument = HydratedDocument<InferSchemaType<typeof copyTradeSchema>>;

export const CopyTrade = model("CopyTrade", copyTradeSchema);
