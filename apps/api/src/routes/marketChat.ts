import { Router } from "express";
import { z } from "zod";
import { asyncHandler, HttpError } from "../middleware/errorHandler";
import { requireAuth } from "../middleware/requireAuth";
import { signalsRateLimit } from "../middleware/rateLimit";
import type { MarketDataAdapter } from "../adapters/marketData/MarketDataAdapter";
import { getMarketChatSnapshot } from "../services/marketChatService";

const pairSchema = z.object({ base: z.string().regex(/^[A-Z]{3}$/), quote: z.string().regex(/^[A-Z]{3}$/) });
const messageSchema = z.object({ message: z.string().trim().min(1).max(300) });

export function createMarketChatRouter(marketDataAdapter: MarketDataAdapter): Router {
  const router = Router();
  router.use(requireAuth, signalsRateLimit);

  router.post("/:base/:quote", asyncHandler(async (req, res) => {
    const pair = pairSchema.safeParse({ base: req.params.base?.toUpperCase(), quote: req.params.quote?.toUpperCase() });
    if (!pair.success) throw new HttpError(400, "Pair must look like EUR/USD.");
    messageSchema.parse(req.body);

    const result = await getMarketChatSnapshot(`${pair.data.base}/${pair.data.quote}`, marketDataAdapter);
    res.status(200).json(result);
  }));

  return router;
}