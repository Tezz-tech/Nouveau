// ../../packages/db/src/connection.ts
import mongoose from "mongoose";
async function connectToDatabase(uri) {
  return mongoose.connect(uri);
}

// ../../packages/db/src/models/User.ts
import { Schema, model } from "mongoose";
var userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    passwordHash: {
      type: String,
      required: true,
      select: false
      // never returned by a plain `.find()`/`.findOne()` — must opt in with `.select("+passwordHash")`
    },
    fullName: { type: String, required: true, trim: true },
    /** Set once, on first successful payment — reused across every later
     *  plan switch or resubscribe so Paystack doesn't get asked to create a
     *  duplicate customer record for the same person. */
    paystackCustomerCode: { type: String, required: false }
  },
  { timestamps: true }
);
var User = model("User", userSchema);

// ../../packages/db/src/models/PasswordResetToken.ts
import { Schema as Schema2, model as model2 } from "mongoose";
var passwordResetTokenSchema = new Schema2(
  {
    userId: { type: Schema2.Types.ObjectId, ref: "User", required: true, index: true },
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
var PasswordResetToken = model2("PasswordResetToken", passwordResetTokenSchema);

// ../../packages/db/src/models/MasterStrategy.ts
import { Schema as Schema3, model as model3 } from "mongoose";
var masterStrategySchema = new Schema3(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    metaApiAccountId: { type: String, required: true, unique: true },
    copyFactoryStrategyId: { type: String, required: false },
    maxTradeRiskPct: { type: Number, required: false },
    /** Snapshot of the config last pushed to CopyFactory's updateStrategy —
     *  lets the seed script diff against this instead of blindly
     *  re-pushing identical config on every run. */
    copyFactoryStrategyConfig: { type: Schema3.Types.Mixed, required: false },
    status: { type: String, enum: ["active", "paused"], default: "active", required: true }
  },
  { timestamps: true }
);
var MasterStrategy = model3("MasterStrategy", masterStrategySchema);

// ../../packages/db/src/models/BotPlan.ts
import { Schema as Schema4, model as model4 } from "mongoose";
var botPlanSchema = new Schema4(
  {
    name: { type: String, required: true, trim: true },
    masterStrategyId: { type: Schema4.Types.ObjectId, ref: "MasterStrategy", required: true, index: true },
    /** Decimal-string bigint cents, never a native numeric BSON type — same
     *  convention as every other money field in this codebase (see
     *  @nouveau/core's `Cents`/`cents()`). A previous, now-deleted
     *  Subscription model stored this as a plain `Number`; don't repeat
     *  that deviation. */
    priceCents: { type: String, required: true },
    currency: { type: String, required: true, default: "NGN" },
    paystackPlanCode: { type: String, required: false },
    interval: { type: String, enum: ["monthly"], required: true, default: "monthly" },
    /** The CopyFactory risk multiplier applied when a subscriber on this
     *  plan is linked or switched — snapshotted onto
     *  `BotSubscription.multiplier` at that moment, not re-derived from
     *  here later (so changing a plan's default never silently reprices an
     *  existing subscriber). */
    defaultMultiplier: { type: Number, required: true, default: 1 },
    status: { type: String, enum: ["active", "retired"], default: "active", required: true }
  },
  { timestamps: true }
);
var BotPlan = model4("BotPlan", botPlanSchema);

// ../../packages/db/src/models/MtAccount.ts
import { Schema as Schema5, model as model5, Types } from "mongoose";
var encryptedSecretSchema = new Schema5(
  {
    kmsKeyId: { type: String, required: true },
    wrappedDataKey: { type: String, required: true },
    iv: { type: String, required: true },
    authTag: { type: String, required: true },
    ciphertext: { type: String, required: true }
  },
  { _id: false }
);
var consentSchema = new Schema5(
  {
    version: { type: String, required: true },
    acceptedAt: { type: Date, required: true },
    acceptedIp: { type: String, required: true },
    userAgent: { type: String, required: true }
  },
  { _id: false }
);
var lastErrorSchema = new Schema5(
  {
    message: { type: String, required: true },
    at: { type: Date, required: true }
  },
  { _id: false }
);
var mtAccountSchema = new Schema5(
  {
    userId: { type: Schema5.Types.ObjectId, ref: "User", required: true, index: true },
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
      default: "deploying"
    },
    lastError: { type: lastErrorSchema, required: false },
    consent: { type: consentSchema, required: true },
    status: { type: String, enum: ["pending", "linked", "error", "closed"], default: "pending", required: true }
  },
  { timestamps: true }
);
var MtAccount = model5("MtAccount", mtAccountSchema);

