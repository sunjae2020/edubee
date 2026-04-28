import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ENCRYPTION_KEY = process.env.FIELD_ENCRYPTION_KEY;
const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
    throw new Error("[FATAL] FIELD_ENCRYPTION_KEY must be 64 hex characters (32 bytes). Set it in Replit Secrets.");
  }
  return Buffer.from(ENCRYPTION_KEY, "hex");
}

/**
 * AES-256-GCM encryption. Returns: "iv:authTag:ciphertext" (all hex)
 * If value is empty or already encrypted, returns as-is.
 */
export function encryptField(plaintext: string | null | undefined): string | null {
  if (!plaintext) return plaintext ?? null;
  if (plaintext.split(":").length === 3) return plaintext; // already encrypted
  try {
    const key = getKey();
    const iv = randomBytes(16);
    const cipher = createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return [iv.toString("hex"), authTag.toString("hex"), encrypted.toString("hex")].join(":");
  } catch (e) {
    console.error("[crypto] encryptField error:", e);
    return plaintext;
  }
}

/**
 * AES-256-GCM decryption.
 * If the value is not in "iv:authTag:ciphertext" format, it is treated as plaintext and returned as-is.
 */
export function decryptField(ciphertext: string | null | undefined): string | null {
  if (!ciphertext) return ciphertext ?? null;
  const parts = ciphertext.split(":");
  if (parts.length !== 3) return ciphertext; // plaintext (legacy data)
  try {
    const key = getKey();
    const [ivHex, authTagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const encrypted = Buffer.from(encryptedHex, "hex");
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  } catch (e) {
    console.error("[crypto] decryptField error:", e);
    return ciphertext; // Return original on decryption failure
  }
}

/**
 * Passport number masking. Format: "AB****89"
 * Prevents sensitive data exposure on list pages, logs, etc.
 */
export function maskPassport(passport: string | null | undefined): string | null {
  if (!passport) return null;
  const plain = decryptField(passport) ?? passport;
  if (plain.length <= 4) return "****";
  return plain.slice(0, 2) + "****" + plain.slice(-2);
}

/**
 * Checks whether FIELD_ENCRYPTION_KEY is configured (used for server startup warnings)
 */
export function isCryptoConfigured(): boolean {
  return !!(ENCRYPTION_KEY && ENCRYPTION_KEY.length === 64);
}
