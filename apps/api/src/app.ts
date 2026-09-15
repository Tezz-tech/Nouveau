import express, { type Express } from "express";
import session from "express-session";
import MongoStore from "connect-mongo";
import cors from "cors";
import { getEnv } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";
import { defaultRateLimit } from "./middleware/rateLimit";
import { createAuthRouter } from "./routes/auth";
import { createOnboardingRouter } from "./routes/onboarding";
import type { EmailAdapter } from "./adapters/email/EmailAdapter";
import type { KycAdapter } from "./adapters/kyc/KycAdapter";

export interface AppDependencies {
  emailAdapter: EmailAdapter;
  kycAdapter: KycAdapter;
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
    res.status(200).json({ status: "ok", tradingMode: env.TRADING_MODE });
  });

  app.use("/auth", createAuthRouter(deps.emailAdapter, deps.appBaseUrl));
  app.use("/onboarding", createOnboardingRouter(deps.kycAdapter));

  app.use(errorHandler);

  return app;
}
