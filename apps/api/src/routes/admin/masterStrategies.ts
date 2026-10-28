import { Router } from "express";
import { z } from "zod";
import { MasterStrategy, type MasterStrategyDocument } from "@nouveau/db";
import { asyncHandler, HttpError } from "../../middleware/errorHandler";
import { requireAuth } from "../../middleware/requireAuth";
import { requireAdmin } from "../../middleware/requireAdmin";
import { createMasterStrategy, syncProvisioning, listMasterStrategies, setMasterStrategyStatus } from "../../services/adminMasterStrategyService";
import type { CopyTradingAdapter } from "../../adapters/copyTrading/CopyTradingAdapter";

const createSchema = z
  .object({
    name: z.string().trim().min(1),
    description: z.string().trim().min(1),
    maxTradeRiskPct: z.number().positive().max(100).optional(),
    existingMetaApiAccountId: z.string().trim().min(1).optional(),
    broker: z.string().trim().min(1).optional(),
    login: z.string().trim().min(1).optional(),
    serverName: z.string().trim().min(1).optional(),
    tradingPassword: z.string().min(1).optional(),
  })
  .refine((v) => Boolean(v.existingMetaApiAccountId) !== Boolean(v.broker && v.login && v.serverName && v.tradingPassword), {
    message: "Provide exactly one of existingMetaApiAccountId, or the full broker/login/serverName/tradingPassword set.",
  });

const statusSchema = z.object({ status: z.enum(["active", "paused"]) });
const paramsSchema = z.object({ id: z.string().min(1) });

function serialize(strategy: MasterStrategyDocument) {
  return {
    id: strategy._id.toString(),
    name: strategy.name,
    description: strategy.description,
    metaApiAccountId: strategy.metaApiAccountId,
    copyFactoryStrategyId: strategy.copyFactoryStrategyId ?? null,
    maxTradeRiskPct: strategy.maxTradeRiskPct ?? null,
    status: strategy.status,
    lastError: strategy.lastError?.message ?? null,
  };
}

export function createAdminMasterStrategiesRouter(copyTradingAdapter: CopyTradingAdapter): Router {
  const router = Router();
  router.use(requireAuth, requireAdmin);

  router.get(
    "/",
    asyncHandler(async (_req, res) => {
      const strategies = await listMasterStrategies();
      res.status(200).json({ masterStrategies: strategies.map(serialize) });
    })
  );

  router.post(
    "/",
    asyncHandler(async (req, res) => {
      const input = createSchema.parse(req.body);
      const strategy = await createMasterStrategy(input, copyTradingAdapter);
      res.status(201).json(serialize(strategy));
    })
  );

  /** Polled by the admin UI while a freshly-provisioned strategy connects —
   *  same resumable-by-polling shape as GET /mt-account/status. */
  router.get(
    "/:id/status",
    asyncHandler(async (req, res) => {
      const { id } = paramsSchema.parse(req.params);
      const strategy = await MasterStrategy.findById(id);
      if (!strategy) throw new HttpError(404, "Master strategy not found.");
      const synced = await syncProvisioning(strategy, copyTradingAdapter);
      res.status(200).json(serialize(synced));
    })
  );

  router.patch(
    "/:id/status",
    asyncHandler(async (req, res) => {
      const { id } = paramsSchema.parse(req.params);
      const { status } = statusSchema.parse(req.body);
      const strategy = await setMasterStrategyStatus(id, status);
      res.status(200).json(serialize(strategy));
    })
  );

  return router;
}
