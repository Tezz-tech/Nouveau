import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";

/**
 * The signed Limited Power of Attorney. `documentHash` is the SHA-256 of
 * the exact document text shown to the user at signing time — if the LPOA
 * template ever changes, old signatures still verifiably correspond to the
 * text the user actually saw, not whatever the template says today.
 *
 * ASSUMPTION FLAGGED: the brief doesn't name a real e-signature provider
 * (DocuSign, HelloSign, etc.). This models a lightweight self-hosted
 * consent capture — typed full legal name plus a full audit trail
 * (timestamp, IP, user agent, document hash) — which is legally reasonable
 * for many jurisdictions but may not satisfy a "qualified electronic
 * signature" requirement everywhere Nouveau operates. Confirm with legal
 * before relying on this as sufficient; swapping in a real e-signature
 * provider later means adding fields here (e.g. `providerEnvelopeId`), not
 * a schema rewrite.
 */
const lpoaSignatureSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    documentVersion: { type: String, required: true },
    documentHash: { type: String, required: true },
    signedName: { type: String, required: true, trim: true },
    signedAt: { type: Date, required: true },
    ipAddress: { type: String, required: true },
    userAgent: { type: String, required: true },
  },
  { timestamps: true }
);

export type LpoaSignatureDocument = HydratedDocument<InferSchemaType<typeof lpoaSignatureSchema>>;

export const LpoaSignature = model("LpoaSignature", lpoaSignatureSchema);
