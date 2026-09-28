import { Schema, model, Types, type InferSchemaType, type HydratedDocument } from "mongoose";

/**
 * Mirrors `@nouveau/security`'s `EncryptedSecret` shape exactly — this is
 * the envelope-encrypted MT5 password. The plaintext password is never a
 * field on this document, at any point, under any name. Only the allocator
 * service (Phase 5) holds the KMS key needed to decrypt `credentialRef`;
 * the API service can read and write this document without ever being able
 * to read the password it protects.
 */
const encryptedSecretSchema = new Schema(
  {
    kmsKeyId: { type: String, required: true },
    wrappedDataKey: { type: String, required: true },
    iv: { type: String, required: true },
    authTag: { type: String, required: true },
    ciphertext: { type: String, required: true },
  },
  { _id: false }
);

const mtAccountSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    broker: { type: String, required: true },
    login: { type: String, required: true },
    serverName: { type: String, required: true },
    /** Who opened this account. "platform_opened" (investor track) — Nouveau
     *  created it at a partner broker and needs full trading access to
     *  copy-trade into it. "user_linked" (trader track) — the user's own
     *  pre-existing account, connected read-only for analysis; Nouveau must
     *  never gain trading access to one of these. */
    ownership: {
      type: String,
      enum: ["platform_opened", "user_linked"],
      required: true,
      default: "platform_opened",
    },
    /** Set once the credential-capture onboarding step completes. Absent
     *  before that — never an empty-string placeholder, which could be
     *  mistaken for "encrypted empty password" rather than "not captured
     *  yet." */
    credentialRef: { type: encryptedSecretSchema, required: false },
    /** What kind of password `credentialRef` actually encrypts. A
     *  "user_linked" account must only ever carry "investor_password" — MT4/5's
     *  own built-in read-only credential, which cannot place a trade or move
     *  funds even if this system were fully compromised. Enforced in
     *  apps/api's onboardingService (not just this schema) by rejecting a
     *  "trading_password" write against a "user_linked" account. */
    credentialKind: {
      type: String,
      enum: ["trading_password", "investor_password"],
      required: false,
    },
    metaApiId: { type: String, required: false },
    copyFactoryId: { type: String, required: false },
    status: {
      type: String,
      enum: ["pending", "active", "suspended", "closed"],
      default: "pending",
      required: true,
    },
  },
  { timestamps: true }
);

export type MtAccountDocument = HydratedDocument<InferSchemaType<typeof mtAccountSchema>>;

export const MtAccount = model("MtAccount", mtAccountSchema);

export function toObjectId(id: string): Types.ObjectId {
  return new Types.ObjectId(id);
}
