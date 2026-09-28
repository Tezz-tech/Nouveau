import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";

/**
 * Persists a `@nouveau/core` `BalancedTransaction` — one row per deposit,
 * withdrawal request, or withdrawal completion. Append-only: nothing here
 * is ever updated after creation, only new correcting/completing
 * transactions are added (e.g. `withdrawal_completed` alongside an earlier
 * `withdrawal_requested`), same discipline as `SignalLog`.
 *
 * `amountCents` fields are decimal-string bigints, never a native numeric
 * BSON type — money must never touch a float, and letting MongoDB pick a
 * native integer representation invites exactly that kind of implicit
 * precision assumption. Convert with `@nouveau/core`'s `cents()` on read.
 */
const ledgerEntrySchema = new Schema(
  {
    account: { type: String, required: true },
    amountCents: { type: String, required: true },
  },
  { _id: false }
);

const ledgerTransactionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    kind: { type: String, required: true },
    reference: { type: String, required: true, unique: true },
    entries: { type: [ledgerEntrySchema], required: true },
    /** A human-readable amount/description for the transaction list, set
     *  explicitly by whichever service builds the transaction rather than
     *  reverse-engineered from `entries` — simpler and less fragile than
     *  inferring "the interesting number" generically from a double-entry
     *  transaction's legs. */
    displayAmountCents: { type: String, required: true },
    description: { type: String, required: true },
  },
  { timestamps: true }
);

export type LedgerTransactionDocument = HydratedDocument<InferSchemaType<typeof ledgerTransactionSchema>>;

export const LedgerTransaction = model("LedgerTransaction", ledgerTransactionSchema);
