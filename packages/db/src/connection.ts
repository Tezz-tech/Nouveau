import mongoose from "mongoose";

/**
 * One connection per process. Every app/service that touches the database
 * calls this once at startup, not per-request — Mongoose pools connections
 * internally.
 */
export async function connectToDatabase(uri: string): Promise<typeof mongoose> {
  return mongoose.connect(uri);
}

export async function disconnectFromDatabase(): Promise<void> {
  await mongoose.disconnect();
}

export { mongoose };
