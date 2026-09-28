import { Router } from "express";
import { z } from "zod";
import { cents } from "@nouveau/core";
import { asyncHandler } from "../middleware/errorHandler";
import { requireAuth } from "../middleware/requireAuth";
import { getOverview, deposit, withdraw, listTransactions, type Overview } from "../services/ledgerService";
import type { PaymentAdapter } from "../adapters/payment/PaymentAdapter";

const amountSchema = z.object({
  // Whole cents, as a JSON number — the frontend converts a dollar amount
  // to cents before sending, same convention as @nouveau/core's Cents.
  amountCents: z.number().int().positive(),
});

function serializeOverview(o: Overview) {
  return {
    custodyCents: o.custodyCents.toString(),
    atRiskCents: o.atRiskCents.toString(),
    totalEquityCents: o.totalEquityCents.toString(),
    totalDepositedCents: o.totalDepositedCents.toString(),
    targetCents: o.targetCents?.toString() ?? null,
    equitySeries: o.equitySeries.map((p) => ({ timestamp: p.timestamp, totalEquityCents: p.totalEquityCents.toString() })),
  };
}

/**
 * The investor track's real, ledger-backed deposit/withdraw/overview/
 * transaction endpoints — mounted at /account alongside profile.ts's
 * router. Every number returned here is computed live from persisted
 * `LedgerTransaction` rows (see ledgerService.ts), never a fabricated
 * figure. What's still simulated is the payment capture itself
 * (`PaymentAdapter`) — no real money moves until a real processor is
 * wired in; see apps/api/README.md.
 */
export function createLedgerRouter(paymentAdapter: PaymentAdapter): Router {
  const router = Router();
  router.use(requireAuth);

  router.get(
    "/overview",
    asyncHandler(async (req, res) => {
      const overview = await getOverview(req.user!.id);
      res.status(200).json(serializeOverview(overview));
    })
  );

  router.post(
    "/deposit",
    asyncHandler(async (req, res) => {
      const { amountCents } = amountSchema.parse(req.body);
      const overview = await deposit(req.user!, paymentAdapter, cents(amountCents));
      res.status(200).json(serializeOverview(overview));
    })
  );

  router.post(
    "/withdraw",
    asyncHandler(async (req, res) => {
      const { amountCents } = amountSchema.parse(req.body);
      const overview = await withdraw(req.user!, paymentAdapter, cents(amountCents));
      res.status(200).json(serializeOverview(overview));
    })
  );

  router.get(
    "/transactions",
    asyncHandler(async (req, res) => {
      const transactions = await listTransactions(req.user!.id);
      res.status(200).json(transactions);
    })
  );

  return router;
}
