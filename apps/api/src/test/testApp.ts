import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import session from "express-session";
import { findCachedMongodBinary } from "@nouveau/db";
import { createApp } from "../app";
import { SimulatorKycAdapter } from "../adapters/kyc/SimulatorKycAdapter";
import type { EmailMessage, EmailAdapter } from "../adapters/email/EmailAdapter";

export class RecordingEmailAdapter implements EmailAdapter {
  public sent: EmailMessage[] = [];
  async send(message: EmailMessage): Promise<void> {
    this.sent.push(message);
  }
}

export async function buildTestApp() {
  const systemBinary = findCachedMongodBinary();
  const mongod = await MongoMemoryServer.create(systemBinary ? { binary: { systemBinary } } : undefined);
  const uri = mongod.getUri();
  process.env.MONGODB_URI = uri;
  await mongoose.connect(uri);
  // see the comment in @nouveau/db's testSetup.ts — index builds are async
  // and not awaited by connect() itself
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()));

  const emailAdapter = new RecordingEmailAdapter();
  const app = createApp({
    emailAdapter,
    kycAdapter: new SimulatorKycAdapter(),
    appBaseUrl: "http://localhost:5174",
    // in-memory session store for tests — MongoStore would try to open a
    // second real connection using connect-mongo's own client
    sessionStore: new session.MemoryStore(),
  });

  return {
    app,
    emailAdapter,
    async teardown() {
      await mongoose.disconnect();
      await mongod.stop();
    },
    async clear() {
      const collections = mongoose.connection.collections;
      for (const collection of Object.values(collections)) {
        await collection.deleteMany({});
      }
    },
  };
}
