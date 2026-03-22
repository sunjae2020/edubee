import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

export async function markOverdueArItems() {
  try {
    const result = await db.execute(sql`
      UPDATE contract_products
      SET ar_status = 'overdue'
      WHERE ar_due_date < CURRENT_DATE
        AND ar_status IN ('scheduled', 'invoiced')
    `);
    console.log(`[AR Overdue] Marked overdue AR items`);
  } catch (err) {
    console.error("[AR Overdue] Failed to mark overdue items:", err);
  }
}
