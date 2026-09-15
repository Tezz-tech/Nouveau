import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";

const DATA_KEY_LENGTH = 32; // AES-256
const IV_LENGTH = 12; // recommended for GCM
const ALGORITHM = "aes-256-gcm";

/**
 * Wraps and unwraps a *data key* — never the secret itself. This is the
 * seam a real cloud KMS (AWS KMS `Encrypt`/`Decrypt`, GCP KMS) plugs into
 * later; `LocalKmsProvider` below is a same-shape stand-in for local
 * development and for this phase, where no cloud KMS is provisioned yet.
 *
 * ACCESS CONTROL NOTE: "decryptable only by the allocator service" (the
 * brief's wording) is an IAM/deployment concern a software interface can't
 * enforce on its own — in production, only the allocator service's runtime
 * identity should hold permission to call the real KMS's Decrypt API for
 * this key. `LocalKmsProvider`'s master key comes from an environment
 * variable specifically so that, in deployment, it can be injected into
 * only the allocator service's environment and nowhere else — the API
 * service should never hold this key, even though both services import
 * this same package.
 */
export interface KmsProvider {
  readonly keyId: string;
  wrapDataKey(plaintextKey: Buffer): Promise<Buffer>;
  unwrapDataKey(wrappedKey: Buffer): Promise<Buffer>;
}

export class LocalKmsProvider implements KmsProvider {
  readonly keyId: string;
  private readonly masterKey: Buffer;

  constructor(masterKeyBase64: string, keyId = "local-dev-master-key") {
    const key = Buffer.from(masterKeyBase64, "base64");
    if (key.length !== DATA_KEY_LENGTH) {
      throw new RangeError(
        `LocalKmsProvider: master key must be exactly ${DATA_KEY_LENGTH} bytes when base64-decoded (got ${key.length}). Generate one with \`openssl rand -base64 32\`.`
      );
    }
    this.masterKey = key;
    this.keyId = keyId;
  }

  async wrapDataKey(plaintextKey: Buffer): Promise<Buffer> {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.masterKey, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintextKey), cipher.final()]);
    const authTag = cipher.getAuthTag();
    // pack iv + authTag + ciphertext together — this whole buffer is what
    // gets stored as the "wrapped" key
    return Buffer.concat([iv, authTag, ciphertext]);
  }

  async unwrapDataKey(wrappedKey: Buffer): Promise<Buffer> {
    const iv = wrappedKey.subarray(0, IV_LENGTH);
    const authTag = wrappedKey.subarray(IV_LENGTH, IV_LENGTH + 16);
    const ciphertext = wrappedKey.subarray(IV_LENGTH + 16);
    const decipher = createDecipheriv(ALGORITHM, this.masterKey, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  }
}

export interface EncryptedSecret {
  kmsKeyId: string;
  wrappedDataKey: string; // base64
  iv: string; // base64
  authTag: string; // base64
  ciphertext: string; // base64
}

/**
 * Encrypts a secret (an MT5 password, in practice) under a fresh, random
 * data key, which is itself wrapped by the KMS provider. Nothing here logs
 * the plaintext or the data key — callers must hold to the same discipline
 * (never log `plaintext`, never put it in an error message, never return it
 * from an API response other than the one-time capture flow).
 */
export async function encryptSecret(plaintext: string, kms: KmsProvider): Promise<EncryptedSecret> {
  if (plaintext.length === 0) {
    throw new RangeError("encryptSecret: refusing to encrypt an empty secret");
  }
  const dataKey = randomBytes(DATA_KEY_LENGTH);
  try {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, dataKey, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();
    const wrappedDataKey = await kms.wrapDataKey(dataKey);

    return {
      kmsKeyId: kms.keyId,
      wrappedDataKey: wrappedDataKey.toString("base64"),
      iv: iv.toString("base64"),
      authTag: authTag.toString("base64"),
      ciphertext: ciphertext.toString("base64"),
    };
  } finally {
    dataKey.fill(0); // best-effort: scrub the plaintext data key from memory
  }
}

export async function decryptSecret(secret: EncryptedSecret, kms: KmsProvider): Promise<string> {
  if (secret.kmsKeyId !== kms.keyId) {
    throw new Error(
      `decryptSecret: this secret was wrapped under key "${secret.kmsKeyId}", not the provided KMS provider's key "${kms.keyId}"`
    );
  }
  const dataKey = await kms.unwrapDataKey(Buffer.from(secret.wrappedDataKey, "base64"));
  try {
    const decipher = createDecipheriv(ALGORITHM, dataKey, Buffer.from(secret.iv, "base64"));
    decipher.setAuthTag(Buffer.from(secret.authTag, "base64"));
    const plaintext = Buffer.concat([decipher.update(Buffer.from(secret.ciphertext, "base64")), decipher.final()]);
    return plaintext.toString("utf8");
  } finally {
    dataKey.fill(0);
  }
}
