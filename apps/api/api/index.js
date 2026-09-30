// ../../packages/db/src/connection.ts
import mongoose from "mongoose";
async function connectToDatabase(uri) {
  return mongoose.connect(uri);
}

// ../../packages/db/src/models/User.ts
import { Schema, model } from "mongoose";

// ../../packages/core/src/money.ts
function cents(value) {
  if (typeof value === "number") {
    if (!Number.isInteger(value)) {
      throw new TypeError(
        `cents() received a non-integer number (${value}). Money is always an integer count of minor units \u2014 convert upstream, don't round here.`
      );
    }
    if (!Number.isSafeInteger(value)) {
      throw new RangeError(
        `cents() received a number outside the safe integer range (${value}). Pass a bigint or string for amounts this large.`
      );
    }
  }
  return BigInt(value);
}
var ZERO_CENTS = cents(0n);
function add(a, b) {
  return cents(a + b);
}
function subtract(a, b) {
  return cents(a - b);
}
function negate(a) {
  return cents(-a);
}
function sum(values) {
  return values.reduce((acc, v) => add(acc, v), ZERO_CENTS);
}
function isPositive(a) {
  return a > ZERO_CENTS;
}
function isZero(a) {
  return a === ZERO_CENTS;
}
function ratioOf(amount, numerator, denominator) {
  if (denominator === 0n) {
    throw new RangeError("ratioOf: denominator must not be zero");
  }
  const negativeResult = amount < 0n !== numerator < 0n !== denominator < 0n;
  const absAmount = amount < 0n ? -amount : amount;
  const absNum = numerator < 0n ? -numerator : numerator;
  const absDen = denominator < 0n ? -denominator : denominator;
  const product = absAmount * absNum;
  const quotient = product / absDen;
  const remainder = product % absDen;
  const roundedUp = remainder * 2n >= absDen ? quotient + 1n : quotient;
  return cents(negativeResult ? -roundedUp : roundedUp);
}
function splitByRatio(amount, numerator, denominator) {
  const first = ratioOf(amount, numerator, denominator);
  const second = subtract(amount, first);
  return { first, second };
}
function toDecimalString(amount) {
  const negative = amount < ZERO_CENTS;
  const absValue = negative ? -amount : amount;
  const wholePart = absValue / 100n;
  const fractionPart = (absValue % 100n).toString().padStart(2, "0");
  return `${negative ? "-" : ""}${wholePart}.${fractionPart}`;
}

// ../../packages/core/src/ledger.ts
var accounts = {
  external: () => "external",
  marketPnl: () => "market:pnl",
  custody: (userId) => `custody:${userId}`,
  atRisk: (userId) => `atrisk:${userId}`,
  platformRevenue: () => "platform:revenue",
  payoutPending: (userId) => `payout:${userId}`
};
var UnbalancedTransactionError = class extends Error {
  constructor(entries, total) {
    super(
      `Ledger entries must sum to zero; got ${toDecimalString(total)} across ${entries.length} entries: ` + entries.map((e) => `${e.account}=${toDecimalString(e.amountCents)}`).join(", ")
    );
    this.name = "UnbalancedTransactionError";
  }
};
function assertBalanced(entries) {
  const total = sum(entries.map((e) => e.amountCents));
  if (!isZero(total)) {
    throw new UnbalancedTransactionError(entries, total);
  }
}
function buildTransaction(kind, reference, entries) {
  if (entries.length < 2) {
    throw new RangeError("A ledger transaction needs at least two entries (double-entry, minimum one debit and one credit).");
  }
  assertBalanced(entries);
  return { kind, reference, entries };
}
function requirePositive(amount, label) {
  if (!isPositive(amount)) {
    throw new RangeError(`${label} must be a positive amount; got ${toDecimalString(amount)}`);
  }
}
function splitDeposit(userId, reference, depositAmount) {
  requirePositive(depositAmount, "depositAmount");
  const { first: custodyHalf, second: atRiskHalf } = splitByRatio(depositAmount, 1n, 2n);
  return buildTransaction("deposit", reference, [
    { account: accounts.external(), amountCents: negate(depositAmount) },
    { account: accounts.custody(userId), amountCents: custodyHalf },
    { account: accounts.atRisk(userId), amountCents: atRiskHalf }
  ]);
}
function requestWithdrawal(userId, reference, amount) {
  requirePositive(amount, "amount");
  return buildTransaction("withdrawal_requested", reference, [
    { account: accounts.custody(userId), amountCents: negate(amount) },
    { account: accounts.payoutPending(userId), amountCents: amount }
  ]);
}
function completeWithdrawal(userId, reference, amount) {
  requirePositive(amount, "amount");
  return buildTransaction("withdrawal_completed", reference, [
    { account: accounts.payoutPending(userId), amountCents: negate(amount) },
    { account: accounts.external(), amountCents: amount }
  ]);
}

// ../../packages/core/src/cycle/settlement.ts
function computeTarget(depositCents) {
  const { first: custodyCents, second: atRiskCents } = splitByRatio(depositCents, 1n, 2n);
  return add(custodyCents, add(atRiskCents, atRiskCents));
}

// ../../packages/core/src/onboarding/types.ts
var ONBOARDING_STEPS_BY_TYPE = {
  investor: ["account", "identity", "broker_account", "credentials", "lpoa"],
  trader: ["account", "identity", "broker_link", "credentials", "plan"]
};
function stepsFor(accountType) {
  return ONBOARDING_STEPS_BY_TYPE[accountType];
}
var ALL_ONBOARDING_STEPS = Array.from(
  new Set(Object.values(ONBOARDING_STEPS_BY_TYPE).flat())
);
var ONBOARDING_STEP_DESCRIPTIONS = {
  account: "Create your login with an email and password.",
  identity: "Confirm your identity, as required by law before you can trade.",
  broker_account: "We open a trading sub-account in your name at our partner broker.",
  credentials: "Your trading account login is encrypted \u2014 no one at Nouveau can read it back.",
  lpoa: "You authorize our trading desk to manage the at-risk half of your deposit, within limits you set now.",
  broker_link: "Link your existing trading account \u2014 read-only, so we can see your activity but never place a trade or move funds.",
  plan: "Choose the subscription that covers your live trading analysis."
};

// ../../packages/core/src/onboarding/progress.ts
var InvalidOnboardingStepError = class extends Error {
  constructor(step, completedSteps) {
    super(
      `Cannot complete onboarding step "${step}" \u2014 either it's already done, a required earlier step isn't, or this step doesn't belong to this account's track. Completed so far: [${completedSteps.join(", ")}]`
    );
    this.step = step;
    this.completedSteps = completedSteps;
    this.name = "InvalidOnboardingStepError";
  }
};
function nextStep(steps, completedSteps) {
  for (const step of steps) {
    if (!completedSteps.includes(step)) return step;
  }
  return "complete";
}
function canCompleteStep(steps, step, completedSteps) {
  if (completedSteps.includes(step)) return false;
  const index = steps.indexOf(step);
  if (index === -1) return false;
  const requiredPriorSteps = steps.slice(0, index);
  return requiredPriorSteps.every((s) => completedSteps.includes(s));
}
function completeStep(steps, step, completedSteps) {
  if (!canCompleteStep(steps, step, completedSteps)) {
    throw new InvalidOnboardingStepError(step, completedSteps);
  }
  return [...completedSteps, step];
}
function progressFraction(steps, completedSteps) {
  const validCompleted = completedSteps.filter((s) => steps.includes(s));
  return validCompleted.length / steps.length;
}

