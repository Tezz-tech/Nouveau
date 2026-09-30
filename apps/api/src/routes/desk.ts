import { Router } from "express";
import { z } from "zod";
import { DeskMessage } from "@nouveau/db";
import { asyncHandler, HttpError } from "../middleware/errorHandler";
import { requireAuth } from "../middleware/requireAuth";
import { defaultRateLimit } from "../middleware/rateLimit";

const postSchema = z.object({ body: z.string().trim().min(1).max(500) });

export interface DeskChatMessage {
  id: string;
  displayName: string;
  accountType: string;
  body: string;
  createdAt: string;
}

/** Subscribers to the desk broadcast — SSE (`GET /desk/stream`). */
type DeskSubscriber = (payload: string) => void;
const deskSubscribers = new Set<DeskSubscriber>();

export function broadcastDeskMessage(message: DeskChatMessage): void {
  const payload = `data: ${JSON.stringify({ type: "message", message })}\n\n`;
  for (const send of deskSubscribers) {
    try {
      send(payload);
    } catch {
      // a dead SSE socket must never break the broadcast loop
    }
  }
}

function serialize(doc: { _id: unknown; displayName?: string; accountType?: string; body?: string; createdAt?: Date }): DeskChatMessage {
  return {
    id: String(doc._id),
    displayName: doc.displayName ?? "trader",
    accountType: doc.accountType ?? "investor",
    body: doc.body ?? "",
    createdAt: (doc.createdAt ?? new Date()).toISOString(),
  };
}

function displayNameFor(email: string | undefined, accountType: string): string {
  const local = (email ?? "trader").split("@")[0] ?? "trader";
  const short = local.slice(0, 18) || "trader";
  const tag = accountType === "trader" ? "T" : "I";
  return `${short} · ${tag}`;
}

/**
 * Shared trading-desk chat for both tracks, shown on Overview for investors
 * and traders alike. `GET /desk/messages` returns the last 50, `POST /desk/
 * messages` persists + broadcasts, `GET /desk/stream` is the live SSE feed.
 * Informational community chat only — never advice, never order placement.
 */
export function createDeskRouter(): Router {
  const router = Router();
  router.use(requireAuth);

  router.get(
    "/messages",
    defaultRateLimit,
    asyncHandler(async (_req, res) => {
      const docs = await DeskMessage.find({}).sort({ createdAt: -1 }).limit(50).lean();
      res.status(200).json({ messages: docs.reverse().map(serialize) });
    })
  );

  router.post(
    "/messages",
    defaultRateLimit,
    asyncHandler(async (req, res) => {
      const parsed = postSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, "Message must be 1–500 characters.");
      // requireAuth already 401s without a session and attaches req.user.
      const user = req.user;
      if (!user) throw new HttpError(401, "Not authenticated.");

      const doc = await DeskMessage.create({
        userId: user._id,
        displayName: displayNameFor(user.email, user.accountType),
        accountType: user.accountType,
        body: parsed.data.body,
      });
      const message = serialize(doc);
      broadcastDeskMessage(message);
      res.status(201).json({ message });
    })
  );

  router.get("/stream", (req, res) => {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    res.write(`data: ${JSON.stringify({ type: "hello", at: Date.now() })}\n\n`);

    const send: DeskSubscriber = (payload) => res.write(payload);
    deskSubscribers.add(send);

    const heartbeat = setInterval(() => {
      try {
        res.write(`: heartbeat ${Date.now()}\n\n`);
      } catch {
        // socket already gone — cleanup below handles it
      }
    }, 20_000);

    req.on("close", () => {
      clearInterval(heartbeat);
      deskSubscribers.delete(send);
    });
  });

  return router;
}
