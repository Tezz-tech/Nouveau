import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";
import { ONBOARDING_STEPS, type OnboardingStep } from "@nouveau/core";

const onboardingSchema = new Schema(
  {
    completedSteps: {
      type: [{ type: String, enum: ONBOARDING_STEPS }],
      default: [],
    },
  },
  { _id: false }
);

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      // deliberately permissive at the schema level — real validation
      // (format, disposable-domain checks, etc.) belongs in the API's
      // request validation layer, not baked into the persistence model
    },
    passwordHash: {
      type: String,
      required: true,
      select: false, // never returned by a plain `.find()`/`.findOne()` — must opt in with `.select("+passwordHash")`
    },
    kycStatus: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending",
      required: true,
    },
    onboarding: {
      type: onboardingSchema,
      default: () => ({}),
      required: true,
    },
  },
  { timestamps: true }
);

export type UserDocument = HydratedDocument<InferSchemaType<typeof userSchema>>;

export const User = model("User", userSchema);

export function getCompletedOnboardingSteps(user: UserDocument): OnboardingStep[] {
  return (user.onboarding?.completedSteps ?? []) as OnboardingStep[];
}
