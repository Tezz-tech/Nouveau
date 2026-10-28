import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";

const lastErrorSchema = new Schema(
  {
    message: { type: String, required: true },
    at: { type: Date, required: true },
  },
  { _id: false }
);

/**
 * One per "bot" — currently a real person trading a real MT5 account
 * (Scalper, Day Trader, Long-term…), not an algorithm yet; bot training is
 * explicitly future scope. Becomes a CopyFactory strategy: every subscriber
 * account linked to it copies whatever trades happen on `metaApiAccountId`.
 *
 * Created either by an admin via `routes/admin/masterStrategies.ts` (the
 * normal path now) or by `scripts/seedMasterStrategies.ts` (still useful
 * for bulk/offline setup). Either way, the master account's own MT5
 * credentials are never stored here or anywhere in this database — they go
 * straight into MetaApi's account-creation call and nowhere else.
 */
const masterStrategySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    metaApiAccountId: { type: String, required: true, unique: true },
    copyFactoryStrategyId: { type: String, required: false },
    maxTradeRiskPct: { type: Number, required: false },
    /** Snapshot of the config last pushed to CopyFactory's updateStrategy —
     *  lets the seed script diff against this instead of blindly
     *  re-pushing identical config on every run. */
    copyFactoryStrategyConfig: { type: Schema.Types.Mixed, required: false },
    /** "provisioning" only applies to the admin-created, freshly-provisioned
     *  path (an existing-MetaApi-account admin submission skips straight to
     *  "active") — mirrors MtAccount's connectionStage/status split: this is
     *  what an admin polls while MetaApi deploys/connects the new master
     *  account and before the CopyFactory strategy is finalized. */
    status: { type: String, enum: ["provisioning", "active", "paused", "failed"], default: "active", required: true },
    lastError: { type: lastErrorSchema, required: false },
  },
  { timestamps: true }
);

export type MasterStrategyDocument = HydratedDocument<InferSchemaType<typeof masterStrategySchema>>;

export const MasterStrategy = model("MasterStrategy", masterStrategySchema);