// ../../packages/core/src/signals/indicators.ts
function movingAverage(closes, period) {
  if (period <= 0) throw new RangeError("period must be positive");
  if (closes.length < period) {
    throw new RangeError(`movingAverage needs at least ${period} closes, got ${closes.length}`);
  }
  const window = closes.slice(closes.length - period);
  return window.reduce((sum2, v) => sum2 + v, 0) / period;
}
function rsi(closes, period = 14) {
  if (period <= 0) throw new RangeError("period must be positive");
  if (closes.length < period + 1) {
    throw new RangeError(`rsi needs at least ${period + 1} closes, got ${closes.length}`);
  }
  const window = closes.slice(closes.length - (period + 1));
  let gains = 0;
  let losses = 0;
  for (let i = 1; i < window.length; i++) {
    const change = window[i] - window[i - 1];
    if (change > 0) gains += change;
    else losses += -change;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return avgGain === 0 ? 50 : 100;
  const relativeStrength = avgGain / avgLoss;
  return 100 - 100 / (1 + relativeStrength);
}
function momentum(closes, period) {
  if (period <= 0) throw new RangeError("period must be positive");
  if (closes.length < period + 1) {
    throw new RangeError(`momentum needs at least ${period + 1} closes, got ${closes.length}`);
  }
  const past = closes[closes.length - 1 - period];
  const current = closes[closes.length - 1];
  if (past === 0) throw new RangeError("cannot compute momentum from a zero base price");
  return (current - past) / past * 100;
}

// ../../packages/core/src/signals/computeSignal.ts
var SHORT_MA_PERIOD = 10;
var LONG_MA_PERIOD = 30;
var RSI_PERIOD = 14;
var MOMENTUM_PERIOD = 10;
var RSI_OVERBOUGHT = 70;
var RSI_OVERSOLD = 30;
var MIN_CANDLES_FOR_SIGNAL = LONG_MA_PERIOD + 1;
function computeSignal(candles) {
  if (candles.length < MIN_CANDLES_FOR_SIGNAL) {
    throw new RangeError(`computeSignal needs at least ${MIN_CANDLES_FOR_SIGNAL} candles, got ${candles.length}`);
  }
  const closes = candles.map((c) => c.close);
  const shortMovingAverage = movingAverage(closes, SHORT_MA_PERIOD);
  const longMovingAverage = movingAverage(closes, LONG_MA_PERIOD);
  const rsiValue = rsi(closes, RSI_PERIOD);
  const momentumValue = momentum(closes, MOMENTUM_PERIOD);
  const trendVote = Math.sign(shortMovingAverage - longMovingAverage);
  const rsiVote = rsiValue >= RSI_OVERBOUGHT ? -1 : rsiValue <= RSI_OVERSOLD ? 1 : 0;
  const momentumVote = Math.sign(momentumValue);
  const score = trendVote + rsiVote + momentumVote;
  const bias = score > 0 ? "buy" : score < 0 ? "sell" : "hold";
  const confidence = Math.abs(score) / 3;
  return {
    bias,
    confidence,
    components: { shortMovingAverage, longMovingAverage, rsi: rsiValue, momentum: momentumValue }
  };
}

// ../../packages/db/src/models/User.ts
var onboardingSchema = new Schema(
  {
    completedSteps: {
      // Validated against the union of both tracks' steps, not one track's
      // list — which specific steps are valid in what order is enforced by
      // @nouveau/core's canCompleteStep against the user's own accountType,
      // not by this schema. This enum only rejects outright garbage.
      type: [{ type: String, enum: ALL_ONBOARDING_STEPS }],
      default: []
    }
  },
  { _id: false }
);
var userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
      // deliberately permissive at the schema level — real validation
      // (format, disposable-domain checks, etc.) belongs in the API's
      // request validation layer, not baked into the persistence model
    },
    passwordHash: {
      type: String,
      required: true,
      select: false
      // never returned by a plain `.find()`/`.findOne()` — must opt in with `.select("+passwordHash")`
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
      default: "investor"
    },
    kycStatus: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending",
      required: true
    },
    onboarding: {
      type: onboardingSchema,
      default: () => ({}),
      required: true
    }
  },
  { timestamps: true }
);
var User = model("User", userSchema);
function getCompletedOnboardingSteps(user) {
  return user.onboarding?.completedSteps ?? [];
}

// ../../packages/db/src/models/MtAccount.ts
import { Schema as Schema2, model as model2, Types } from "mongoose";
var encryptedSecretSchema = new Schema2(
  {
    kmsKeyId: { type: String, required: true },
    wrappedDataKey: { type: String, required: true },
    iv: { type: String, required: true },
    authTag: { type: String, required: true },
    ciphertext: { type: String, required: true }
  },
  { _id: false }
);
var mtAccountSchema = new Schema2(
  {
    userId: { type: Schema2.Types.ObjectId, ref: "User", required: true, index: true },
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
      default: "platform_opened"
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
      required: false
    },
    status: {
      type: String,
      enum: ["pending", "active", "suspended", "closed"],
      default: "pending",
      required: true
    }
  },
  { timestamps: true }
);
var MtAccount = model2("MtAccount", mtAccountSchema);

// ../../packages/db/src/models/PasswordResetToken.ts
import { Schema as Schema3, model as model3 } from "mongoose";
var passwordResetTokenSchema = new Schema3(
  {
    userId: { type: Schema3.Types.ObjectId, ref: "User", required: true, index: true },
    /** Only the hash is ever stored — see `@nouveau/security`'s `tokens.ts`.
     *  The raw token exists only in the reset email link and the request
     *  that redeems it. */
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, required: false }
  },
  { timestamps: true }
);
passwordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
var PasswordResetToken = model3("PasswordResetToken", passwordResetTokenSchema);

// ../../packages/db/src/models/LpoaSignature.ts
import { Schema as Schema4, model as model4 } from "mongoose";
var lpoaSignatureSchema = new Schema4(
  {
    userId: { type: Schema4.Types.ObjectId, ref: "User", required: true, index: true },
    documentVersion: { type: String, required: true },
    documentHash: { type: String, required: true },
    signedName: { type: String, required: true, trim: true },
    signedAt: { type: Date, required: true },
    ipAddress: { type: String, required: true },
    userAgent: { type: String, required: true }
  },
  { timestamps: true }
);
var LpoaSignature = model4("LpoaSignature", lpoaSignatureSchema);

// ../../packages/db/src/models/Subscription.ts
import { Schema as Schema5, model as model5 } from "mongoose";
var subscriptionSchema = new Schema5(
  {
    userId: { type: Schema5.Types.ObjectId, ref: "User", required: true, index: true },
    plan: { type: String, enum: ["trader_monthly"], required: true },
    status: {
      type: String,
      enum: ["incomplete", "active", "past_due", "canceled"],
      default: "incomplete",
      required: true
    },
    priceCents: { type: Number, required: true },
    currency: { type: String, default: "usd", required: true },
    stripeCustomerId: { type: String, required: false, default: null },
    stripeSubscriptionId: { type: String, required: false, default: null },
    currentPeriodEnd: { type: Date, required: false, default: null }
  },
  { timestamps: true }
);
var Subscription = model5("Subscription", subscriptionSchema);

// ../../packages/db/src/models/SignalLog.ts
import { Schema as Schema6, model as model6 } from "mongoose";
var signalLogSchema = new Schema6(
  {
    userId: { type: Schema6.Types.ObjectId, ref: "User", required: true, index: true },
    symbol: { type: String, required: true },
    bias: { type: String, enum: ["buy", "sell", "hold"], required: true },
    confidence: { type: Number, required: true, min: 0, max: 1 },
    narration: { type: String, required: true },
    disclaimerVersion: { type: String, required: true }
  },
  { timestamps: true }
);
var SignalLog = model6("SignalLog", signalLogSchema);

