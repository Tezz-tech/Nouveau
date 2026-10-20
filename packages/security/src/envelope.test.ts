import { describe, it, expect } from "vitest";
import { randomBytes } from "node:crypto";
import { LocalKmsProvider, encryptSecret, decryptSecret, type EncryptedSecret } from "./envelope";

function freshKms(keyId?: string): LocalKmsProvider {
  return new LocalKmsProvider(randomBytes(32).toString("base64"), keyId);
}

describe("LocalKmsProvider", () => {
  it("rejects a master key that isn't exactly 32 bytes", () => {
    expect(() => new LocalKmsProvider(Buffer.from("too short").toString("base64"))).toThrow(RangeError);
  });

  it("wraps and unwraps a data key correctly", async () => {
    const kms = freshKms();
    const dataKey = randomBytes(32);
    const wrapped = await kms.wrapDataKey(dataKey);
    const unwrapped = await kms.unwrapDataKey(wrapped);
    expect(unwrapped.equals(dataKey)).toBe(true);
  });

  it("the wrapped key is not the plaintext key in disguise", async () => {
    const kms = freshKms();
    const dataKey = randomBytes(32);
    const wrapped = await kms.wrapDataKey(dataKey);
    expect(wrapped.includes(dataKey)).toBe(false);
  });
});

describe("encryptSecret / decryptSecret", () => {
  it("round-trips a secret correctly", async () => {
    const kms = freshKms();
    const secret = await encryptSecret("MyMt5Password!23", kms);
    expect(await decryptSecret(secret, kms)).toBe("MyMt5Password!23");
  });

  it("refuses to encrypt an empty secret", async () => {
    const kms = freshKms();
    await expect(encryptSecret("", kms)).rejects.toThrow(RangeError);
  });

  it("the plaintext never appears anywhere in the encrypted payload", async () => {
    const kms = freshKms();
    const plaintext = "MySuperSecretMt5Password!23";
    const secret = await encryptSecret(plaintext, kms);
    const serialized = JSON.stringify(secret);
    expect(serialized).not.toContain(plaintext);
    // and not just the exact string — check it isn't trivially recoverable
    // from any individual base64 field either
    expect(Buffer.from(secret.ciphertext, "base64").toString("utf8")).not.toBe(plaintext);
  });

  it("two encryptions of the same plaintext produce different ciphertext (fresh data key + IV every time)", async () => {
    const kms = freshKms();
    const a = await encryptSecret("same password", kms);
    const b = await encryptSecret("same password", kms);
    expect(a.ciphertext).not.toBe(b.ciphertext);
    expect(a.wrappedDataKey).not.toBe(b.wrappedDataKey);
    expect(a.iv).not.toBe(b.iv);
  });

  it("decryption fails if the ciphertext is tampered with (authenticated encryption)", async () => {
    const kms = freshKms();
    const secret = await encryptSecret("MyMt5Password!23", kms);
    const tamperedBytes = Buffer.from(secret.ciphertext, "base64");
    tamperedBytes[0] = tamperedBytes[0]! ^ 0xff;
    const tampered: EncryptedSecret = {
      ...secret,
      ciphertext: tamperedBytes.toString("base64"),
    };
    await expect(decryptSecret(tampered, kms)).rejects.toThrow();
  });

  it("decryption fails with the wrong KMS provider (wrong master key)", async () => {
    const kmsA = freshKms();
    const kmsB = freshKms();
    const secret = await encryptSecret("MyMt5Password!23", kmsA);
    await expect(decryptSecret(secret, kmsB)).rejects.toThrow();
  });

  it("refuses to decrypt a secret wrapped under a different named key, even if the raw key material happens to match", async () => {
    const masterKeyB64 = randomBytes(32).toString("base64");
    const kmsA = new LocalKmsProvider(masterKeyB64, "key-a");
    const kmsAWithDifferentId = new LocalKmsProvider(masterKeyB64, "key-b");
    const secret = await encryptSecret("MyMt5Password!23", kmsA);
    await expect(decryptSecret(secret, kmsAWithDifferentId)).rejects.toThrow(/wrapped under key/);
  });

  it("round-trips secrets containing unicode and unusual characters correctly", async () => {
    const kms = freshKms();
    const tricky = "p@ss wörd with 日本語 and emoji 🔒 and \"quotes\" and \n newlines";
    const secret = await encryptSecret(tricky, kms);
    expect(await decryptSecret(secret, kms)).toBe(tricky);
  });
});
