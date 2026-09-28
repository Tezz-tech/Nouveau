import { Router } from "express";
import { Subscription } from "@nouveau/db";
import { asyncHandler, HttpError } from "../middleware/errorHandler";
import { requireAuth } from "../middleware/requireAuth";
import { signalsRateLimit } from "../middleware/rateLimit";
import { getSignal } from "../services/signalService";
import type { MarketDataAdapter } from "../adapters/marketData/MarketDataAdapter";
import type { NarrationAdapter } from "../adapters/narration/NarrationAdapter";

const CURRENCY_CODE_PATTERN = /^[A-Z]{3}$/;

export function createSignalsRouter(marketDataAdapter: MarketDataAdapter, narrationAdapter: NarrationAdapter): Router {
  const router = Router();
  router.use(requireAuth);

  // Two path segments, not one — a currency pair's "/" (EUR/USD) is a path
  // separator to Express, so `/:base/:quote` avoids URL-encoding the slash
  // on every caller.
  router.get(
    "/:base/:quote",
    signalsRateLimit,
    asyncHandler(async (req, res) => {
      const user = req.user!;
      if (user.accountType !== "trader") {
        throw new HttpError(403, "Live trading signals are only available on the trader track.");
      }

      const subscription = await Subscription.findOne({ userId: user._id }).sort({ createdAt: -1 });
      if (!subscription || subscription.status !== "active") {
        throw new HttpError(402, "An active subscription is required to see live signals.");
      }

      const base = req.params.base!.toUpperCase();
      const quote = req.params.quote!.toUpperCase();
      if (!CURRENCY_CODE_PATTERN.test(base) || !CURRENCY_CODE_PATTERN.test(quote)) {
        throw new HttpError(400, "Symbol must look like EUR/USD.");
      }

      const result = await getSignal(user, `${base}/${quote}`, marketDataAdapter, narrationAdapter);
      res.status(200).json(result);
    })
  );

  return router;
}