// ../../packages/db/src/models/LedgerTransaction.ts
import { Schema as Schema7, model as model7 } from "mongoose";
var ledgerEntrySchema = new Schema7(
  {
    account: { type: String, required: true },
    amountCents: { type: String, required: true }
  },
  { _id: false }
);
var ledgerTransactionSchema = new Schema7(
  {
    userId: { type: Schema7.Types.ObjectId, ref: "User", required: true, index: true },
    kind: { type: String, required: true },
    reference: { type: String, required: true, unique: true },
    entries: { type: [ledgerEntrySchema], required: true },
    /** A human-readable amount/description for the transaction list, set
     *  explicitly by whichever service builds the transaction rather than
     *  reverse-engineered from `entries` — simpler and less fragile than
     *  inferring "the interesting number" generically from a double-entry
     *  transaction's legs. */
    displayAmountCents: { type: String, required: true },
    description: { type: String, required: true }
  },
  { timestamps: true }
);
var LedgerTransaction = model7("LedgerTransaction", ledgerTransactionSchema);

// src/config/env.ts
import { z } from "zod";
import "dotenv/config";
var envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4e3),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
  CORS_ORIGIN: z.string().min(1).default("http://localhost:5173"),
  KMS_LOCAL_MASTER_KEY: z.string().min(1, "KMS_LOCAL_MASTER_KEY is required (base64, 32 bytes decoded) \u2014 generate with `openssl rand -base64 32`"),
  TRADING_MODE: z.enum(["paper", "live"]).default("paper"),
  /** Client chose Resend (2026-09-15) as the real email provider, but
   *  defaults to `console` so a dev machine or CI run can never send real
   *  email just because RESEND_API_KEY happens to be set in the shell. */
  EMAIL_PROVIDER: z.enum(["console", "resend"]).default("console"),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  /** Defaults to "lax", which is correct when apps/marketing and apps/api share
   *  a registrable domain (e.g. app.example.com + api.example.com — the
   *  common case, and how local dev works since both are on localhost).
   *  Set to "none" only if they're deployed on genuinely different
   *  domains (e.g. a Vercel *.vercel.app frontend calling a Render
   *  *.onrender.com API) — browsers never send a Lax cookie on a
   *  cross-site fetch, which would otherwise make login silently fail in
   *  production while working fine in dev. "none" forces `secure: true`
   *  regardless of NODE_ENV, since browsers require that combination. */
  COOKIE_SAME_SITE: z.enum(["lax", "none"]).default("lax"),
  /** Trader-track integrations. Market data and broker verification both
   *  default to safe local simulators. Twelve Data only provides candles;
   *  it cannot verify an MT4/5 login, so broker linking remains simulated. */
  MARKET_DATA_PROVIDER: z.enum(["simulator", "twelvedata"]).default("simulator"),
  BROKER_LINK_PROVIDER: z.enum(["simulator"]).default("simulator"),
  PAYMENT_PROVIDER: z.enum(["simulator", "real"]).default("simulator"),
  LLM_NARRATION_PROVIDER: z.enum(["template", "anthropic"]).default("template"),
  TWELVE_DATA_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional()
}).refine((env2) => env2.EMAIL_PROVIDER !== "resend" || Boolean(env2.RESEND_API_KEY && env2.EMAIL_FROM), {
  message: "RESEND_API_KEY and EMAIL_FROM are required when EMAIL_PROVIDER=resend",
  path: ["EMAIL_PROVIDER"]
}).refine((env2) => env2.MARKET_DATA_PROVIDER !== "twelvedata" || Boolean(env2.TWELVE_DATA_API_KEY?.trim()), {
  message: "TWELVE_DATA_API_KEY is required when MARKET_DATA_PROVIDER=twelvedata",
  path: ["MARKET_DATA_PROVIDER"]
}).refine((env2) => env2.LLM_NARRATION_PROVIDER !== "anthropic" || Boolean(env2.ANTHROPIC_API_KEY), {
  message: "ANTHROPIC_API_KEY is required when LLM_NARRATION_PROVIDER=anthropic",
  path: ["LLM_NARRATION_PROVIDER"]
}).refine(
  (env2) => env2.TRADING_MODE !== "live" || env2.MARKET_DATA_PROVIDER !== "simulator" && env2.BROKER_LINK_PROVIDER !== "simulator" && env2.PAYMENT_PROVIDER !== "simulator",
  {
    message: "TRADING_MODE=live cannot run on simulated market data, broker linking, or payments \u2014 set MARKET_DATA_PROVIDER/BROKER_LINK_PROVIDER/PAYMENT_PROVIDER to a real provider first.",
    path: ["TRADING_MODE"]
  }
);
var cached;
function getEnv() {
  if (!cached) {
    cached = envSchema.parse(process.env);
  }
  return cached;
}

// src/app.ts
import express from "express";
import session from "express-session";
import MongoStore from "connect-mongo";
import cors from "cors";

// src/middleware/errorHandler.ts
import { ZodError } from "zod";
var HttpError = class extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
    this.name = "HttpError";
  }
};
function asyncHandler(handler2) {
  return (req, res, next) => {
    handler2(req, res, next).catch(next);
  };
}
function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({ error: "Invalid request.", details: err.flatten() });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error." });
}

// src/middleware/rateLimit.ts
import rateLimit from "express-rate-limit";
function skipInTest() {
  return getEnv().NODE_ENV === "test";
}
var authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1e3,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Try again later." },
  skip: skipInTest
});
var defaultRateLimit = rateLimit({
  windowMs: 15 * 60 * 1e3,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest
});
var signalsRateLimit = rateLimit({
  windowMs: 15 * 60 * 1e3,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many signal requests. Try again shortly." },
  skip: skipInTest
});

// src/routes/auth.ts
import { Router } from "express";
import { z as z2 } from "zod";

// ../../packages/security/src/password.ts
import * as argon2 from "argon2";
var HASH_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19456,
  // ~19 MiB, OWASP's current minimum recommendation for argon2id
  timeCost: 2,
  parallelism: 1
};
async function hashPassword(plaintext) {
  if (plaintext.length === 0) {
    throw new RangeError("hashPassword: refusing to hash an empty password");
  }
  return argon2.hash(plaintext, HASH_OPTIONS);
}
async function verifyPassword(hash2, plaintext) {
  return argon2.verify(hash2, plaintext);
}

// ../../packages/security/src/envelope.ts
import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";
var DATA_KEY_LENGTH = 32;
var IV_LENGTH = 12;
var ALGORITHM = "aes-256-gcm";
var LocalKmsProvider = class {
  keyId;
  masterKey;
  constructor(masterKeyBase64, keyId = "local-dev-master-key") {
    const key = Buffer.from(masterKeyBase64, "base64");
    if (key.length !== DATA_KEY_LENGTH) {
      throw new RangeError(
        `LocalKmsProvider: master key must be exactly ${DATA_KEY_LENGTH} bytes when base64-decoded (got ${key.length}). Generate one with \`openssl rand -base64 32\`.`
      );
    }
    this.masterKey = key;
    this.keyId = keyId;
  }
  async wrapDataKey(plaintextKey) {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.masterKey, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintextKey), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, authTag, ciphertext]);
  }
  async unwrapDataKey(wrappedKey) {
    const iv = wrappedKey.subarray(0, IV_LENGTH);
    const authTag = wrappedKey.subarray(IV_LENGTH, IV_LENGTH + 16);
    const ciphertext = wrappedKey.subarray(IV_LENGTH + 16);
    const decipher = createDecipheriv(ALGORITHM, this.masterKey, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  }
};
async function encryptSecret(plaintext, kms) {
  if (plaintext.length === 0) {
    throw new RangeError("encryptSecret: refusing to encrypt an empty secret");
  }
  const dataKey = randomBytes(DATA_KEY_LENGTH);
  try {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, dataKey, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();
    const wrappedDataKey = await kms.wrapDataKey(dataKey);
    return {
      kmsKeyId: kms.keyId,
      wrappedDataKey: wrappedDataKey.toString("base64"),
      iv: iv.toString("base64"),
      authTag: authTag.toString("base64"),
      ciphertext: ciphertext.toString("base64")
    };
  } finally {
    dataKey.fill(0);
  }
}

