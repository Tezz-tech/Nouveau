import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";
import { ALL_ONBOARDING_STEPS, type OnboardingStep } from "@nouveau/core";

const onboardingSchema = new Schema(
  {
    completedSteps: {
      // Validated against the union of both tracks' steps, not one track's
      // list — which specific steps are valid in what order is enforced by
      // @nouveau/core's canCompleteStep against the user's own accountType,
      // not by this schema. This enum only rejects outright garbage.
      type: [{ type: String, enum: ALL_ONBOARDING_STEPS }],
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
    /** Decided once at signup, never changed by the API in Phase 1 — picks
     *  which onboarding-step sequence and default revenue model apply (see
     *  @nouveau/core's `stepsFor`/`defaultRevenueModelFor`). "investor"
     *  deposits money and Nouveau trades it for them; "trader" links their
     *  own broker account and trades it themselves off Nouveau's signals. */
    accountType: {
      type: String,
      enum: ["investor", "trader"],
      required: true,
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
