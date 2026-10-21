import { LocalKmsProvider, type KmsProvider } from "@nouveau/security";
import { getEnv } from "../../config/env";

let cached: KmsProvider | undefined;

/**
 * The API service needs a `KmsProvider` to *wrap* a data key at
 * credential-capture time (encrypting what the user just typed), but per
 * the access-control note in `@nouveau/security/envelope.ts`, only the
 * allocator service should ever be able to *unwrap* one in production. In
 * this phase both directions go through the same `LocalKmsProvider`
 * because there's no separate KMS-backed deployment yet — flagged here so
 * it isn't forgotten when the allocator service (Phase 5) exists and the
 * real access-control split needs to happen.
 */
export function getKmsProvider(): KmsProvider {
  if (!cached) {
    cached = new LocalKmsProvider(getEnv().KMS_LOCAL_MASTER_KEY);
  }
  return cached;
}
