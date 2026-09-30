import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";

/**
 * Live desk chat — user-to-user messages shown on the Overview "Wall Street"
 * strip for both tracks. Persisted so a refresh keeps history; broadcast live
 * over SSE (`GET /desk/stream`). Plain text only, 500 chars max (enforced in
 * the route).
 */
const deskMessageSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    displayName: { type: String, required: true },
    accountType: { type: String, enum: ["investor", "trader"], required: true },
    body: { type: String, required: true, maxlength: 500 },
  },
  { timestamps: true }
);

deskMessageSchema.index({ createdAt: -1 });

export type DeskMessageDocument = HydratedDocument<InferSchemaType<typeof deskMessageSchema>>;

export const DeskMessage = model("DeskMessage", deskMessageSchema);
