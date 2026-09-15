import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../middleware/errorHandler";
import { authRateLimit } from "../middleware/rateLimit";
import { signUp, logIn, requestPasswordReset, confirmPasswordReset } from "../services/authService";
import { getOnboardingStatus } from "../services/onboardingService";
import type { EmailAdapter } from "../adapters/email/EmailAdapter";

const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(10, "Password must be at least 10 characters."),
});

const logInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const requestResetSchema = z.object({ email: z.string().email() });

const confirmResetSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(10, "Password must be at least 10 characters."),
});

export function createAuthRouter(emailAdapter: EmailAdapter, appBaseUrl: string): Router {
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
          text: `Reset your password: ${resetLink}\n\nThis link expires in one hour. If you didn't request this, ignore this email.`,
        });
      }
      // Same response whether or not the email is registered.
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
