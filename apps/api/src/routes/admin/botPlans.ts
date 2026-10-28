import { Router } from "express";
import { z } from "zod";
import type { BotPlanDocument } from "@nouveau/db";
import { asyncHandler } from "../../middleware/errorHandler";
import { requireAuth } from "../../middleware/requireAuth";
import { requireAdmin } from "../../middleware/requireAdmin";
import { createBotPlan, listBotPlans, setBotPlanStatus } from "../../services/adminBotPlanService";

const createSchema = z.object({
  name: z.string().trim().min(1),
  masterStrategyId: z.string().trim().min(1),
  priceCents: z.string().regex(/^\d+$/, "priceCents must be a decimal-string integer."),
  currency: z.string().trim().length(3).optional(),
  interval: z.literal("monthly").optional(),
  defaultMultiplier: z.number().positive().optional(),
});

const statusSchema = z.object({ status: z.enum(["active", "retired"]) });
const paramsSchema = z.object({ id: z.string().min(1) });

function serialize(plan: BotPlanDocument) {
  return {
    id: plan._id.toString(),
    name: plan.name,
    masterStrategyId: plan.masterStrategyId.toString(),
    priceCents: plan.priceCents,
    currency: plan.currency,
    interval: plan.interval,
    defaultMultiplier: plan.defaultMultiplier,
    status: plan.status,
    paystackPlanCode: plan.paystackPlanCode ?? null,
  };
}

export function createAdminBotPlansRouter(): Router {
  const router = Router();
  router.use(requireAuth, requireAdmin);

  router.get(
    "/",
    asyncHandler(async (_req, res) => {
      const plans = await listBotPlans();
      res.status(200).json({ botPlans: plans.map(serialize) });
    })
  );

  router.post(
    "/",
    asyncHandler(async (req, res) => {
      const input = createSchema.parse(req.body);
      const plan = await createBotPlan(input);
      res.status(201).json(serialize(plan));
    })
  );

  router.patch(
    "/:id/status",
    asyncHandler(async (req, res) => {
      const { id } = paramsSchema.parse(req.params);
      const { status } = statusSchema.parse(req.body);
      const plan = await setBotPlanStatus(id, status);
      res.status(200).json(serialize(plan));
    })
  );

  return router;
}