// ../../packages/security/src/tokens.ts
import { randomBytes as randomBytes2, createHash, timingSafeEqual } from "node:crypto";
function generateToken() {
  return randomBytes2(32).toString("base64url");
}
function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}
function verifyTokenHash(token, storedHash) {
  const candidate = Buffer.from(hashToken(token), "hex");
  const stored = Buffer.from(storedHash, "hex");
  if (candidate.length !== stored.length) return false;
  return timingSafeEqual(candidate, stored);
}

// src/services/authService.ts
var RESET_TOKEN_TTL_MS = 60 * 60 * 1e3;
async function signUp(email, password, accountType) {
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw new HttpError(409, "Could not create an account with that email.");
  }
  const passwordHash = await hashPassword(password);
  const user = await User.create({
    email,
    passwordHash,
    accountType,
    onboarding: { completedSteps: ["account"] }
  });
  return user;
}
async function logIn(email, password) {
  const user = await User.findOne({ email: email.toLowerCase() }).select("+passwordHash");
  if (!user) {
    throw new HttpError(401, "Incorrect email or password.");
  }
  const valid = await verifyPassword(user.passwordHash, password);
  if (!valid) {
    throw new HttpError(401, "Incorrect email or password.");
  }
  return user;
}
async function requestPasswordReset(email) {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    return null;
  }
  const token = generateToken();
  await PasswordResetToken.create({
    userId: user._id,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS)
  });
  return { token, user };
}
async function confirmPasswordReset(token, newPassword) {
  const tokenHash = hashToken(token);
  const record = await PasswordResetToken.findOne({ tokenHash });
  if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
    throw new HttpError(400, "This password reset link is invalid or has expired.");
  }
  if (!verifyTokenHash(token, record.tokenHash)) {
    throw new HttpError(400, "This password reset link is invalid or has expired.");
  }
  const passwordHash = await hashPassword(newPassword);
  await User.findByIdAndUpdate(record.userId, { passwordHash });
  record.usedAt = /* @__PURE__ */ new Date();
  await record.save();
}

// src/adapters/kms/provider.ts
var cached2;
function getKmsProvider() {
  if (!cached2) {
    cached2 = new LocalKmsProvider(getEnv().KMS_LOCAL_MASTER_KEY);
  }
  return cached2;
}

// src/services/lpoaDocument.ts
import { createHash as createHash2 } from "node:crypto";
var LPOA_DOCUMENT_VERSION = "2026-09-15-draft-v2";
var LPOA_DOCUMENT_TEXT = `LIMITED POWER OF ATTORNEY (DRAFT TEMPLATE \u2014 NOT LEGAL ADVICE)

This is a draft template only. It has not been drafted or reviewed by a
lawyer and must not be relied upon as a real, binding legal document until
qualified counsel has reviewed and approved it.

1. PARTIES

"I", "me", or "the Grantor" refers to the account holder granting this
authorization. "Nouveau's trading desk" or "the Attorney-in-Fact" refers to
Nouveau's automated trading system and the personnel who operate it, acting
solely within the scope described below.

2. SCOPE OF AUTHORITY GRANTED

By signing below, I authorize Nouveau's trading desk to, on my behalf and
without seeking my approval for each individual action:

  (a) open, hold, adjust, and close positions in the trading sub-account
      funded by the at-risk half of my deposit;
  (b) select and change the specific financial instruments traded within
      that sub-account, consistent with the automated strategy then in
      effect; and
  (c) place, modify, and cancel the orders necessary to carry out (a) and
      (b), including standard risk-management orders (e.g. stop-loss).

3. LIMITATIONS ON AUTHORITY

This authorization is strictly limited to the at-risk half of my deposit,
held in the trading sub-account described above. It does NOT authorize
Nouveau, its trading desk, or its systems to:

  (a) access, move, or trade my custody balance, which remains untouched
      and inaccessible to Nouveau's trading systems under any
      circumstance;
  (b) withdraw, transfer, or otherwise direct funds out of my account to
      any third party or to Nouveau itself, beyond the fees I have
      separately agreed to;
  (c) change my account's registered ownership, beneficiary, or contact
      details; or
  (d) bind me to any obligation outside the trading of the at-risk
      sub-account described in Section 2.

4. RISK ACKNOWLEDGMENT

I understand and accept that:

  (a) the at-risk half of my deposit can be partially or fully lost as a
      result of trading activity conducted under this authorization;
  (b) no specific return, profit, or outcome is promised or guaranteed by
      Nouveau, regardless of past performance of any strategy; and
  (c) automated trading carries risks distinct from manual trading,
      including the risk of executing a strategy faster and more
      frequently than a human trader would.

5. DURATION AND REVOCATION

This authorization takes effect upon signing and remains in effect until
whichever of the following happens first:

  (a) I revoke it in writing through my account settings or by written
      notice to Nouveau, effective once Nouveau has had a reasonable
      opportunity to act on it (open positions at the time of revocation
      may need to be closed in an orderly manner rather than instantly);
      or
  (b) I close my Nouveau account.

6. GOVERNING LAW

[Placeholder \u2014 the governing law and jurisdiction for this document are not
yet specified and must be added by counsel before this document is used
with a real user.]

By typing my full legal name below, I confirm that I have read, understood,
and agree to this Limited Power of Attorney.`;
function computeLpoaDocumentHash() {
  return createHash2("sha256").update(LPOA_DOCUMENT_TEXT).digest("hex");
}

