import { db } from "@workspace/db";
import { invoices, taxInvoices } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

/**
 * Migration script: Copy existing tax_invoices data to invoices table
 * Run this script to populate invoices table with existing tax invoice data
 */

async function migrateTaxInvoices() {
  try {
    console.log("Starting migration: tax_invoices → invoices...");

    // Get all tax invoices
    const allTaxInvoices = await db.select().from(taxInvoices);
    console.log(`Found ${allTaxInvoices.length} tax invoices to migrate`);

    let migratedCount = 0;
    let skippedCount = 0;

    for (const taxInv of allTaxInvoices) {
      try {
        // Check if already migrated
        const [existing] = await db.select().from(invoices)
          .where(eq(invoices.invoiceRef, taxInv.invoiceRef))
          .limit(1);

        if (existing) {
          console.log(`⏭️  Skipped (already migrated): ${taxInv.invoiceRef}`);
          skippedCount++;
          continue;
        }

        // Migrate to invoices table
        const [newInvoice] = await db.insert(invoices).values({
          invoiceRef: taxInv.invoiceRef,
          invoiceNumber: `${taxInv.invoiceRef}`,
          invoiceType: taxInv.invoiceType || "tax_invoice",
          contractId: taxInv.contractId,
          contractProductId: taxInv.contractProductId,
          totalAmount: taxInv.totalAmount,
          gstAmount: taxInv.gstAmount,
          taxAmount: taxInv.gstAmount, // Alias for compatibility
          status: taxInv.status,
          dueDate: taxInv.dueDate,
          paidAt: taxInv.paidAt,
          issuedAt: taxInv.invoiceDate,
          notes: null,
          // Tax-specific fields
          schoolAccountId: taxInv.schoolAccountId,
          studentAccountId: taxInv.studentAccountId,
          programName: taxInv.programName,
          studentName: taxInv.studentName,
          courseStartDate: taxInv.courseStartDate,
          courseEndDate: taxInv.courseEndDate,
          isGstFree: taxInv.isGstFree,
          pdfUrl: taxInv.pdfUrl,
          sentToEmail: taxInv.sentToEmail,
          sentAt: taxInv.sentAt,
          createdBy: taxInv.createdBy,
          createdAt: taxInv.createdOn,
          updatedAt: taxInv.modifiedOn,
        }).returning();

        // Update taxInvoices to link back to invoices
        if (newInvoice) {
          await db.update(taxInvoices)
            .set({ invoiceId: newInvoice.id })
            .where(eq(taxInvoices.id, taxInv.id));

          console.log(`✅ Migrated: ${taxInv.invoiceRef}`);
          migratedCount++;
        }
      } catch (err) {
        console.error(`❌ Failed to migrate ${taxInv.invoiceRef}:`, err);
      }
    }

    console.log(`\n📊 Migration Summary:`);
    console.log(`   Migrated: ${migratedCount}`);
    console.log(`   Skipped: ${skippedCount}`);
    console.log(`   Total: ${migratedCount + skippedCount}`);
    console.log("\n✨ Migration complete!");
    
    return { migratedCount, skippedCount };
  } catch (err) {
    console.error("Migration failed:", err);
    throw err;
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateTaxInvoices()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

export { migrateTaxInvoices };
