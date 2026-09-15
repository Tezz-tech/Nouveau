import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";

const passwordResetTokenSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    /** Only the hash is ever stored — see `@nouveau/security`'s `tokens.ts`.
     *  The raw token exists only in the reset email link and the request
     *  that redeems it. */
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, required: false },
  },
  { timestamps: true }
);

// A reset link is single-use and time-boxed; letting MongoDB expire the
// document automatically means a stale, unused token can't be brute-forced
// indefinitely just because no one ever cleaned up the collection.
passwordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type PasswordResetTokenDocument = HydratedDocument<InferSchemaType<typeof passwordResetTokenSchema>>;

export const PasswordResetToken = model("PasswordResetToken", passwordResetTokenSchema);
