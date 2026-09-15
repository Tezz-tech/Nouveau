import { User, PasswordResetToken, type UserDocument } from "@nouveau/db";
import { hashPassword, verifyPassword, generateToken, hashToken, verifyTokenHash } from "@nouveau/security";
import { HttpError } from "../middleware/errorHandler";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function signUp(email: string, password: string): Promise<UserDocument> {
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    // Deliberately vague — "email already exists" on a signup form is a
    // classic account-enumeration leak. A real product usually still sends
    // a "someone tried to sign up with your email" notice instead of
    // silently succeeding; that's a Phase-3-adjacent email-flow addition,
    // not blocking here.
    throw new HttpError(409, "Could not create an account with that email.");
  }
  const passwordHash = await hashPassword(password);
  const user = await User.create({
    email,
    passwordHash,
    onboarding: { completedSteps: ["account"] },
  });
  return user;
}

export async function logIn(email: string, password: string): Promise<UserDocument> {
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

export async function requestPasswordReset(email: string): Promise<{ token: string; user: UserDocument } | null> {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    // Caller sends the same "check your email" response either way — do
    // not reveal whether the address is registered.
    return null;
  }
  const token = generateToken();
  await PasswordResetToken.create({
    userId: user._id,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
  });
  return { token, user };
}

export async function confirmPasswordReset(token: string, newPassword: string): Promise<void> {
  const tokenHash = hashToken(token);
  const record = await PasswordResetToken.findOne({ tokenHash });

  if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
    throw new HttpError(400, "This password reset link is invalid or has expired.");
  }
  // belt-and-suspenders: constant-time re-check against the stored hash,
  // even though the query above already matched it by hash
  if (!verifyTokenHash(token, record.tokenHash)) {
    throw new HttpError(400, "This password reset link is invalid or has expired.");
  }

  const passwordHash = await hashPassword(newPassword);
  await User.findByIdAndUpdate(record.userId, { passwordHash });
  record.usedAt = new Date();
  await record.save();
}