// src/services/onboardingService.ts
function getOnboardingStatus(user) {
  const steps = stepsFor(user.accountType);
  const completedSteps = getCompletedOnboardingSteps(user);
  return {
    accountType: user.accountType,
    completedSteps,
    nextStep: nextStep(steps, completedSteps),
    progressFraction: progressFraction(steps, completedSteps),
    steps: steps.map((step) => ({
      step,
      description: ONBOARDING_STEP_DESCRIPTIONS[step],
      completed: completedSteps.includes(step)
    }))
  };
}
function assertCanCompleteStep(user, step) {
  const steps = stepsFor(user.accountType);
  const completedSteps = getCompletedOnboardingSteps(user);
  if (!canCompleteStep(steps, step, completedSteps)) {
    throw new HttpError(409, `Cannot complete the "${step}" step right now \u2014 check /onboarding/status for what's next.`);
  }
  return completedSteps;
}
async function markStepComplete(user, step) {
  const steps = stepsFor(user.accountType);
  const completedSteps = getCompletedOnboardingSteps(user);
  user.onboarding.completedSteps = completeStep(steps, step, completedSteps);
  await user.save();
}
async function submitIdentity(user, kyc, submission) {
  assertCanCompleteStep(user, "identity");
  const result = await kyc.submitVerification({ ...submission, userId: user.id });
  if (result.status === "verified") {
    user.kycStatus = "verified";
    await markStepComplete(user, "identity");
    return { verified: true };
  }
  user.kycStatus = result.status === "rejected" ? "rejected" : "pending";
  await user.save();
  return { verified: false, reason: result.reason };
}
async function createBrokerAccount(user, input) {
  assertCanCompleteStep(user, "broker_account");
  await MtAccount.create({
    userId: user._id,
    broker: input.broker,
    login: input.login,
    serverName: input.serverName,
    ownership: "platform_opened",
    status: "pending"
  });
  await markStepComplete(user, "broker_account");
}
async function linkBrokerAccount(user, input) {
  assertCanCompleteStep(user, "broker_link");
  await MtAccount.create({
    userId: user._id,
    broker: input.broker,
    login: input.login,
    serverName: input.serverName,
    ownership: "user_linked",
    status: "pending"
  });
  await markStepComplete(user, "broker_link");
}
async function captureCredentials(user, brokerLink, mt5Password) {
  assertCanCompleteStep(user, "credentials");
  const account = await MtAccount.findOne({ userId: user._id }).sort({ createdAt: -1 });
  if (!account) {
    throw new HttpError(409, "No broker account found \u2014 complete the broker account step first.");
  }
  if (account.ownership === "user_linked" !== (user.accountType === "trader")) {
    throw new HttpError(409, "Account/credential mismatch \u2014 cannot continue.");
  }
  if (account.ownership === "user_linked") {
    const result = await brokerLink.verifyReadOnlyAccess({
      broker: account.broker,
      login: account.login,
      serverName: account.serverName,
      investorPassword: mt5Password
    });
    if (!result.verified) {
      throw new HttpError(422, result.reason ?? "Couldn't verify that broker account.");
    }
    account.status = "active";
  }
  const encrypted = await encryptSecret(mt5Password, getKmsProvider());
  account.credentialRef = encrypted;
  account.credentialKind = account.ownership === "user_linked" ? "investor_password" : "trading_password";
  await account.save();
  await markStepComplete(user, "credentials");
}
async function signLpoa(user, input) {
  assertCanCompleteStep(user, "lpoa");
  if (input.signedName.trim().length < 3) {
    throw new HttpError(400, "Enter your full legal name to sign.");
  }
  await LpoaSignature.create({
    userId: user._id,
    documentVersion: LPOA_DOCUMENT_VERSION,
    documentHash: computeLpoaDocumentHash(),
    signedName: input.signedName.trim(),
    signedAt: /* @__PURE__ */ new Date(),
    ipAddress: input.ipAddress,
    userAgent: input.userAgent
  });
  await markStepComplete(user, "lpoa");
}
var TRADER_MONTHLY_PLAN = "trader_monthly";
async function selectPlan(user, payment) {
  assertCanCompleteStep(user, "plan");
  const result = await payment.createSubscription({ userId: user.id, plan: TRADER_MONTHLY_PLAN });
  await Subscription.create({
    userId: user._id,
    plan: TRADER_MONTHLY_PLAN,
    status: result.status,
    priceCents: result.priceCents,
    currency: result.currency,
    stripeCustomerId: result.stripeCustomerId,
    stripeSubscriptionId: result.stripeSubscriptionId
  });
  await markStepComplete(user, "plan");
}

// src/routes/auth.ts
var signUpSchema = z2.object({
  email: z2.string().email(),
  password: z2.string().min(10, "Password must be at least 10 characters."),
  accountType: z2.enum(["investor", "trader"])
});
var logInSchema = z2.object({
  email: z2.string().email(),
  password: z2.string().min(1)
});
var requestResetSchema = z2.object({ email: z2.string().email() });
var confirmResetSchema = z2.object({
  token: z2.string().min(1),
  newPassword: z2.string().min(10, "Password must be at least 10 characters.")
});
function createAuthRouter(emailAdapter, appBaseUrl) {
  const router = Router();
  router.post(
    "/signup",
    authRateLimit,
    asyncHandler(async (req, res) => {
      const { email, password, accountType } = signUpSchema.parse(req.body);
      const user = await signUp(email, password, accountType);
      req.session.userId = user.id;
      res.status(201).json({ userId: user.id, email: user.email, onboarding: getOnboardingStatus(user) });
    })
  );
  router.post(
    "/login",
    authRateLimit,
    asyncHandler(async (req, res) => {
      const { email, password } = logInSchema.parse(req.body);
      const user = await logIn(email, password);
      req.session.userId = user.id;
      res.status(200).json({ userId: user.id, email: user.email, onboarding: getOnboardingStatus(user) });
    })
  );
  router.post("/logout", (req, res) => {
    req.session.destroy(() => {
      res.status(204).end();
    });
  });
  router.get("/session", (req, res) => {
    if (!req.session.userId) {
      res.status(200).json({ authenticated: false });
      return;
    }
    res.status(200).json({ authenticated: true, userId: req.session.userId });
  });
  router.post(
    "/password-reset/request",
    authRateLimit,
    asyncHandler(async (req, res) => {
      const { email } = requestResetSchema.parse(req.body);
      const result = await requestPasswordReset(email);
      if (result) {
        const resetLink = `${appBaseUrl}/reset-password/confirm?token=${result.token}`;
        await emailAdapter.send({
          to: result.user.email,
          subject: "Reset your Nouveau password",
          text: `Reset your password: ${resetLink}

This link expires in one hour. If you didn't request this, ignore this email.`
        });
      }
      res.status(200).json({ message: "If that email is registered, a reset link has been sent." });
    })
  );
  router.post(
    "/password-reset/confirm",
    authRateLimit,
    asyncHandler(async (req, res) => {
      const { token, newPassword } = confirmResetSchema.parse(req.body);
      await confirmPasswordReset(token, newPassword);
      res.status(200).json({ message: "Password updated. You can now log in." });
    })
  );
  return router;
}

// src/routes/onboarding.ts
import { Router as Router2 } from "express";
import { z as z3 } from "zod";

// src/middleware/requireAuth.ts
async function requireAuth(req, res, next) {
  const userId = req.session.userId;
  if (!userId) {
    res.status(401).json({ error: "Not authenticated." });
    return;
  }
  const user = await User.findById(userId);
  if (!user) {
    req.session.destroy(() => void 0);
    res.status(401).json({ error: "Not authenticated." });
    return;
  }
  req.userId = userId;
  req.user = user;
  next();
}

