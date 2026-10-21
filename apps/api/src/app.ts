import express, { type Express } from "express";
import session from "express-session";
import MongoStore from "connect-mongo";
import cors from "cors";
import type { KmsProvider } from "@nouveau/security";
import { getEnv } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";
import { defaultRateLimit } from "./middleware/rateLimit";
import { createAuthRouter } from "./routes/auth";
import { createBotsRouter } from "./routes/bots";
import { createSubscriptionRouter } from "./routes/subscription";
import { createMtAccountRouter } from "./routes/mtAccount";
import { createProfileRouter } from "./routes/profile";
import { createPaystackWebhookRouter } from "./routes/webhooks/paystack";
import type { EmailAdapter } from "./adapters/email/EmailAdapter";
import type { PaymentAdapter } from "./adapters/payment/PaymentAdapter";
import type { CopyTradingAdapter } from "./adapters/copyTrading/CopyTradingAdapter";

export interface AppDependencies {
  emailAdapter: EmailAdapter;
  paymentAdapter: PaymentAdapter;
  copyTradingAdapter: CopyTradingAdapter;
  kmsProvider: KmsProvider;
  appBaseUrl: string;
  /** Skips attaching the Mongo session store — tests provide their own
   *  in-memory MongoDB and don't want a second real connection. */
  sessionStore?: session.Store;
}

export function createApp(deps: AppDependencies): Express {
  const env = getEnv();
  const app = express();

  app.set("trust proxy", 1); // needed for req.ip / secure cookies behind a real load balancer
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));

  // Mounted before express.json() — Paystack's webhook signature needs the
  // exact raw request bytes, which a JSON-parsing middleware ahead of it
  // would already have consumed. See routes/webhooks/paystack.ts.
  app.use("/webhooks/paystack", createPaystackWebhookRouter(deps.paymentAdapter, deps.copyTradingAdapter));

  app.use(express.json({ limit: "1mb" }));
  app.use(
    session({
      name: "nouveau.sid",
      secret: env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      store: deps.sessionStore ?? MongoStore.create({ mongoUrl: env.MONGODB_URI }),
      cookie: {
        httpOnly: true,
        // "none" requires Secure regardless of NODE_ENV — browsers drop a
        // SameSite=None cookie without it.
        secure: env.NODE_ENV === "production" || env.COOKIE_SAME_SITE === "none",
        sameSite: env.COOKIE_SAME_SITE,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      },
    })
  );
  app.use(defaultRateLimit);

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.use("/auth", createAuthRouter(deps.emailAdapter, deps.appBaseUrl));
  app.use("/bots", createBotsRouter());
  app.use("/subscription", createSubscriptionRouter(deps.paymentAdapter, deps.appBaseUrl));
  app.use("/mt-account", createMtAccountRouter(deps.copyTradingAdapter, deps.kmsProvider));
  app.use("/account", createProfileRouter());

  app.use(errorHandler);

  return app;
}
