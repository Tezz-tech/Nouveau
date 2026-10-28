import { connectToDatabase, disconnectFromDatabase, User } from "@nouveau/db";
import { getEnv } from "../src/config/env";

/**
 * The only way a user ever becomes an admin — there is no API endpoint or
 * UI flow that can set `User.role`, deliberately, so there's no public
 * attack surface for privilege escalation. Run locally, with direct
 * database access, by someone who already has that access:
 *
 *   npx tsx scripts/promoteAdmin.ts someone@example.com
 */
async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) {
    // eslint-disable-next-line no-console
    console.error("Usage: npx tsx scripts/promoteAdmin.ts <email>");
    process.exit(1);
  }

  const env = getEnv();
  await connectToDatabase(env.MONGODB_URI);

  const user = await User.findOneAndUpdate({ email }, { role: "admin" }, { new: true });
  if (!user) {
    // eslint-disable-next-line no-console
    console.error(`No user found with email "${email}" — they need to sign up first.`);
    await disconnectFromDatabase();
    process.exit(1);
  }

  // eslint-disable-next-line no-console
  console.log(`${user.email} is now an admin.`);
  await disconnectFromDatabase();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Failed to promote user:", err);
  process.exit(1);
});
