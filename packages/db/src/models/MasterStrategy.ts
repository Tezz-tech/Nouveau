import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";

/**
 * One row = the platform's master strategy (CopyFactory "strategy").
 * There is exactly one active master: the account whose trades every
 * investor follower copies. `metaapiAccountId` + `strategyId` are filled
 * once the real MetaApi/CopyFactory wiring exists; until then the
 * simulator adapter drives copies locally.
 */
const masterStrategySchema = new Schema(
  {
    name: { type: String, required: true, default: "Nouveau Master" },
    status: { type: String, enum: ["active", "paused"], default: "active", required: true },
    metaapiAccountId: { type: String, required: false, default: null },
    strategyId: { type: String, required: false, default: null },
    maxOpenPositions: { type: Number, required: true, default: 5 },
    maxDailyLossPct: { type: Number, required: true, default: 5 },
  },
  { timestamps: true }
);

export type MasterStrategyDocument = HydratedDocument<InferSchemaType<typeof masterStrategySchema>>;

export const MasterStrategy = model("MasterStrategy", masterStrategySchema);
