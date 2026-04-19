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
 * AES-256-GCM 암호화. 반환값: "iv:authTag:ciphertext" (모두 hex)
 * 빈 값이거나 이미 암호화된 값이면 그대로 반환.
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
 * AES-256-GCM 복호화.
 * "iv:authTag:ciphertext" 형식이 아니면 평문으로 간주하고 그대로 반환.
 */
export function decryptField(ciphertext: string | null | undefined): string | null {
  if (!ciphertext) return ciphertext ?? null;
  const parts = ciphertext.split(":");
  if (parts.length !== 3) return ciphertext; // 평문 (레거시 데이터)
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
    return ciphertext; // 복호화 실패 시 원본 반환
  }
}

/**
 * 여권번호 마스킹. "AB****89" 형식
 * 목록 페이지, 로그 등에서 민감 정보 노출 방지용
 */
export function maskPassport(passport: string | null | undefined): string | null {
  if (!passport) return null;
  const plain = decryptField(passport) ?? passport;
  if (plain.length <= 4) return "****";
  return plain.slice(0, 2) + "****" + plain.slice(-2);
}

/**
 * FIELD_ENCRYPTION_KEY 설정 여부 확인 (서버 시작 시 경고용)
 */
export function isCryptoConfigured(): boolean {
  return !!(ENCRYPTION_KEY && ENCRYPTION_KEY.length === 64);
}