// ../../packages/db/src/models/BotSubscription.ts
import { Schema as Schema6, model as model6 } from "mongoose";
var botSubscriptionSchema = new Schema6(
  {
    userId: { type: Schema6.Types.ObjectId, ref: "User", required: true, index: true },
    masterStrategyId: { type: Schema6.Types.ObjectId, ref: "MasterStrategy", required: true },
    botPlanId: { type: Schema6.Types.ObjectId, ref: "BotPlan", required: true },
    /** Null until the user's MtAccount finishes linking. A paid-but-
     *  unlinked user is a real, trackable, queryable state
     *  (`status: "awaiting_link"`), not an edge case to special-case later —
     *  see apps/api's support-runbook query over this + MtAccount.status. */
    mtAccountId: { type: Schema6.Types.ObjectId, ref: "MtAccount", required: false },
    /** Snapshotted from BotPlan.defaultMultiplier at creation/switch time —
     *  set explicitly, never re-derived from the plan later, so changing a
     *  plan's default multiplier never silently reprices an existing
     *  subscriber. */
    multiplier: { type: Number, required: true },
    paystackSubscriptionCode: { type: String, required: false },
    status: {
      type: String,
      enum: ["awaiting_link", "active", "past_due", "canceled", "superseded"],
      required: true,
      default: "awaiting_link"
    },
    /** Did the CopyFactory `updateSubscriber()` call for THIS row actually
     *  succeed — distinct from `MtAccount.copyFactorySubscriberConfigured`,
     *  which only tracks the one-time account-level role setting. */
    copyFactoryAppliedAt: { type: Date, required: false },
    copyFactoryApplyError: { type: String, required: false },
    currentPeriodEnd: { type: Date, required: false }
  },
  { timestamps: true }
);
var BotSubscription = model6("BotSubscription", botSubscriptionSchema);

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
  /** Defaults to "lax", correct when apps/marketing and apps/api share a
   *  registrable domain. Set to "none" only if they're on genuinely
   *  different domains (e.g. two separate *.vercel.app projects) —
   *  browsers never send a Lax cookie on a cross-site fetch, which would
   *  otherwise make login silently fail in production. "none" forces
   *  `secure: true` regardless of NODE_ENV, since browsers require that
   *  combination. */
  COOKIE_SAME_SITE: z.enum(["lax", "none"]).default("lax"),
  EMAIL_PROVIDER: z.enum(["console", "resend"]).default("console"),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  /** Real MetaApi token — covers both account provisioning (the official
   *  `metaapi.cloud-sdk`) and CopyFactory strategy/subscriber management
   *  (the official `metaapi.cloud-copyfactory-sdk`), both imported via
   *  their `/node` subpath — see adapters/copyTrading. Both packages are
   *  used directly rather than hand-rolled REST calls: CopyFactory's real
   *  client does non-trivial dynamic domain/region resolution internally
   *  that would be a real risk to reimplement by hand, and the package is
   *  already a zero-extra-cost transitive dependency of metaapi.cloud-sdk
   *  regardless. */
  META_API_TOKEN: z.string().optional(),
  PAYSTACK_SECRET_KEY: z.string().optional(),
  PAYSTACK_PUBLIC_KEY: z.string().optional()
}).refine((env2) => env2.EMAIL_PROVIDER !== "resend" || Boolean(env2.RESEND_API_KEY && env2.EMAIL_FROM), {
  message: "RESEND_API_KEY and EMAIL_FROM are required when EMAIL_PROVIDER=resend",
  path: ["EMAIL_PROVIDER"]
});
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
var mtAccountStatusRateLimit = rateLimit({
  windowMs: 5 * 60 * 1e3,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many status checks. Try again shortly." },
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
async function signUp(email, password, fullName) {
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw new HttpError(409, "Could not create an account with that email.");
  }
  const passwordHash = await hashPassword(password);
  const user = await User.create({ email, passwordHash, fullName });
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

// src/services/flowStatusService.ts
async function getFlowStatus(user) {
  const subscription = await BotSubscription.findOne({
    userId: user._id,
    status: { $in: ["awaiting_link", "active", "past_due"] }
  }).sort({ createdAt: -1 });
  if (!subscription) {
    return { stage: "choose_bot", subscription: null, mtAccount: null };
  }
  const subSummary = {
    masterStrategyId: subscription.masterStrategyId.toString(),
    botPlanId: subscription.botPlanId.toString(),
    status: subscription.status
  };
  const mtAccount = subscription.mtAccountId ? await MtAccount.findById(subscription.mtAccountId) : null;
  if (!mtAccount) {
    return { stage: "awaiting_link", subscription: subSummary, mtAccount: null };
  }
  const mtSummary = {
    connectionStage: mtAccount.connectionStage,
    status: mtAccount.status,
    lastError: mtAccount.lastError?.message ?? null
  };
  if (mtAccount.connectionStage === "failed") {
    return { stage: "link_failed", subscription: subSummary, mtAccount: mtSummary };
  }
  if (mtAccount.connectionStage !== "connected") {
    return { stage: "linking", subscription: subSummary, mtAccount: mtSummary };
  }
  return { stage: "complete", subscription: subSummary, mtAccount: mtSummary };
}

// src/routes/auth.ts
var signUpSchema = z2.object({
  email: z2.string().email(),
  password: z2.string().min(10, "Password must be at least 10 characters."),
  fullName: z2.string().trim().min(2, "Full name is required.")
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
      const { email, password, fullName } = signUpSchema.parse(req.body);
      const user = await signUp(email, password, fullName);
      req.session.userId = user.id;
      res.status(201).json({ userId: user.id, email: user.email, flow: await getFlowStatus(user) });
    })
  );
  router.post(
    "/login",
    authRateLimit,
    asyncHandler(async (req, res) => {
      const { email, password } = logInSchema.parse(req.body);
      const user = await logIn(email, password);
      req.session.userId = user.id;
      res.status(200).json({ userId: user.id, email: user.email, flow: await getFlowStatus(user) });
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

// src/routes/bots.ts
import { Router as Router2 } from "express";
function createBotsRouter() {
  const router = Router2();
  router.get(
    "/",
    asyncHandler(async (_req, res) => {
      const plans = await BotPlan.find({ status: "active" }).sort({ priceCents: 1 });
      const strategyIds = [...new Set(plans.map((p) => p.masterStrategyId.toString()))];
      const strategies = await MasterStrategy.find({ _id: { $in: strategyIds }, status: "active" });
      const strategyById = new Map(strategies.map((s) => [s._id.toString(), s]));
      const bots = plans.filter((p) => strategyById.has(p.masterStrategyId.toString())).map((p) => {
        const strategy = strategyById.get(p.masterStrategyId.toString());
        return {
          planId: p._id.toString(),
          name: strategy.name,
          description: strategy.description,
          priceCents: p.priceCents,
          currency: p.currency,
          interval: p.interval
        };
      });
      res.status(200).json({ bots });
    })
  );
  return router;
}

// src/routes/subscription.ts
import { Router as Router3 } from "express";
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

// src/services/botSubscriptionService.ts
async function initiateCheckout(user, botPlanId, callbackUrl, paymentAdapter) {
  const plan = await BotPlan.findOne({ _id: botPlanId, status: "active" });
  if (!plan) {
    throw new HttpError(404, "That bot plan doesn't exist.");
  }
  let planCode = plan.paystackPlanCode;
  if (!planCode) {
    const created = await paymentAdapter.createPlan({
      name: plan.name,
      priceCents: plan.priceCents,
      currency: plan.currency,
      interval: plan.interval
    });
    planCode = created.planCode;
    plan.paystackPlanCode = planCode;
    await plan.save();
  }
  const result = await paymentAdapter.initializeTransaction({
    email: user.email,
    priceCents: plan.priceCents,
    currency: plan.currency,
    planCode,
    callbackUrl,
    metadata: { userId: user._id.toString(), botPlanId: plan._id.toString() }
  });
  return { authorizationUrl: result.authorizationUrl };
}
async function handlePaymentSucceeded(event, copyTradingAdapter) {
  const userId = typeof event.metadata?.userId === "string" ? event.metadata.userId : void 0;
  const botPlanId = typeof event.metadata?.botPlanId === "string" ? event.metadata.botPlanId : void 0;
  const subscriptionCode = event.subscriptionCode ?? event.reference;
  if (!userId || !botPlanId || !subscriptionCode) return;
  const alreadyApplied = await BotSubscription.findOne({ paystackSubscriptionCode: subscriptionCode });
  if (alreadyApplied) return;
  const [user, plan] = await Promise.all([User.findById(userId), BotPlan.findById(botPlanId)]);
  if (!user || !plan) return;
  if (event.customerCode && !user.paystackCustomerCode) {
    user.paystackCustomerCode = event.customerCode;
    await user.save();
  }
  const previous = await BotSubscription.findOne({
    userId: user._id,
    status: { $in: ["awaiting_link", "active", "past_due"] }
  }).sort({ createdAt: -1 });
  const existingLinkedAccount = previous?.mtAccountId ? await MtAccount.findOne({ _id: previous.mtAccountId, status: "linked" }) : null;
  if (previous) {
    previous.status = "superseded";
    await previous.save();
  }
  const next = await BotSubscription.create({
    userId: user._id,
    masterStrategyId: plan.masterStrategyId,
    botPlanId: plan._id,
    mtAccountId: existingLinkedAccount?._id,
    multiplier: plan.defaultMultiplier,
    paystackSubscriptionCode: subscriptionCode,
    status: existingLinkedAccount ? "active" : "awaiting_link"
  });
  if (existingLinkedAccount?.metaApiAccountId) {
    const strategy = await MasterStrategy.findById(plan.masterStrategyId);
    if (strategy?.copyFactoryStrategyId) {
      try {
        await copyTradingAdapter.subscribeToStrategy(existingLinkedAccount.metaApiAccountId, strategy.copyFactoryStrategyId, plan.defaultMultiplier);
        next.copyFactoryAppliedAt = /* @__PURE__ */ new Date();
      } catch (err) {
        next.copyFactoryApplyError = err instanceof Error ? err.message : "Could not apply the new strategy subscription.";
      }
      await next.save();
    }
  }
}
async function handleSubscriptionDeactivated(event, status) {
  const code = event.subscriptionCode ?? event.reference;
  if (!code) return;
  await BotSubscription.findOneAndUpdate({ paystackSubscriptionCode: code, status: { $in: ["active", "past_due"] } }, { status });
}

// src/routes/subscription.ts
var checkoutSchema = z3.object({ botPlanId: z3.string().min(1) });
function createSubscriptionRouter(paymentAdapter, appBaseUrl) {
  const router = Router3();
  router.use(requireAuth);
  router.post(
    "/checkout",
    asyncHandler(async (req, res) => {
      const { botPlanId } = checkoutSchema.parse(req.body);
      const callbackUrl = `${appBaseUrl}/onboarding/pay/callback`;
      const result = await initiateCheckout(req.user, botPlanId, callbackUrl, paymentAdapter);
      res.status(200).json(result);
    })
  );
  return router;
}

// src/routes/mtAccount.ts
import { Router as Router4 } from "express";
import { z as z4 } from "zod";

// src/services/mtAccountService.ts
var CONSENT_VERSION = "v1";
async function linkMtAccount(user, input, copyTradingAdapter, kmsProvider) {
  const subscription = await BotSubscription.findOne({ userId: user._id, status: "awaiting_link" }).sort({ createdAt: -1 });
  if (!subscription) {
    throw new HttpError(409, "No pending bot subscription to link an account to \u2014 choose a bot and pay first.");
  }
  const existing = await MtAccount.findOne({ userId: user._id, status: { $in: ["pending", "linked"] } });
  if (existing) {
    throw new HttpError(409, "You already have a linked MT5 account.");
  }
  const credentialRef = await encryptSecret(input.tradingPassword, kmsProvider);
  const account = await MtAccount.create({
    userId: user._id,
    broker: input.broker,
    login: input.login,
    serverName: input.serverName,
    credentialRef,
    consent: {
      version: CONSENT_VERSION,
      acceptedAt: /* @__PURE__ */ new Date(),
      acceptedIp: input.consentIp,
      userAgent: input.userAgent
    }
  });
  try {
    const { metaApiAccountId } = await copyTradingAdapter.linkSubscriberAccount({
      broker: input.broker,
      login: input.login,
      serverName: input.serverName,
      tradingPassword: input.tradingPassword
    });
    account.metaApiAccountId = metaApiAccountId;
    account.copyFactorySubscriberConfigured = true;
    account.connectionStage = "deploying";
    await account.save();
  } catch (err) {
    account.status = "error";
    account.connectionStage = "failed";
    account.lastError = { message: err instanceof Error ? err.message : "Could not start linking that account.", at: /* @__PURE__ */ new Date() };
    await account.save();
    throw new HttpError(422, account.lastError.message);
  }
  subscription.mtAccountId = account._id;
  await subscription.save();
  return account;
}
async function syncConnectionStatus(mtAccount, copyTradingAdapter) {
  if (!mtAccount.metaApiAccountId || mtAccount.connectionStage === "connected" || mtAccount.connectionStage === "failed") {
    return mtAccount;
  }
  const result = await copyTradingAdapter.pollConnectionStatus(mtAccount.metaApiAccountId);
  mtAccount.connectionStage = result.stage;
  if (result.stage === "failed") {
    mtAccount.status = "error";
    mtAccount.lastError = { message: result.errorMessage ?? "Connection failed.", at: /* @__PURE__ */ new Date() };
  } else if (result.stage === "connected") {
    mtAccount.status = "linked";
    await applyStrategySubscription(mtAccount, copyTradingAdapter);
  }
  await mtAccount.save();
  return mtAccount;
}
async function applyStrategySubscription(mtAccount, copyTradingAdapter) {
  const subscription = await BotSubscription.findOne({ mtAccountId: mtAccount._id, status: "awaiting_link" }).sort({ createdAt: -1 });
  if (!subscription || !mtAccount.metaApiAccountId) return;
  const strategy = await MasterStrategy.findById(subscription.masterStrategyId);
  if (!strategy?.copyFactoryStrategyId) {
    subscription.copyFactoryApplyError = "Master strategy has no CopyFactory strategy configured.";
    await subscription.save();
    return;
  }
  try {
    await copyTradingAdapter.subscribeToStrategy(mtAccount.metaApiAccountId, strategy.copyFactoryStrategyId, subscription.multiplier);
    subscription.status = "active";
    subscription.copyFactoryAppliedAt = /* @__PURE__ */ new Date();
  } catch (err) {
    subscription.copyFactoryApplyError = err instanceof Error ? err.message : "Could not apply the strategy subscription.";
  }
  await subscription.save();
}

// src/routes/mtAccount.ts
var linkSchema = z4.object({
  broker: z4.string().trim().min(1),
  login: z4.string().trim().min(1),
  serverName: z4.string().trim().min(1),
  tradingPassword: z4.string().min(1),
  // The wizard must present and the user must explicitly accept the
  // "trades will be placed automatically" consent copy before this can
  // ever be true — see MtAccount's `consent` field.
  consent: z4.literal(true)
});
function createMtAccountRouter(copyTradingAdapter, kmsProvider) {
  const router = Router4();
  router.use(requireAuth);
  router.post(
    "/link",
    asyncHandler(async (req, res) => {
      const input = linkSchema.parse(req.body);
      const account = await linkMtAccount(
        req.user,
        {
          broker: input.broker,
          login: input.login,
          serverName: input.serverName,
          tradingPassword: input.tradingPassword,
          consentIp: req.ip ?? "unknown",
          userAgent: req.get("user-agent") ?? "unknown"
        },
        copyTradingAdapter,
        kmsProvider
      );
      res.status(202).json({ status: account.status, connectionStage: account.connectionStage });
    })
  );
  router.get(
    "/status",
    mtAccountStatusRateLimit,
    asyncHandler(async (req, res) => {
      const subscription = await BotSubscription.findOne({
        userId: req.user._id,
        status: { $in: ["awaiting_link", "active"] }
      }).sort({ createdAt: -1 });
      const account = subscription?.mtAccountId ? await MtAccount.findById(subscription.mtAccountId) : null;
      if (!account) {
        res.status(404).json({ error: "No account linking in progress." });
        return;
      }
      const synced = await syncConnectionStatus(account, copyTradingAdapter);
      res.status(200).json({
        status: synced.status,
        connectionStage: synced.connectionStage,
        lastError: synced.lastError?.message ?? null
      });
    })
  );
  return router;
}

// src/routes/profile.ts
import { Router as Router5 } from "express";

// src/services/profileService.ts
async function getProfileSummary(user) {
  const flow = await getFlowStatus(user);
  const subscription = flow.subscription ? await BotSubscription.findOne({ userId: user._id, status: { $in: ["awaiting_link", "active", "past_due"] } }).sort({
    createdAt: -1
  }) : null;
  const [strategy, plan, mtAccount] = await Promise.all([
    subscription ? MasterStrategy.findById(subscription.masterStrategyId) : null,
    subscription ? BotPlan.findById(subscription.botPlanId) : null,
    subscription?.mtAccountId ? MtAccount.findById(subscription.mtAccountId) : null
  ]);
  return {
    email: user.email,
    fullName: user.fullName,
    memberSince: user.get("createdAt").toISOString(),
    flow,
    bot: strategy ? { name: strategy.name, description: strategy.description } : null,
    plan: plan ? { name: plan.name, priceCents: plan.priceCents, currency: plan.currency, interval: plan.interval } : null,
    mtAccount: mtAccount ? {
      broker: mtAccount.broker,
      login: mtAccount.login,
      serverName: mtAccount.serverName,
      status: mtAccount.status,
      connectionStage: mtAccount.connectionStage
    } : null
  };
}

// src/routes/profile.ts
function createProfileRouter() {
  const router = Router5();
  router.use(requireAuth);
  router.get(
    "/profile",
    asyncHandler(async (req, res) => {
      res.status(200).json(await getProfileSummary(req.user));
    })
  );
  return router;
}

// src/routes/webhooks/paystack.ts
import { Router as Router6, raw } from "express";
function createPaystackWebhookRouter(paymentAdapter, copyTradingAdapter) {
  const router = Router6();
  router.post(
    "/",
    raw({ type: "application/json" }),
    asyncHandler(async (req, res) => {
      const rawBody = req.body.toString("utf8");
      paymentAdapter.verifyWebhookSignature(rawBody, req.get("x-paystack-signature"));
      const event = paymentAdapter.parseWebhookEvent(rawBody);
      switch (event.event) {
        case "charge.success":
        case "subscription.create":
          await handlePaymentSucceeded(event, copyTradingAdapter);
          break;
        case "invoice.payment_failed":
          await handleSubscriptionDeactivated(event, "past_due");
          break;
        case "subscription.disable":
          await handleSubscriptionDeactivated(event, "canceled");
          break;
        default:
          break;
      }
      res.status(200).json({ received: true });
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
  app2.use("/webhooks/paystack", createPaystackWebhookRouter(deps.paymentAdapter, deps.copyTradingAdapter));
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
    res.status(200).json({ status: "ok" });
  });
  app2.use("/auth", createAuthRouter(deps.emailAdapter, deps.appBaseUrl));
  app2.use("/bots", createBotsRouter());
  app2.use("/subscription", createSubscriptionRouter(deps.paymentAdapter, deps.appBaseUrl));
  app2.use("/mt-account", createMtAccountRouter(deps.copyTradingAdapter, deps.kmsProvider));
  app2.use("/account", createProfileRouter());
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
var cached2;
function getEmailAdapter() {
  if (!cached2) {
    const env2 = getEnv();
    cached2 = env2.EMAIL_PROVIDER === "resend" ? new ResendEmailAdapter(env2.RESEND_API_KEY, env2.EMAIL_FROM) : new ConsoleEmailAdapter();
  }
  return cached2;
}

// src/adapters/payment/PaystackPaymentAdapter.ts
import { createHmac, timingSafeEqual as timingSafeEqual2 } from "node:crypto";
var PAYSTACK_API_URL = "https://api.paystack.co";
var PaystackPaymentAdapter = class {
  constructor(secretKey) {
    this.secretKey = secretKey;
  }
  provider = "paystack";
  async request(path, init) {
    const response = await fetch(`${PAYSTACK_API_URL}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        "Content-Type": "application/json",
        ...init?.headers
      }
    });
    const body = await response.json();
    if (!response.ok || !body.status) {
      throw new HttpError(502, `Paystack request failed: ${body.message ?? response.statusText}`);
    }
    return body.data;
  }
  async createPlan(input) {
    const data = await this.request("/plan", {
      method: "POST",
      body: JSON.stringify({
        name: input.name,
        amount: Number(input.priceCents),
        interval: input.interval,
        currency: input.currency
      })
    });
    return { planCode: data.plan_code };
  }
  async initializeTransaction(input) {
    const data = await this.request("/transaction/initialize", {
      method: "POST",
      body: JSON.stringify({
        email: input.email,
        amount: Number(input.priceCents),
        currency: input.currency,
        plan: input.planCode,
        callback_url: input.callbackUrl,
        metadata: input.metadata
      })
    });
    return {
      authorizationUrl: data.authorization_url,
      reference: data.reference,
      accessCode: data.access_code
    };
  }
  /** Paystack signs webhook bodies with HMAC-SHA512 of the raw request
   *  body, keyed with the same secret key used for API auth (not a
   *  separate webhook-signing secret, unlike some other processors). */
  verifyWebhookSignature(rawBody, signatureHeader) {
    if (!signatureHeader) {
      throw new HttpError(401, "Missing Paystack signature.");
    }
    const expected = createHmac("sha512", this.secretKey).update(rawBody).digest("hex");
    const expectedBuf = Buffer.from(expected, "hex");
    const actualBuf = Buffer.from(signatureHeader, "hex");
    if (expectedBuf.length !== actualBuf.length || !timingSafeEqual2(expectedBuf, actualBuf)) {
      throw new HttpError(401, "Invalid Paystack signature.");
    }
  }
  parseWebhookEvent(rawBody) {
    const parsed = JSON.parse(rawBody);
    const planCode = typeof parsed.data?.plan === "string" ? parsed.data.plan : parsed.data?.plan?.plan_code ?? parsed.data?.plan_code ?? null;
    return {
      event: parsed.event,
      reference: parsed.data?.reference ?? null,
      customerCode: parsed.data?.customer?.customer_code ?? null,
      customerEmail: parsed.data?.customer?.email ?? null,
      subscriptionCode: parsed.data?.subscription_code ?? null,
      planCode,
      status: parsed.data?.status ?? null,
      metadata: parsed.data?.metadata ?? null
    };
  }
};

// src/adapters/payment/NotConfiguredPaymentAdapter.ts
var MESSAGE = "Paystack isn't configured yet \u2014 set PAYSTACK_SECRET_KEY in apps/api/.env to enable checkout.";
var NotConfiguredPaymentAdapter = class {
  provider = "not-configured";
  async createPlan(_input) {
    throw new HttpError(503, MESSAGE);
  }
  async initializeTransaction(_input) {
    throw new HttpError(503, MESSAGE);
  }
  verifyWebhookSignature(_rawBody, _signatureHeader) {
    throw new HttpError(503, MESSAGE);
  }
  parseWebhookEvent(_rawBody) {
    throw new HttpError(503, MESSAGE);
  }
};

// src/adapters/payment/provider.ts
var cached3;
function getPaymentAdapter() {
  if (!cached3) {
    const key = getEnv().PAYSTACK_SECRET_KEY;
    cached3 = key ? new PaystackPaymentAdapter(key) : new NotConfiguredPaymentAdapter();
  }
  return cached3;
}

// src/adapters/copyTrading/MetaApiCopyTradingAdapter.ts
import { createRequire } from "node:module";
var requireFromHere = createRequire(import.meta.url);
var MetaApi = requireFromHere("metaapi.cloud-sdk/node").default;
var CopyFactory = requireFromHere("metaapi.cloud-copyfactory-sdk/node").default;
var MetaApiCopyTradingAdapter = class {
  provider = "metaapi";
  api;
  copyFactory;
  constructor(token) {
    this.api = new MetaApi(token);
    this.copyFactory = new CopyFactory(token);
  }
  async linkSubscriberAccount(input) {
    const account = await this.createAccount({
      name: `subscriber-${input.login}-${Date.now()}`,
      broker: input.broker,
      login: input.login,
      serverName: input.serverName,
      password: input.tradingPassword,
      role: "SUBSCRIBER"
    });
    await account.deploy();
    return { metaApiAccountId: account.id };
  }
  async pollConnectionStatus(metaApiAccountId) {
    try {
      const account = await this.api.metatraderAccountApi.getAccount(metaApiAccountId);
      if (account.state === "DEPLOY_FAILED" || account.state === "UNDEPLOY_FAILED") {
        return { stage: "failed", errorMessage: `MetaApi account state: ${account.state}` };
      }
      if (account.state !== "DEPLOYED") {
        return { stage: "deploying" };
      }
      if (account.connectionStatus === "CONNECTED") {
        return { stage: "connected" };
      }
      return { stage: "connecting" };
    } catch (err) {
      return { stage: "failed", errorMessage: err instanceof Error ? err.message : "Unknown MetaApi error." };
    }
  }
  async subscribeToStrategy(metaApiAccountId, copyFactoryStrategyId, multiplier) {
    await this.copyFactory.configurationApi.updateSubscriber(metaApiAccountId, {
      name: metaApiAccountId,
      subscriptions: [{ strategyId: copyFactoryStrategyId, multiplier }]
    });
  }
  async ensureProviderStrategy(input) {
    let metaApiAccountId = input.existingMetaApiAccountId;
    if (!metaApiAccountId) {
      if (!input.broker || !input.login || !input.serverName || !input.tradingPassword) {
        throw new Error(
          "ensureProviderStrategy needs either existingMetaApiAccountId or the full broker/login/serverName/tradingPassword set."
        );
      }
      const account = await this.createAccount({
        name: `master-${input.name}`,
        broker: input.broker,
        login: input.login,
        serverName: input.serverName,
        password: input.tradingPassword,
        role: "PROVIDER"
      });
      await account.deploy();
      await account.waitConnected();
      metaApiAccountId = account.id;
    }
    const { id: copyFactoryStrategyId } = await this.copyFactory.configurationApi.generateStrategyId();
    const strategyConfig = {
      name: input.name,
      description: input.description,
      accountId: metaApiAccountId,
      // CopyFactory expresses this as a fraction of 1, not a percentage.
      maxTradeRisk: input.maxTradeRiskPct !== void 0 ? input.maxTradeRiskPct / 100 : void 0
    };
    await this.copyFactory.configurationApi.updateStrategy(copyFactoryStrategyId, strategyConfig);
    return { metaApiAccountId, copyFactoryStrategyId, appliedConfig: strategyConfig };
  }
  async createAccount(input) {
    const profile = await this.findOrCreateProvisioningProfile(input.serverName);
    return this.api.metatraderAccountApi.createAccount({
      name: input.name,
      login: input.login,
      password: input.password,
      server: input.serverName,
      provisioningProfileId: profile.id,
      magic: 0,
      copyFactoryRoles: [input.role]
    });
  }
  async findOrCreateProvisioningProfile(serverName) {
    const existing = await this.api.provisioningProfileApi.getProvisioningProfilesWithInfiniteScrollPagination({
      query: serverName
    });
    const match = existing.find((profile) => profile.name === serverName);
    if (match) return match;
    return this.api.provisioningProfileApi.createProvisioningProfile({
      name: serverName,
      version: 5,
      brokerTimezone: "EET",
      brokerDSTSwitchTimezone: "EET"
    });
  }
};

// src/adapters/copyTrading/NotConfiguredCopyTradingAdapter.ts
var MESSAGE2 = "MetaApi isn't configured yet \u2014 set META_API_TOKEN in apps/api/.env to enable bot linking.";
var NotConfiguredCopyTradingAdapter = class {
  provider = "not-configured";
  async linkSubscriberAccount(_input) {
    throw new HttpError(503, MESSAGE2);
  }
  async pollConnectionStatus(_metaApiAccountId) {
    throw new HttpError(503, MESSAGE2);
  }
  async subscribeToStrategy(_metaApiAccountId, _copyFactoryStrategyId, _multiplier) {
    throw new HttpError(503, MESSAGE2);
  }
  async ensureProviderStrategy(_input) {
    throw new HttpError(503, MESSAGE2);
  }
};

// src/adapters/copyTrading/provider.ts
var cached4;
function getCopyTradingAdapter() {
  if (!cached4) {
    const token = getEnv().META_API_TOKEN;
    cached4 = token ? new MetaApiCopyTradingAdapter(token) : new NotConfiguredCopyTradingAdapter();
  }
  return cached4;
}

// src/adapters/kms/provider.ts
var cached5;
function getKmsProvider() {
  if (!cached5) {
    cached5 = new LocalKmsProvider(getEnv().KMS_LOCAL_MASTER_KEY);
  }
  return cached5;
}

// src/buildApiApp.ts
function buildApiApp() {
  const env2 = getEnv();
  return createApp({
    emailAdapter: getEmailAdapter(),
    paymentAdapter: getPaymentAdapter(),
    copyTradingAdapter: getCopyTradingAdapter(),
    kmsProvider: getKmsProvider(),
    appBaseUrl: env2.CORS_ORIGIN
  });
}

// src/vercelHandler.ts
var env = getEnv();
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
