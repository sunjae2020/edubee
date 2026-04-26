import { staticDb } from "@workspace/db";
import { platformSettings } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { createCipheriv, randomBytes } from "crypto";

const KEY = process.env.FIELD_ENCRYPTION_KEY!;
// Usage: AIRTABLE_TOKEN=pat... ORG_ID=uuid pnpm tsx save-airtable-token.ts
const TOKEN = process.env.AIRTABLE_TOKEN;
const ORG_ID = process.env.ORG_ID ?? "24fafb4c-92d6-4818-9e4d-eef2355199e8";

function encryptToken(plaintext: string): string {
  const key = Buffer.from(KEY, "hex");
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("hex"), authTag.toString("hex"), encrypted.toString("hex")].join(":");
}

async function main() {
  if (!TOKEN) throw new Error("AIRTABLE_TOKEN env var is required");
  const settingKey = `airtable.token.${ORG_ID}`;
  const encrypted = encryptToken(TOKEN);

  const existing = await staticDb
    .select()
    .from(platformSettings)
    .where(eq(platformSettings.key, settingKey))
    .limit(1);

  console.log("Before:", existing[0]?.value?.substring(0, 40) ?? "NOT FOUND");

  await staticDb
    .insert(platformSettings)
    .values({ key: settingKey, value: encrypted, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: platformSettings.key,
      set: { value: encrypted, updatedAt: new Date() },
    });

  const verify = await staticDb
    .select()
    .from(platformSettings)
    .where(eq(platformSettings.key, settingKey))
    .limit(1);

  const parts = verify[0]?.value?.split(":").length ?? 0;
  console.log(`Saved! Parts: ${parts} (expected 3) ✓`);
  process.exit(0);
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
