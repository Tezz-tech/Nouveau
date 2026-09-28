import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";

/**
 * Append-only audit trail of every trading signal shown to a trader —
 * mirrors the versioning discipline `LpoaSignature`/`lpoaDocument.ts`
 * already use for the LPOA text: "what did we tell this user, and when" has
 * to be reconstructable later, since a live buy/sell/hold signal is the
 * actual liability-bearing artifact, not just the tab it's shown on.
 * Nothing here is ever updated after creation — a service must never call
 * `.findOneAndUpdate`/`.save()` on an existing SignalLog document.
 */
const signalLogSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    symbol: { type: String, required: true },
    bias: { type: String, enum: ["buy", "sell", "hold"], required: true },
    confidence: { type: Number, required: true, min: 0, max: 1 },
    narration: { type: String, required: true },
    disclaimerVersion: { type: String, required: true },
  },
  { timestamps: true }
);

export type SignalLogDocument = HydratedDocument<InferSchemaType<typeof signalLogSchema>>;

export const SignalLog = model("SignalLog", signalLogSchema);
