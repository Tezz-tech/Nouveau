import { Router } from "express";
import { z } from "zod";
import { User } from "@nouveau/db";
import { asyncHandler } from "../middleware/errorHandler";
import { authRateLimit } from "../middleware/rateLimit";
import { signUp, logIn, requestPasswordReset, confirmPasswordReset } from "../services/authService";
import { getFlowStatus } from "../services/flowStatusService";
import type { EmailAdapter } from "../adapters/email/EmailAdapter";

const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(10, "Password must be at least 10 characters."),
  fullName: z.string().trim().min(2, "Full name is required."),
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
      const { email, password, fullName } = signUpSchema.parse(req.body);
      const user = await signUp(email, password, fullName);
      req.session.userId = user.id;
      res.status(201).json({ userId: user.id, email: user.email, role: user.role, flow: await getFlowStatus(user) });
    })
  );

  router.post(
    "/login",
    authRateLimit,
    asyncHandler(async (req, res) => {
      const { email, password } = logInSchema.parse(req.body);
      const user = await logIn(email, password);
      req.session.userId = user.id;
      res.status(200).json({ userId: user.id, email: user.email, role: user.role, flow: await getFlowStatus(user) });
    })
  );

  router.post("/logout", (req, res) => {
    req.session.destroy(() => {
      res.status(204).end();
    });
  });

  router.get(
    "/session",
    asyncHandler(async (req, res) => {
      if (!req.session.userId) {
        res.status(200).json({ authenticated: false });
        return;
      }
      // A session can outlive the user it points at (e.g. deleted directly
      // in the database) — treat that the same as logged out rather than
      // 500ing or returning a role for a user that no longer exists.
      const user = await User.findById(req.session.userId);
      if (!user) {
        res.status(200).json({ authenticated: false });
        return;
      }
      res.status(200).json({ authenticated: true, userId: req.session.userId, role: user.role });
    })
  );

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
