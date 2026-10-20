import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";

/**
 * One per "bot" — currently a real person trading a real MT5 account
 * (Scalper, Day Trader, Long-term…), not an algorithm yet; bot training is
 * explicitly future scope. Becomes a CopyFactory strategy: every subscriber
 * account linked to it copies whatever trades happen on `metaApiAccountId`.
 *
 * Seeded directly by `scripts/seedMasterStrategies.ts` from real account
 * details handed over outside the app — there is no in-app admin UI for
 * this yet, by explicit choice. The master account's own MT5 credentials
 * are never stored here or anywhere in this database; they go straight
 * into MetaApi's account-creation call from the seed script and nowhere
 * else.
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
    status: { type: String, enum: ["active", "paused"], default: "active", required: true },
  },
  { timestamps: true }
);

export type MasterStrategyDocument = HydratedDocument<InferSchemaType<typeof masterStrategySchema>>;

export const MasterStrategy = model("MasterStrategy", masterStrategySchema);
