import type { Request, Response, NextFunction } from "express";
import { User } from "@nouveau/db";

/** Attaches `req.userId` and `req.user` when authenticated; otherwise 401s.
 *  Every onboarding route sits behind this — there is no anonymous
 *  onboarding step. */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userId = req.session.userId;
  if (!userId) {
    res.status(401).json({ error: "Not authenticated." });
    return;
  }
  const user = await User.findById(userId);
  if (!user) {
    // session refers to a user that no longer exists — treat as logged out
    req.session.destroy(() => undefined);
    res.status(401).json({ error: "Not authenticated." });
    return;
  }
  req.userId = userId;
  req.user = user;
  next();
}
