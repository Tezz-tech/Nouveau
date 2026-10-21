import { Router } from "express";
import { MasterStrategy, BotPlan } from "@nouveau/db";
import { asyncHandler } from "../middleware/errorHandler";

/** Public (no auth) — just the picker a visitor sees before they even have
 *  an account. Never exposes `metaApiAccountId`/`copyFactoryStrategyId` or
 *  anything else MetaApi-internal, only what a plan picker needs. */
export function createBotsRouter(): Router {
  const router = Router();

  router.get(
    "/",
    asyncHandler(async (_req, res) => {
      const plans = await BotPlan.find({ status: "active" }).sort({ priceCents: 1 });
      const strategyIds = [...new Set(plans.map((p) => p.masterStrategyId.toString()))];
      const strategies = await MasterStrategy.find({ _id: { $in: strategyIds }, status: "active" });
      const strategyById = new Map(strategies.map((s) => [s._id.toString(), s]));

      const bots = plans
        .filter((p) => strategyById.has(p.masterStrategyId.toString()))
        .map((p) => {
          const strategy = strategyById.get(p.masterStrategyId.toString())!;
          return {
            planId: p._id.toString(),
            name: strategy.name,
            description: strategy.description,
            priceCents: p.priceCents,
            currency: p.currency,
            interval: p.interval,
          };
        });

      res.status(200).json({ bots });
    })
  );

  return router;
}
