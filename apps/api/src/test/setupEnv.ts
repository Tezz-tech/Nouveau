import { randomBytes } from "node:crypto";

// Runs before any test file imports anything that calls getEnv() — supplies
// valid-shaped values so env validation doesn't fail in the test process.
// MONGODB_URI is overwritten per-test-file once mongodb-memory-server starts.
process.env.NODE_ENV ??= "test";
process.env.MONGODB_URI ??= "mongodb://localhost:27017/nouveau-test-placeholder";
process.env.SESSION_SECRET ??= randomBytes(32).toString("hex");
process.env.CORS_ORIGIN ??= "http://localhost:5174";
process.env.KMS_LOCAL_MASTER_KEY ??= randomBytes(32).toString("base64");
process.env.TRADING_MODE ??= "paper";
