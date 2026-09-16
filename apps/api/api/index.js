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

// ../../packages/core/src/onboarding/types.ts
var ONBOARDING_STEPS = [
  "account",
  "identity",
  "broker_account",
  "credentials",
  "lpoa"
];
var ONBOARDING_STEP_DESCRIPTIONS = {
  account: "Create your login with an email and password.",
  identity: "Confirm your identity, as required by law before you can trade.",
  broker_account: "We open a trading sub-account in your name at our partner broker.",
  credentials: "Your trading account login is encrypted \u2014 no one at Nouveau can read it back.",
  lpoa: "You authorize our trading desk to manage the at-risk half of your deposit, within limits you set now."
};

// ../../packages/core/src/onboarding/progress.ts
var InvalidOnboardingStepError = class extends Error {
  constructor(step, completedSteps) {
    super(
      `Cannot complete onboarding step "${step}" \u2014 either it's already done, or a required earlier step isn't. Completed so far: [${completedSteps.join(", ")}]`
    );
    this.step = step;
    this.completedSteps = completedSteps;
    this.name = "InvalidOnboardingStepError";
  }
};
function nextStep(completedSteps) {
  for (const step of ONBOARDING_STEPS) {
    if (!completedSteps.includes(step)) return step;
  }
  return "complete";
}
function canCompleteStep(step, completedSteps) {
  if (completedSteps.includes(step)) return false;
  const index = ONBOARDING_STEPS.indexOf(step);
  const requiredPriorSteps = ONBOARDING_STEPS.slice(0, index);
  return requiredPriorSteps.every((s) => completedSteps.includes(s));
}
function completeStep(step, completedSteps) {
  if (!canCompleteStep(step, completedSteps)) {
    throw new InvalidOnboardingStepError(step, completedSteps);
  }
  return [...completedSteps, step];
}
function progressFraction(completedSteps) {
  const validCompleted = completedSteps.filter((s) => ONBOARDING_STEPS.includes(s));
  return validCompleted.length / ONBOARDING_STEPS.length;
}

// ../../packages/db/src/models/User.ts
var onboardingSchema = new Schema(
  {
    completedSteps: {
      type: [{ type: String, enum: ONBOARDING_STEPS }],
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
  COOKIE_SAME_SITE: z.enum(["lax", "none"]).default("lax")
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
async function signUp(email, password) {
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw new HttpError(409, "Could not create an account with that email.");
  }
  const passwordHash = await hashPassword(password);
  const user = await User.create({
    email,
    passwordHash,
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
  const completedSteps = getCompletedOnboardingSteps(user);
  return {
    completedSteps,
    nextStep: nextStep(completedSteps),
    progressFraction: progressFraction(completedSteps),
    steps: ONBOARDING_STEPS.map((step) => ({
      step,
      description: ONBOARDING_STEP_DESCRIPTIONS[step],
      completed: completedSteps.includes(step)
    }))
  };
}
function assertCanCompleteStep(user, step) {
  const completedSteps = getCompletedOnboardingSteps(user);
  if (!canCompleteStep(step, completedSteps)) {
    throw new HttpError(409, `Cannot complete the "${step}" step right now \u2014 check /onboarding/status for what's next.`);
  }
  return completedSteps;
}
async function markStepComplete(user, step) {
  const completedSteps = getCompletedOnboardingSteps(user);
  user.onboarding.completedSteps = completeStep(step, completedSteps);
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
    status: "pending"
  });
  await markStepComplete(user, "broker_account");
}
async function captureCredentials(user, mt5Password) {
  assertCanCompleteStep(user, "credentials");
  const account = await MtAccount.findOne({ userId: user._id }).sort({ createdAt: -1 });
  if (!account) {
    throw new HttpError(409, "No broker account found \u2014 complete the broker account step first.");
  }
  const encrypted = await encryptSecret(mt5Password, getKmsProvider());
  account.credentialRef = encrypted;
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

// src/routes/auth.ts
var signUpSchema = z2.object({
  email: z2.string().email(),
  password: z2.string().min(10, "Password must be at least 10 characters.")
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
      const { email, password } = signUpSchema.parse(req.body);
      const user = await signUp(email, password);
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
var credentialsSchema = z3.object({
  mt5Password: z3.string().min(1)
});
var lpoaSchema = z3.object({
  signedName: z3.string().min(3)
});
function createOnboardingRouter(kycAdapter) {
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
    "/credentials",
    asyncHandler(async (req, res) => {
      const { mt5Password } = credentialsSchema.parse(req.body);
      await captureCredentials(req.user, mt5Password);
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
  return router;
}

// src/routes/profile.ts
import { Router as Router3 } from "express";

// src/services/profileService.ts
async function getProfileSummary(user) {
  const account = await MtAccount.findOne({ userId: user._id }).sort({ createdAt: -1 });
  return {
    email: user.email,
    kycStatus: user.kycStatus,
    memberSince: user.get("createdAt").toISOString(),
    brokerAccount: account ? { broker: account.broker, login: account.login, serverName: account.serverName, status: account.status } : null
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
  app2.use("/onboarding", createOnboardingRouter(deps.kycAdapter));
  app2.use("/account", createAccountRouter());
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
import { randomUUID } from "node:crypto";
var SimulatorKycAdapter = class {
  provider = "simulator";
  async submitVerification(input) {
    const providerReference = `sim_${randomUUID()}`;
    const looksLikePlaceholder = /^(test|foo|bar|asdf|xxx)$/i.test(input.fullName.trim()) || input.fullName.trim().length < 3 || input.idNumber.trim().length < 3;
    if (looksLikePlaceholder) {
      return { status: "rejected", providerReference, reason: "Submission looks like placeholder test data." };
    }
    return { status: "verified", providerReference };
  }
};

// src/buildApiApp.ts
function buildApiApp() {
  const env2 = getEnv();
  return createApp({
    emailAdapter: getEmailAdapter(),
    kycAdapter: new SimulatorKycAdapter(),
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
