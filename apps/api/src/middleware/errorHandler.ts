import type { Request, Response, NextFunction, RequestHandler } from "express";
import { ZodError } from "zod";
import { VendorQuotaError } from "../adapters/marketData/CachedMarketDataAdapter";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "HttpError";
  }
}

/** Express 4 doesn't catch rejected promises from async handlers on its
 *  own — wrap every async route with this so a thrown/rejected error
 *  reaches `errorHandler` instead of hanging the request. */
export function asyncHandler(handler: (req: Request, res: Response, next: NextFunction) => Promise<void>): RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction): void {
  // Vendor quota exhaustion is an expected, transient state on the free tier
  // — 503 ("try again shortly"), never a 500. The message is safe to show:
  // it names no keys, URLs, or internals.
  if (err instanceof VendorQuotaError) {
    res.status(503).json({ error: err.message });
    return;
  }
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({ error: "Invalid request.", details: err.flatten() });
    return;
  }
  // Never leak internals (stack traces, DB error text) to the client — log
  // server-side, return a generic message. Security-sensitive fields
  // (passwords, decrypted credentials) must never reach this function in
  // the first place; see @nouveau/security's discipline on that.
  // eslint-disable-next-line no-console
  console.error(err);
  res.status(500).json({ error: "Internal server error." });
}
