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
    /** Set once the credential-capture onboarding step completes. Absent
     *  before that — never an empty-string placeholder, which could be
     *  mistaken for "encrypted empty password" rather than "not captured
     *  yet." */
    credentialRef: { type: encryptedSecretSchema, required: false },
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
