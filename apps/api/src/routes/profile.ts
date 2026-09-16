import { Router } from "express";
import { asyncHandler } from "../middleware/errorHandler";
import { requireAuth } from "../middleware/requireAuth";
import { getProfileSummary } from "../services/profileService";

export function createAccountRouter(): Router {
  const router = Router();
  router.use(requireAuth);

  router.get(
    "/profile",
    asyncHandler(async (req, res) => {
      res.status(200).json(await getProfileSummary(req.user!));
    })
  );

  return router;
}
