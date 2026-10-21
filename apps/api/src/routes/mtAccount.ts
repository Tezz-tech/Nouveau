import { Router } from "express";
import { z } from "zod";
import { MtAccount, BotSubscription } from "@nouveau/db";
import type { KmsProvider } from "@nouveau/security";
import { asyncHandler } from "../middleware/errorHandler";
import { requireAuth } from "../middleware/requireAuth";
import { mtAccountStatusRateLimit } from "../middleware/rateLimit";
import { linkMtAccount, syncConnectionStatus } from "../services/mtAccountService";
import type { CopyTradingAdapter } from "../adapters/copyTrading/CopyTradingAdapter";

const linkSchema = z.object({
  broker: z.string().trim().min(1),
  login: z.string().trim().min(1),
  serverName: z.string().trim().min(1),
  tradingPassword: z.string().min(1),
  // The wizard must present and the user must explicitly accept the
  // "trades will be placed automatically" consent copy before this can
  // ever be true — see MtAccount's `consent` field.
  consent: z.literal(true),
});

export function createMtAccountRouter(copyTradingAdapter: CopyTradingAdapter, kmsProvider: KmsProvider): Router {
  const router = Router();
  router.use(requireAuth);

  /** Kicks off linking and returns immediately — does not wait for MetaApi
   *  to finish connecting the account. The frontend wizard polls
   *  `GET /mt-account/status` afterward. */
  router.post(
    "/link",
    asyncHandler(async (req, res) => {
      const input = linkSchema.parse(req.body);
      const account = await linkMtAccount(
        req.user!,
        {
          broker: input.broker,
          login: input.login,
          serverName: input.serverName,
          tradingPassword: input.tradingPassword,
          consentIp: req.ip ?? "unknown",
          userAgent: req.get("user-agent") ?? "unknown",
        },
        copyTradingAdapter,
        kmsProvider
      );
      res.status(202).json({ status: account.status, connectionStage: account.connectionStage });
    })
  );

  /** Resumable across a page refresh/tab close since all of this state
   *  lives server-side, not in client memory — see MtAccount.connectionStage. */
  router.get(
    "/status",
    mtAccountStatusRateLimit,
    asyncHandler(async (req, res) => {
      const subscription = await BotSubscription.findOne({
        userId: req.user!._id,
        status: { $in: ["awaiting_link", "active"] },
      }).sort({ createdAt: -1 });

      const account = subscription?.mtAccountId ? await MtAccount.findById(subscription.mtAccountId) : null;
      if (!account) {
        res.status(404).json({ error: "No account linking in progress." });
        return;
      }

      const synced = await syncConnectionStatus(account, copyTradingAdapter);
      res.status(200).json({
        status: synced.status,
        connectionStage: synced.connectionStage,
        lastError: synced.lastError?.message ?? null,
      });
    })
  );

  return router;
}