// src/routes/onboarding.ts
var identitySchema = z3.object({
  fullName: z3.string().min(3),
  dateOfBirth: z3.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD."),
  idType: z3.enum(["passport", "national_id", "drivers_license"]),
  idNumber: z3.string().min(3)
});
var brokerAccountSchema = z3.object({
  broker: z3.string().min(1),
  login: z3.string().min(1),
  serverName: z3.string().min(1)
});
var brokerLinkSchema = z3.object({
  broker: z3.string().min(1),
  login: z3.string().min(1),
  serverName: z3.string().min(1)
});
var credentialsSchema = z3.object({
  mt5Password: z3.string().min(1)
});
var lpoaSchema = z3.object({
  signedName: z3.string().min(3)
});
var planSchema = z3.object({
  plan: z3.literal("trader_monthly")
});
function createOnboardingRouter(kycAdapter, brokerLinkAdapter, paymentAdapter) {
  const router = Router2();
  router.use(requireAuth);
  router.get("/status", (req, res) => {
    res.status(200).json(getOnboardingStatus(req.user));
  });
  router.get("/lpoa-document", (_req, res) => {
    res.status(200).json({ version: LPOA_DOCUMENT_VERSION, text: LPOA_DOCUMENT_TEXT });
  });
  router.post(
    "/identity",
    asyncHandler(async (req, res) => {
      const input = identitySchema.parse(req.body);
      const result = await submitIdentity(req.user, kycAdapter, input);
      res.status(result.verified ? 200 : 422).json(result);
    })
  );
  router.post(
    "/broker-account",
    asyncHandler(async (req, res) => {
      const input = brokerAccountSchema.parse(req.body);
      await createBrokerAccount(req.user, input);
      res.status(200).json(getOnboardingStatus(req.user));
    })
  );
  router.post(
    "/broker-link",
    asyncHandler(async (req, res) => {
      const input = brokerLinkSchema.parse(req.body);
      await linkBrokerAccount(req.user, input);
      res.status(200).json(getOnboardingStatus(req.user));
    })
  );
  router.post(
    "/credentials",
    asyncHandler(async (req, res) => {
      const { mt5Password } = credentialsSchema.parse(req.body);
      await captureCredentials(req.user, brokerLinkAdapter, mt5Password);
      res.status(200).json(getOnboardingStatus(req.user));
    })
  );
  router.post(
    "/lpoa",
    asyncHandler(async (req, res) => {
      const { signedName } = lpoaSchema.parse(req.body);
      await signLpoa(req.user, {
        signedName,
        ipAddress: req.ip ?? "unknown",
        userAgent: req.get("user-agent") ?? "unknown"
      });
      res.status(200).json(getOnboardingStatus(req.user));
    })
  );
  router.post(
    "/plan",
    asyncHandler(async (req, res) => {
      planSchema.parse(req.body);
      await selectPlan(req.user, paymentAdapter);
      res.status(200).json(getOnboardingStatus(req.user));
    })
  );
  return router;
}

// src/routes/profile.ts
import { Router as Router3 } from "express";

// src/services/profileService.ts
async function getProfileSummary(user) {
  const account = await MtAccount.findOne({ userId: user._id }).sort({ createdAt: -1 });
  const subscription = user.accountType === "trader" ? await Subscription.findOne({ userId: user._id }).sort({ createdAt: -1 }) : null;
  return {
    email: user.email,
    accountType: user.accountType,
    kycStatus: user.kycStatus,
    memberSince: user.get("createdAt").toISOString(),
    brokerAccount: account ? { broker: account.broker, login: account.login, serverName: account.serverName, ownership: account.ownership, status: account.status } : null,
    subscription: subscription ? { plan: subscription.plan, status: subscription.status, priceCents: subscription.priceCents, currency: subscription.currency } : null
  };
}

// src/routes/profile.ts
function createAccountRouter() {
  const router = Router3();
  router.use(requireAuth);
  router.get(
    "/profile",
    asyncHandler(async (req, res) => {
      res.status(200).json(await getProfileSummary(req.user));
    })
  );
  return router;
}

// src/routes/ledger.ts
import { Router as Router4 } from "express";
import { z as z4 } from "zod";

// src/services/ledgerService.ts
import { randomUUID } from "node:crypto";
async function persist(userId, txn, displayAmountCents, description) {
  await LedgerTransaction.create({
    userId,
    kind: txn.kind,
    reference: txn.reference,
    entries: txn.entries.map((e) => ({ account: e.account, amountCents: e.amountCents.toString() })),
    displayAmountCents: displayAmountCents.toString(),
    description
  });
}
async function getOverview(userId) {
  const custodyAccount = accounts.custody(userId);
  const atRiskAccount = accounts.atRisk(userId);
  const docs = await LedgerTransaction.find({ userId }).sort({ createdAt: 1 });
  let custodyCents = ZERO_CENTS;
  let atRiskCents = ZERO_CENTS;
  let totalDeposited = ZERO_CENTS;
  const equitySeries = [];
  for (const doc of docs) {
    for (const entry of doc.entries) {
      const amount = cents(entry.amountCents);
      if (entry.account === custodyAccount) custodyCents = add(custodyCents, amount);
      else if (entry.account === atRiskAccount) atRiskCents = add(atRiskCents, amount);
    }
    if (doc.kind === "deposit") {
      totalDeposited = add(totalDeposited, cents(doc.displayAmountCents));
    }
    equitySeries.push({
      timestamp: doc.get("createdAt").toISOString(),
      totalEquityCents: add(custodyCents, atRiskCents)
    });
  }
  return {
    custodyCents,
    atRiskCents,
    totalEquityCents: add(custodyCents, atRiskCents),
    totalDepositedCents: totalDeposited,
    targetCents: totalDeposited > ZERO_CENTS ? computeTarget(totalDeposited) : null,
    equitySeries
  };
}
async function deposit(user, payment, amountCents) {
  if (user.accountType !== "investor") {
    throw new HttpError(403, "Deposits are only available on the investor track.");
  }
  const chargeResult = await payment.chargeDeposit({ userId: user.id, amountCents: amountCents.toString() });
  if (!chargeResult.succeeded) {
    throw new HttpError(402, chargeResult.reason ?? "Payment failed.");
  }
  const txn = splitDeposit(user.id, chargeResult.providerReference, amountCents);
  await persist(user.id, txn, amountCents, `Deposit of $${toDecimalString(amountCents)}`);
  return getOverview(user.id);
}
async function withdraw(user, payment, amountCents) {
  if (user.accountType !== "investor") {
    throw new HttpError(403, "Withdrawals are only available on the investor track.");
  }
  const overview = await getOverview(user.id);
  if (amountCents > overview.custodyCents) {
    throw new HttpError(422, "Withdrawal amount exceeds your available custody balance.");
  }
  const reference = `wd_${randomUUID()}`;
  const requestTxn = requestWithdrawal(user.id, reference, amountCents);
  await persist(user.id, requestTxn, amountCents, `Withdrawal requested: $${toDecimalString(amountCents)}`);
  const payoutResult = await payment.payOut({ userId: user.id, amountCents: amountCents.toString() });
  if (!payoutResult.succeeded) {
    throw new HttpError(502, payoutResult.reason ?? "Payout failed \u2014 your funds are held pending retry.");
  }
  const completeTxn = completeWithdrawal(user.id, `${reference}-complete`, amountCents);
  await persist(user.id, completeTxn, amountCents, `Withdrawal completed: $${toDecimalString(amountCents)}`);
  return getOverview(user.id);
}
async function listTransactions(userId) {
  const docs = await LedgerTransaction.find({ userId }).sort({ createdAt: -1 });
  return docs.map((doc) => ({
    kind: doc.kind,
    reference: doc.reference,
    description: doc.description,
    amountCents: doc.displayAmountCents,
    createdAt: doc.get("createdAt").toISOString()
  }));
}

// src/routes/ledger.ts
var amountSchema = z4.object({
  // Whole cents, as a JSON number — the frontend converts a dollar amount
  // to cents before sending, same convention as @nouveau/core's Cents.
  amountCents: z4.number().int().positive()
});
function serializeOverview(o) {
  return {
    custodyCents: o.custodyCents.toString(),
    atRiskCents: o.atRiskCents.toString(),
    totalEquityCents: o.totalEquityCents.toString(),
    totalDepositedCents: o.totalDepositedCents.toString(),
    targetCents: o.targetCents?.toString() ?? null,
    equitySeries: o.equitySeries.map((p) => ({ timestamp: p.timestamp, totalEquityCents: p.totalEquityCents.toString() }))
  };
}
function createLedgerRouter(paymentAdapter) {
  const router = Router4();
  router.use(requireAuth);
  router.get(
    "/overview",
    asyncHandler(async (req, res) => {
      const overview = await getOverview(req.user.id);
      res.status(200).json(serializeOverview(overview));
    })
  );
  router.post(
    "/deposit",
    asyncHandler(async (req, res) => {
      const { amountCents } = amountSchema.parse(req.body);
      const overview = await deposit(req.user, paymentAdapter, cents(amountCents));
      res.status(200).json(serializeOverview(overview));
    })
  );
  router.post(
    "/withdraw",
    asyncHandler(async (req, res) => {
      const { amountCents } = amountSchema.parse(req.body);
      const overview = await withdraw(req.user, paymentAdapter, cents(amountCents));
      res.status(200).json(serializeOverview(overview));
    })
  );
  router.get(
    "/transactions",
    asyncHandler(async (req, res) => {
      const transactions = await listTransactions(req.user.id);
      res.status(200).json(transactions);
    })
  );
  return router;
}

