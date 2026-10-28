import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../middleware/errorHandler";
import { requireAuth } from "../../middleware/requireAuth";
import { requireAdmin } from "../../middleware/requireAdmin";
import { listUserActivity } from "../../services/adminUserActivityService";

const querySchema = z.object({ page: z.coerce.number().int().positive().optional() });

export function createAdminUsersRouter(): Router {
  const router = Router();
  router.use(requireAuth, requireAdmin);

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const { page } = querySchema.parse(req.query);
      const result = await listUserActivity(page);
      res.status(200).json(result);
    })
  );

  return router;
}
