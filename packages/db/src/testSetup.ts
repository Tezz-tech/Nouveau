import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { findCachedMongodBinary } from "./mongoBinary";

let mongod: MongoMemoryServer | undefined;

export async function startTestDatabase(): Promise<void> {
  const systemBinary = findCachedMongodBinary();
  mongod = await MongoMemoryServer.create(systemBinary ? { binary: { systemBinary } } : undefined);
  await mongoose.connect(mongod.getUri());
  // Mongoose builds each model's indexes (including `unique` and TTL
  // indexes) asynchronously in the background after registration — without
  // waiting here, a test that creates a document and immediately checks a
  // uniqueness/TTL constraint can race ahead of the index actually
  // existing yet. In a long-running real app this window closes well
  // before real traffic arrives, but a fresh test database hits it
  // immediately every time.
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
}

export async function stopTestDatabase(): Promise<void> {
  await mongoose.disconnect();
  await mongod?.stop();
}

export async function clearTestDatabase(): Promise<void> {
  const collections = mongoose.connection.collections;
  for (const collection of Object.values(collections)) {
    await collection.deleteMany({});
  }
}
