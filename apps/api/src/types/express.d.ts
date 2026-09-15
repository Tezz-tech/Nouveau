import type { UserDocument } from "@nouveau/db";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      user?: UserDocument;
    }
  }
}

export {};