// src/routes/signals.ts
import { Router as Router5 } from "express";

// src/services/signalDisclaimer.ts
var SIGNAL_DISCLAIMER_VERSION = "2026-09-28-draft-v1";
var SIGNAL_DISCLAIMER_TEXT = "This is automated commentary on market data, generated from technical indicators \u2014 it is not personalized financial advice, and Nouveau does not place trades on your behalf. Markets can move against any signal shown here. You decide whether, when, and how to act on it, on your own broker account.";

// src/services/signalService.ts
var CANDLES_REQUESTED = MIN_CANDLES_FOR_SIGNAL + 10;
async function getSignal(user, symbol, marketDataAdapter, narrationAdapter) {
  const candles = await marketDataAdapter.getRecentCandles(symbol, CANDLES_REQUESTED);
  if (candles.length < MIN_CANDLES_FOR_SIGNAL) {
    throw new HttpError(503, `Not enough market data for ${symbol} yet \u2014 try again shortly.`);
  }
  const signal = computeSignal(candles);
  const narration = await narrationAdapter.narrate(signal, symbol);
  await SignalLog.create({
    userId: user._id,
    symbol,
    bias: signal.bias,
    confidence: signal.confidence,
    narration,
    disclaimerVersion: SIGNAL_DISCLAIMER_VERSION
  });
  return {
    symbol,
    bias: signal.bias,
    confidence: signal.confidence,
    narration,
    disclaimer: SIGNAL_DISCLAIMER_TEXT,
    priceSeries: candles.map((c, day) => ({ day, price: c.close })),
    dataSource: marketDataAdapter.provider
  };
}

// src/routes/signals.ts
var CURRENCY_CODE_PATTERN = /^[A-Z]{3}$/;
function createSignalsRouter(marketDataAdapter, narrationAdapter) {
  const router = Router5();
  router.use(requireAuth);
  router.get(
    "/:base/:quote",
    signalsRateLimit,
    asyncHandler(async (req, res) => {
      const user = req.user;
      if (user.accountType !== "trader") {
        throw new HttpError(403, "Live trading signals are only available on the trader track.");
      }
      const subscription = await Subscription.findOne({ userId: user._id }).sort({ createdAt: -1 });
      if (!subscription || subscription.status !== "active") {
        throw new HttpError(402, "An active subscription is required to see live signals.");
      }
      const base = req.params.base.toUpperCase();
      const quote = req.params.quote.toUpperCase();
      if (!CURRENCY_CODE_PATTERN.test(base) || !CURRENCY_CODE_PATTERN.test(quote)) {
        throw new HttpError(400, "Symbol must look like EUR/USD.");
      }
      const result = await getSignal(user, `${base}/${quote}`, marketDataAdapter, narrationAdapter);
      res.status(200).json(result);
    })
  );
  return router;
}

// src/app.ts
function createApp(deps) {
  const env2 = getEnv();
  const app2 = express();
  app2.set("trust proxy", 1);
  app2.use(cors({ origin: env2.CORS_ORIGIN, credentials: true }));
  app2.use(express.json({ limit: "1mb" }));
  app2.use(
    session({
      name: "nouveau.sid",
      secret: env2.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      store: deps.sessionStore ?? MongoStore.create({ mongoUrl: env2.MONGODB_URI }),
      cookie: {
        httpOnly: true,
        // "none" requires Secure regardless of NODE_ENV — browsers drop a
        // SameSite=None cookie without it.
        secure: env2.NODE_ENV === "production" || env2.COOKIE_SAME_SITE === "none",
        sameSite: env2.COOKIE_SAME_SITE,
        maxAge: 7 * 24 * 60 * 60 * 1e3
        // 7 days
      }
    })
  );
  app2.use(defaultRateLimit);
  app2.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok", tradingMode: env2.TRADING_MODE });
  });
  app2.use("/auth", createAuthRouter(deps.emailAdapter, deps.appBaseUrl));
  app2.use("/onboarding", createOnboardingRouter(deps.kycAdapter, deps.brokerLinkAdapter, deps.paymentAdapter));
  app2.use("/account", createAccountRouter());
  app2.use("/account", createLedgerRouter(deps.paymentAdapter));
  app2.use("/signals", createSignalsRouter(deps.marketDataAdapter, deps.narrationAdapter));
  app2.use(errorHandler);
  return app2;
}

// src/adapters/email/ConsoleEmailAdapter.ts
var ConsoleEmailAdapter = class {
  async send(message) {
    console.log(`[email:dev] to=${message.to} subject="${message.subject}"
${message.text}`);
  }
};

// src/adapters/email/ResendEmailAdapter.ts
var RESEND_API_URL = "https://api.resend.com/emails";
var ResendEmailAdapter = class {
  constructor(apiKey, from) {
    this.apiKey = apiKey;
    this.from = from;
  }
  async send(message) {
    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: this.from,
        to: message.to,
        subject: message.subject,
        text: message.text
      })
    });
    if (!response.ok) {
      throw new Error(`Resend email send failed with status ${response.status}`);
    }
  }
};

// src/adapters/email/provider.ts
var cached3;
function getEmailAdapter() {
  if (!cached3) {
    const env2 = getEnv();
    cached3 = env2.EMAIL_PROVIDER === "resend" ? new ResendEmailAdapter(env2.RESEND_API_KEY, env2.EMAIL_FROM) : new ConsoleEmailAdapter();
  }
  return cached3;
}

// src/adapters/kyc/SimulatorKycAdapter.ts
import { randomUUID as randomUUID2 } from "node:crypto";
var SimulatorKycAdapter = class {
  provider = "simulator";
  async submitVerification(input) {
    const providerReference = `sim_${randomUUID2()}`;
    const looksLikePlaceholder = /^(test|foo|bar|asdf|xxx)$/i.test(input.fullName.trim()) || input.fullName.trim().length < 3 || input.idNumber.trim().length < 3;
    if (looksLikePlaceholder) {
      return { status: "rejected", providerReference, reason: "Submission looks like placeholder test data." };
    }
    return { status: "verified", providerReference };
  }
};

// src/adapters/brokerLink/SimulatorBrokerLinkAdapter.ts
var SimulatorBrokerLinkAdapter = class {
  provider = "simulator";
  async verifyReadOnlyAccess(input) {
    const looksLikePlaceholder = /^(test|foo|bar|asdf|xxx)$/i.test(input.login.trim()) || input.investorPassword.trim().length < 4;
    if (looksLikePlaceholder) {
      return { verified: false, reason: "Couldn't verify that account \u2014 check the login and investor password." };
    }
    return { verified: true };
  }
};

// src/adapters/brokerLink/provider.ts
var cached4;
function getBrokerLinkAdapter() {
  if (!cached4) {
    getEnv();
    cached4 = new SimulatorBrokerLinkAdapter();
  }
  return cached4;
}

