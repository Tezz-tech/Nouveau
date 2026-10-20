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
  },
  { timestamps: true }
);

export type UserDocument = HydratedDocument<InferSchemaType<typeof userSchema>>;

export const User = model("User", userSchema);
