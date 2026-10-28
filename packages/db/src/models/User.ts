import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false, // never returned by a plain `.find()`/`.findOne()` — must opt in with `.select("+passwordHash")`
    },
    fullName: { type: String, required: true, trim: true },
    /** Set once, on first successful payment — reused across every later
     *  plan switch or resubscribe so Paystack doesn't get asked to create a
     *  duplicate customer record for the same person. */
    paystackCustomerCode: { type: String, required: false },
    /** "admin" has no public, self-serve path to get here — see
     *  scripts/promoteAdmin.ts. Never settable through any API request
     *  body; routes/admin/* only ever read it via requireAdmin. */
    role: { type: String, enum: ["user", "admin"], default: "user", required: true },
  },
  { timestamps: true }
);

export type UserDocument = HydratedDocument<InferSchemaType<typeof userSchema>>;

export const User = model("User", userSchema);
