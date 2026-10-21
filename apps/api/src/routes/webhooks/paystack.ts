import { Router, raw } from "express";
import { asyncHandler } from "../../middleware/errorHandler";
import { handlePaymentSucceeded, handleSubscriptionDeactivated } from "../../services/botSubscriptionService";
import type { PaymentAdapter } from "../../adapters/payment/PaymentAdapter";
import type { CopyTradingAdapter } from "../../adapters/copyTrading/CopyTradingAdapter";

/**
 * Mounted BEFORE `express.json()` in app.ts, with its own `express.raw()`
 * parser — signature verification needs the exact raw request bytes, which
 * a prior JSON-parsing middleware would have already consumed and
 * reserialized (not guaranteed byte-identical) by the time this handler
 * saw it.
 */
export function createPaystackWebhookRouter(paymentAdapter: PaymentAdapter, copyTradingAdapter: CopyTradingAdapter): Router {
  const router = Router();

  router.post(
    "/",
    raw({ type: "application/json" }),
    asyncHandler(async (req, res) => {
      const rawBody = (req.body as Buffer).toString("utf8");
      paymentAdapter.verifyWebhookSignature(rawBody, req.get("x-paystack-signature"));
      const event = paymentAdapter.parseWebhookEvent(rawBody);

      switch (event.event) {
        case "charge.success":
        case "subscription.create":
          await handlePaymentSucceeded(event, copyTradingAdapter);
          break;
        case "invoice.payment_failed":
          await handleSubscriptionDeactivated(event, "past_due");
          break;
        case "subscription.disable":
          await handleSubscriptionDeactivated(event, "canceled");
          break;
        default:
          break; // an event type we don't act on — not an error
      }

      res.status(200).json({ received: true });
    })
  );

  return router;
}