// src/adapters/payment/SimulatorPaymentAdapter.ts
import { randomUUID as randomUUID3 } from "node:crypto";
var TRADER_MONTHLY_PRICE_CENTS = 4900;
var SimulatorPaymentAdapter = class {
  provider = "simulator";
  async createSubscription(_input) {
    return {
      status: "active",
      priceCents: TRADER_MONTHLY_PRICE_CENTS,
      currency: "usd",
      stripeCustomerId: null,
      stripeSubscriptionId: null
    };
  }
  async chargeDeposit(_input) {
    return { succeeded: true, providerReference: `sim_dep_${randomUUID3()}` };
  }
  async payOut(_input) {
    return { succeeded: true, providerReference: `sim_payout_${randomUUID3()}` };
  }
};

// src/adapters/payment/provider.ts
var cached5;
function getPaymentAdapter() {
  if (!cached5) {
    const env2 = getEnv();
    if (env2.PAYMENT_PROVIDER === "real") {
      throw new Error(
        "PAYMENT_PROVIDER=real has no adapter implementation yet \u2014 confirm the real processor (Paystack? Stripe?) before wiring this, per the note in config/env.ts."
      );
    }
    cached5 = new SimulatorPaymentAdapter();
  }
  return cached5;
}

// src/adapters/marketData/SimulatorMarketDataAdapter.ts
function seedFor(symbol) {
  let hash2 = 0;
  for (let i = 0; i < symbol.length; i++) {
    hash2 = (hash2 * 31 + symbol.charCodeAt(i)) % 1e5;
  }
  return hash2 % 20 + 1;
}
function basePriceFor(symbol) {
  return symbol.toUpperCase().includes("JPY") ? 150 : 1.1;
}
var SimulatorMarketDataAdapter = class {
  provider = "simulator";
  async getRecentCandles(symbol, count) {
    const seed = seedFor(symbol);
    const basePrice = basePriceFor(symbol);
    const volatility = basePrice * 6e-3;
    const now = Date.now();
    const candles = [];
    for (let i = 0; i < count; i++) {
      const t = i / count;
      const drift = Math.sin(seed) * 0.4 * t;
      const wave1 = Math.sin(t * Math.PI * (2 + seed)) * 0.5;
      const wave2 = Math.sin(t * Math.PI * (7 + seed * 1.7)) * 0.18;
      const close = basePrice + volatility * (drift + wave1 + wave2);
      const open = i === 0 ? close : candles[i - 1].close;
      const high = Math.max(open, close) + volatility * 0.1;
      const low = Math.min(open, close) - volatility * 0.1;
      candles.push({
        timestamp: now - (count - i) * 6e4,
        open,
        high,
        low,
        close
      });
    }
    return candles;
  }
};

// src/adapters/marketData/TwelveDataMarketDataAdapter.ts
function parseTimestamp(datetime) {
  const normalized = datetime.includes("T") ? datetime : datetime.replace(" ", "T");
  const utcDatetime = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(normalized) ? normalized : `${normalized}Z`;
  const timestamp = new Date(utcDatetime).getTime();
  if (!Number.isFinite(timestamp)) {
    throw new Error("Twelve Data returned a candle with an invalid datetime.");
  }
  return timestamp;
}
function parsePrice(value, field) {
  const price = Number(value);
  if (!Number.isFinite(price)) {
    throw new Error(`Twelve Data returned an invalid ${field} price.`);
  }
  return price;
}
var TwelveDataMarketDataAdapter = class {
  constructor(apiKey, fetchImpl = fetch) {
    this.apiKey = apiKey;
    this.fetchImpl = fetchImpl;
  }
  provider = "twelvedata";
  async getRecentCandles(symbol, count) {
    if (!Number.isInteger(count) || count < 1 || count > 5e3) {
      throw new RangeError("Twelve Data candle count must be an integer from 1 to 5000.");
    }
    const url = new URL("https://api.twelvedata.com/time_series");
    url.search = new URLSearchParams({
      symbol,
      interval: "1min",
      outputsize: String(count),
      order: "ASC",
      apikey: this.apiKey
    }).toString();
    const response = await this.fetchImpl(url);
    if (!response.ok) {
      throw new Error(`Twelve Data request failed with HTTP ${response.status}.`);
    }
    const payload = await response.json();
    if (payload.status === "error" || !Array.isArray(payload.values)) {
      throw new Error(payload.message || "Twelve Data did not return candle data.");
    }
    return payload.values.map((candle) => ({
      timestamp: parseTimestamp(candle.datetime),
      open: parsePrice(candle.open, "open"),
      high: parsePrice(candle.high, "high"),
      low: parsePrice(candle.low, "low"),
      close: parsePrice(candle.close, "close")
    })).sort((a, b) => a.timestamp - b.timestamp);
  }
};

// src/adapters/marketData/provider.ts
var cached6;
function getMarketDataAdapter() {
  if (!cached6) {
    const env2 = getEnv();
    cached6 = env2.MARKET_DATA_PROVIDER === "twelvedata" ? new TwelveDataMarketDataAdapter(env2.TWELVE_DATA_API_KEY) : new SimulatorMarketDataAdapter();
  }
  return cached6;
}

// src/adapters/narration/TemplatedNarrationAdapter.ts
var BIAS_PHRASE = {
  buy: "leaning bullish",
  sell: "leaning bearish",
  hold: "showing no clear direction"
};
var TemplatedNarrationAdapter = class {
  provider = "template";
  async narrate(signal, symbol) {
    const { bias, confidence, components } = signal;
    const confidencePct = Math.round(confidence * 100);
    const trendWord = components.shortMovingAverage > components.longMovingAverage ? "above" : "below";
    return `${symbol} is ${BIAS_PHRASE[bias]} (${confidencePct}% of the indicators we track agree). The short-term average is currently ${trendWord} the longer-term average, and RSI is at ${components.rsi.toFixed(1)}. This is automated commentary on market data, not personalized financial advice \u2014 you decide whether and when to act on it.`;
  }
};

// src/adapters/narration/provider.ts
var cached7;
function getNarrationAdapter() {
  if (!cached7) {
    const env2 = getEnv();
    if (env2.LLM_NARRATION_PROVIDER === "anthropic") {
      throw new Error(
        "LLM_NARRATION_PROVIDER=anthropic has no adapter implementation yet \u2014 this is a Phase 2 addition, and even then it may only narrate computeSignal's output, never decide the bias itself."
      );
    }
    cached7 = new TemplatedNarrationAdapter();
  }
  return cached7;
}

// src/buildApiApp.ts
function buildApiApp() {
  const env2 = getEnv();
  return createApp({
    emailAdapter: getEmailAdapter(),
    kycAdapter: new SimulatorKycAdapter(),
    brokerLinkAdapter: getBrokerLinkAdapter(),
    paymentAdapter: getPaymentAdapter(),
    marketDataAdapter: getMarketDataAdapter(),
    narrationAdapter: getNarrationAdapter(),
    appBaseUrl: env2.CORS_ORIGIN
  });
}

// src/vercelHandler.ts
var env = getEnv();
if (env.TRADING_MODE === "live") {
  throw new Error(
    "TRADING_MODE=live is not permitted yet \u2014 no broker adapter, no strategy engine, no kill switch exist. This is expected to fail until Phase 5+."
  );
}
var app = buildApiApp();
var dbReady = null;
async function handler(req, res) {
  dbReady ??= connectToDatabase(env.MONGODB_URI);
  await dbReady;
  app(req, res);
}
export {
  handler as default
};
