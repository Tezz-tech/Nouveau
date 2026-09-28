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
     *  own broker account and trades it themselves off Nouveau's signals.
     *
     *  `default: "investor"` is required here, not decorative: every real
     *  user created before this field existed has no `accountType` stored
     *  in MongoDB at all (`required: true` only validates NEW writes, it
     *  does nothing for documents already sitting in the database), and
     *  "investor" is exactly correct for every one of them — it was the
     *  only track that existed when they signed up. Mongoose applies this
     *  default when hydrating a document that's missing the field, so a
     *  legacy user reads back as "investor" in memory without needing a
     *  data migration first. This crashed `getOnboardingStatus`
     *  ("steps is not iterable") for every pre-existing user in production
     *  before this default was added — confirmed via Vercel logs,
     *  2026-09-28. A migration to actually persist `accountType: "investor"`
     *  onto these rows is still worth running for query/aggregation
     *  correctness later (`find({accountType:...})` won't match a field
     *  that plain doesn't exist on the stored document), but is not
     *  required to fix the crash. */
    accountType: {
      type: String,
      enum: ["investor", "trader"],
      required: true,
      default: "investor",
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
