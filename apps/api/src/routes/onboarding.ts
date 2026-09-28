import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../middleware/errorHandler";
import { requireAuth } from "../middleware/requireAuth";
import {
  getOnboardingStatus,
  submitIdentity,
  createBrokerAccount,
  linkBrokerAccount,
  captureCredentials,
  signLpoa,
  selectPlan,
} from "../services/onboardingService";
import type { KycAdapter } from "../adapters/kyc/KycAdapter";
import type { BrokerLinkAdapter } from "../adapters/brokerLink/BrokerLinkAdapter";
import type { PaymentAdapter } from "../adapters/payment/PaymentAdapter";
import { LPOA_DOCUMENT_VERSION, LPOA_DOCUMENT_TEXT } from "../services/lpoaDocument";

const identitySchema = z.object({
  fullName: z.string().min(3),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD."),
  idType: z.enum(["passport", "national_id", "drivers_license"]),
  idNumber: z.string().min(3),
});

const brokerAccountSchema = z.object({
  broker: z.string().min(1),
  login: z.string().min(1),
  serverName: z.string().min(1),
});

const brokerLinkSchema = z.object({
  broker: z.string().min(1),
  login: z.string().min(1),
  serverName: z.string().min(1),
});

const credentialsSchema = z.object({
  mt5Password: z.string().min(1),
});

const lpoaSchema = z.object({
  signedName: z.string().min(3),
});

const planSchema = z.object({
  plan: z.literal("trader_monthly"),
});

export function createOnboardingRouter(kycAdapter: KycAdapter, brokerLinkAdapter: BrokerLinkAdapter, paymentAdapter: PaymentAdapter): Router {
  const router = Router();
  router.use(requireAuth);

  router.get("/status", (req, res) => {
    res.status(200).json(getOnboardingStatus(req.user!));
  });

  // The frontend renders this instead of holding its own copy of the LPOA
  // text, so what a user reviews and what `signLpoa` hashes can never drift
  // apart.
  router.get("/lpoa-document", (_req, res) => {
    res.status(200).json({ version: LPOA_DOCUMENT_VERSION, text: LPOA_DOCUMENT_TEXT });
  });

  router.post(
    "/identity",
    asyncHandler(async (req, res) => {
      const input = identitySchema.parse(req.body);
      const result = await submitIdentity(req.user!, kycAdapter, input);
      res.status(result.verified ? 200 : 422).json(result);
    })
  );

  // Investor track only — Nouveau opens the sub-account. `canCompleteStep`
  // rejects this outright for a trader (it isn't in their step list).
  router.post(
    "/broker-account",
    asyncHandler(async (req, res) => {
      const input = brokerAccountSchema.parse(req.body);
      await createBrokerAccount(req.user!, input);
      res.status(200).json(getOnboardingStatus(req.user!));
    })
  );

  // Trader track only — the user links their own pre-existing account.
  // Mirrors broker-account: identifiers only, no password yet.
  router.post(
    "/broker-link",
    asyncHandler(async (req, res) => {
      const input = brokerLinkSchema.parse(req.body);
      await linkBrokerAccount(req.user!, input);
      res.status(200).json(getOnboardingStatus(req.user!));
    })
  );

  router.post(
    "/credentials",
    asyncHandler(async (req, res) => {
      const { mt5Password } = credentialsSchema.parse(req.body);
      await captureCredentials(req.user!, brokerLinkAdapter, mt5Password);
      // Never echo mt5Password, encrypted or not, back in this response.
      res.status(200).json(getOnboardingStatus(req.user!));
    })
  );

  // Investor track only — a trader never authorizes Nouveau to trade their
  // money, so there's nothing to sign; "lpoa" isn't in their step list.
  router.post(
    "/lpoa",
    asyncHandler(async (req, res) => {
      const { signedName } = lpoaSchema.parse(req.body);
      await signLpoa(req.user!, {
        signedName,
        ipAddress: req.ip ?? "unknown",
        userAgent: req.get("user-agent") ?? "unknown",
      });
      res.status(200).json(getOnboardingStatus(req.user!));
    })
  );

  // Trader track only — picks up the flat subscription that pays for the
  // AI trading assistance. There is no investor equivalent.
  router.post(
    "/plan",
    asyncHandler(async (req, res) => {
      planSchema.parse(req.body);
      await selectPlan(req.user!, paymentAdapter);
      res.status(200).json(getOnboardingStatus(req.user!));
    })
  );

  return router;
}
