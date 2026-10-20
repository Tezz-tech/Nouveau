import { Router } from "express";
import { z } from "zod";
import { CopySubscription } from "@nouveau/db";
import { asyncHandler } from "../middleware/errorHandler";
import { requireAuth } from "../middleware/requireAuth";
import {
  subscribeToMaster,
  unsubscribeFromMaster,
  proposeMasterTrade,
  listMyCopies,
  listDecisions,
  getOrCreateMaster,
} from "../services/copyService";
import type { CopyBrokerAdapter } from "../adapters/copyBroker/CopyBrokerAdapter";
import type { MarketDataAdapter } from "../adapters/marketData/MarketDataAdapter";

const subscribeSchema = z.object({
  mode: z.enum(["multiplier", "fixed_lot", "balance_proportional"]).default("multiplier"),
  multiplier: z.number().positive().max(10).default(1),
  fixedLot: z.number().positive().max(10).optional(),
  maxTradeLot: z.number().positive().default(5),
  minTradeLot: z.number().positive().default(0.01),
  reverse: z.boolean().default(false),
  allowedSymbols: z.array(z.string()).default([]),
});

const proposalSchema = z.object({
  symbol: z.string().min(3),
  bias: z.enum(["buy", "sell", "hold"]),
  confidence: z.number().min(0).max(1),
  reason: z.string().min(10),
  requestedLot: z.number().positive().max(10),
  stopLossPips: z.number().positive().nullable(),
  takeProfitPips: z.number().positive().nullable().optional(),
});

/**
 * Copy-trading endpoints.
 *   POST /copy/subscribe   — link my MT account to the master (follower)
 *   DELETE /copy/subscribe — stop copying
 *   GET /copy/status       — my subscription + master strategy id
 *   GET /copy/trades       — my copied trades (dashboard history)
 *   GET /copy/decisions    — AI decision log (why each trade happened)
 *   POST /copy/demo        — demo: AI proposes a master trade, gate decides,
 *                            approved trades fan out to all followers
 */
export function createCopyRouter(copyBroker: CopyBrokerAdapter, marketData: MarketDataAdapter): Router {
  const router = Router();
  router.use(requireAuth);

  router.get(
    "/status",
    asyncHandler(async (req, res) => {
      const master = await getOrCreateMaster();
      const sub = await CopySubscription.findOne({ userId: req.user!.id, status: "active" });
      res.status(200).json({
        provider: copyBroker.provider,
        master,
        subscription: sub
          ? { mode: sub.mode, multiplier: sub.multiplier, status: sub.status, strategyId: sub.strategyId }
          : null,
      });
    })
  );

  router.post(
    "/subscribe",
    asyncHandler(async (req, res) => {
      const input = subscribeSchema.parse(req.body);
      const result = await subscribeToMaster(req.user!.id, copyBroker, input);
      res.status(200).json(result);
    })
  );

  router.delete(
    "/subscribe",
    asyncHandler(async (req, res) => {
      await unsubscribeFromMaster(req.user!.id, copyBroker);
      res.status(200).json({ unsubscribed: true });
    })
  );

  router.get(
    "/trades",
    asyncHandler(async (req, res) => {
      res.status(200).json(await listMyCopies(req.user!.id));
    })
  );

  router.get(
    "/decisions",
    asyncHandler(async (req, res) => {
      res.status(200).json(await listDecisions());
    })
  );

  router.post(
    "/demo",
    asyncHandler(async (req, res) => {
      const proposal = proposalSchema.parse(req.body);
      const result = await proposeMasterTrade(proposal, marketData, copyBroker);
      res.status(200).json({ provider: copyBroker.provider, ...result });
    })
  );

  return router;
}
