import { db } from "@workspace/db";
import { platformSettings } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import fs from "fs";
import path from "path";

const FALLBACK_FILE = "attached_assets/edubee_logo_800x310b_1773796715563.png";

export async function getLogoDataUri(): Promise<string> {
  try {
    const rows = await db
      .select()
      .from(platformSettings)
      .where(eq(platformSettings.key, "branding.logoPath"));
    const stored = rows[0]?.value ?? "";
    if (stored.startsWith("data:")) return stored;
    if (stored.startsWith("/objects/")) return stored;
  } catch {
  }

  try {
    const logoPath = path.join(process.cwd(), FALLBACK_FILE);
    if (fs.existsSync(logoPath)) {
      const buf = fs.readFileSync(logoPath);
      return `data:image/png;base64,${buf.toString("base64")}`;
    }
  } catch {
  }

  return "";
}
