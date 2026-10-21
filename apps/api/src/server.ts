import { connectToDatabase } from "@nouveau/db";
import { getEnv } from "./config/env";
import { buildApiApp } from "./buildApiApp";

async function main() {
  const env = getEnv();
  await connectToDatabase(env.MONGODB_URI);

  const app = buildApiApp();

  app.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`@nouveau/api listening on :${env.PORT} (${env.NODE_ENV})`);
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Fatal startup error:", err);
  process.exit(1);
});
