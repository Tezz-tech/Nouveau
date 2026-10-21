import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../middleware/errorHandler";
import { requireAuth } from "../middleware/requireAuth";
import { initiateCheckout } from "../services/botSubscriptionService";
import type { PaymentAdapter } from "../adapters/payment/PaymentAdapter";

const checkoutSchema = z.object({ botPlanId: z.string().min(1) });

export function createSubscriptionRouter(paymentAdapter: PaymentAdapter, appBaseUrl: string): Router {
  const router = Router();
  router.use(requireAuth);

  /** Starts a Paystack checkout for a chosen bot plan. The `BotSubscription`
   *  row itself doesn't exist yet — it's created by the webhook once
   *  Paystack actually confirms payment, never optimistically here. */
  router.post(
    "/checkout",
    asyncHandler(async (req, res) => {
      const { botPlanId } = checkoutSchema.parse(req.body);
      const callbackUrl = `${appBaseUrl}/onboarding/pay/callback`;
      const result = await initiateCheckout(req.user!, botPlanId, callbackUrl, paymentAdapter);
      res.status(200).json(result);
    })
  );

  return router;
}
