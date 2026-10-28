import type { Request, Response, NextFunction } from "express";

/** Must run after `requireAuth` — relies on `req.user` already being set.
 *  There is no public, self-serve way for a user to become an admin (see
 *  `User.role`'s own doc comment and `scripts/promoteAdmin.ts`); this
 *  middleware is the only place that boundary is enforced. */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.user?.role !== "admin") {
    res.status(403).json({ error: "Admin access required." });
    return;
  }
  next();
}
