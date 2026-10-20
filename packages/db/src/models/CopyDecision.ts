import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";

/**
 * Append-only audit trail of every AI copy-trading decision (invariant #6):
 * approvals, reductions, blocks, no-trades, and every follower copy.
 * Nothing here is ever updated — a service must never call
 * `.findOneAndUpdate`/`.save()` on an existing row.
 */
const copyDecisionSchema = new Schema(
  {
    strategyId: { type: String, required: false, default: null },
    gateVersion: { type: String, required: true },
    symbol: { type: String, required: true },
    bias: { type: String, enum: ["buy", "sell", "hold"], required: true },
    aiConfidence: { type: Number, required: true, min: 0, max: 1 },
    aiReason: { type: String, required: true },
    verdict: { type: String, enum: ["approve", "reduce", "block"], required: true },
    approvedLot: { type: Number, required: false, default: null },
    logReason: { type: String, required: true },
    masterTicket: { type: String, required: false, default: null },
  },
  { timestamps: true }
);

copyDecisionSchema.index({ strategyId: 1, createdAt: -1 });

export type CopyDecisionDocument = HydratedDocument<InferSchemaType<typeof copyDecisionSchema>>;

export const CopyDecision = model("CopyDecision", copyDecisionSchema);
