import { Schema, model, Types, type InferSchemaType, type HydratedDocument } from "mongoose";

/**
 * Mirrors `@nouveau/security`'s `EncryptedSecret` shape exactly — this is
 * the envelope-encrypted MT5 password. The plaintext password is never a
 * field on this document, at any point, under any name.
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

const consentSchema = new Schema(
  {
    version: { type: String, required: true },
    acceptedAt: { type: Date, required: true },
    acceptedIp: { type: String, required: true },
    userAgent: { type: String, required: true },
  },
  { _id: false }
);

const lastErrorSchema = new Schema(
  {
    message: { type: String, required: true },
    at: { type: Date, required: true },
  },
  { _id: false }
);

/**
 * A user's own, pre-existing MT5 account, linked for copy trading.
 * `credentialRef` is always a real, trading-capable password — CopyFactory
 * places real orders on this account to mirror the chosen master strategy,
 * so (unlike the old, deleted read-only "trader" track) there is no
 * investor/read-only variant here; this is a real escalation from how this
 * project handled credentials before. Nouveau never takes custody of the
 * account's funds, only the ability to place copied trades on it —
 * `consent` records that this was explained and accepted at linking time,
 * the same discipline the old (deleted) LpoaSignature model applied to a
 * comparable consent escalation.
 */
const mtAccountSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    broker: { type: String, required: true },
    login: { type: String, required: true },
    serverName: { type: String, required: true },
    /** Absent until the credential-capture step completes — never an
     *  empty-string placeholder, which could be mistaken for "encrypted
     *  empty password" rather than "not captured yet." */
    credentialRef: { type: encryptedSecretSchema, required: false },
    metaApiAccountId: { type: String, required: false },
    /** The one-time MetaApi account-level role setting
     *  (`copyFactoryRoles: ['SUBSCRIBER']`) — distinct from whether any
     *  particular `BotSubscription` has successfully applied a strategy
     *  subscription on top of it. */
    copyFactorySubscriberConfigured: { type: Boolean, required: true, default: false },
    /** Finer-grained than `status` below — this is what the linking
     *  wizard's poll endpoint actually renders while waiting on MetaApi to
     *  deploy and connect the account, which can take real wall-clock
     *  time. */
    connectionStage: {
      type: String,
      enum: ["deploying", "connecting", "connected", "failed"],
      required: true,
      default: "deploying",
    },
    lastError: { type: lastErrorSchema, required: false },
    consent: { type: consentSchema, required: true },
    status: { type: String, enum: ["pending", "linked", "error", "closed"], default: "pending", required: true },
  },
  { timestamps: true }
);

export type MtAccountDocument = HydratedDocument<InferSchemaType<typeof mtAccountSchema>>;

export const MtAccount = model("MtAccount", mtAccountSchema);

export function toObjectId(id: string): Types.ObjectId {
  return new Types.ObjectId(id);
}
