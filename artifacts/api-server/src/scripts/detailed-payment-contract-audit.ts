const BASE_URL = "http://localhost:8080/api";
const ADMIN_EMAIL = "admin@edubee.com";
const ADMIN_PASSWORD = "Admin123!";

interface AuditResult {
  category: string;
  finding: string;
  severity: "INFO" | "WARN" | "ISSUE";
  count: number;
  percentage: number;
  examples?: any[];
}

const findings: AuditResult[] = [];

class DetailedPaymentContractAudit {
  private token: string = "";

  private async fetch(endpoint: string, options?: RequestInit) {
    const url = `${BASE_URL}${endpoint}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
      ...(options?.headers as Record<string, string>),
    };

    const response = await fetch(url, { ...options, headers });
    const data = await response.json().catch(() => ({}));
    return { status: response.status, data };
  }

  async login(): Promise<boolean> {
    const { status, data } = await this.fetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
      }),
    });

    if (status === 200 && data.accessToken) {
      this.token = data.accessToken;
      return true;
    }
    return false;
  }

  async auditPaymentContractLink() {
    console.log("\n📊 AUDIT 1: Payment → Contract Linkage");
    console.log("═══════════════════════════════════════\n");

    const { status: payStatus, data: payData } = await this.fetch(
      "/accounting/payments?limit=100"
    );
    const payments = payData?.data || [];
    console.log(`Total Payments: ${payments.length}`);

    const withContractId = payments.filter((p: any) => p.contractId);
    const withoutContractId = payments.filter((p: any) => !p.contractId);

    const finding1: AuditResult = {
      category: "Payment-Contract Linkage",
      finding: "Payments with contractId",
      severity: withContractId.length > 0 ? "INFO" : "WARN",
      count: withContractId.length,
      percentage: (withContractId.length / payments.length) * 100,
      examples: withContractId.slice(0, 3),
    };
    findings.push(finding1);

    console.log(`✅ With contractId: ${withContractId.length} (${finding1.percentage.toFixed(1)}%)`);
    if (withContractId.length > 0) {
      console.log(`   Examples:`, withContractId.slice(0, 3).map(p => ({
        ref: p.paymentRef,
        contractId: p.contractId,
        amount: p.totalAmount,
      })));
    }

    console.log(`⚠️  Without contractId: ${withoutContractId.length} (${(100 - finding1.percentage).toFixed(1)}%)`);
    if (withoutContractId.length > 0) {
      console.log(`   Examples:`, withoutContractId.slice(0, 3).map(p => ({
        ref: p.paymentRef,
        amount: p.totalAmount,
        status: p.status,
      })));
    }
  }

  async auditContractStructure() {
    console.log("\n📊 AUDIT 2: Contract Data Structure");
    console.log("═══════════════════════════════════════\n");

    const { status, data } = await this.fetch("/crm/contracts?limit=5");
    const contracts = data?.data || [];

    console.log(`Total Contracts: ${data?.total || contracts.length}`);
    if (contracts.length > 0) {
      const sample = contracts[0];
      console.log(`\n📋 Sample Contract Structure:`);
      console.log(JSON.stringify(sample, null, 2).split('\n').slice(0, 30).join('\n'));

      // Check for payment relationships
      const hasPayments = contracts.filter((c: any) => c.payments && c.payments.length > 0);
      console.log(`\n💰 Contracts with payments property: ${hasPayments.length}/${contracts.length}`);
    }
  }

  async auditPaymentStructure() {
    console.log("\n📊 AUDIT 3: Payment Data Structure");
    console.log("═══════════════════════════════════════\n");

    const { status, data } = await this.fetch("/accounting/payments?limit=3");
    const payments = data?.data || [];

    console.log(`Total Payments: ${data?.total || payments.length}`);
    if (payments.length > 0) {
      const sample = payments[0];
      console.log(`\n📋 Sample Payment Structure:`);
      console.log(JSON.stringify(sample, null, 2).split('\n').slice(0, 40).join('\n'));

      // Check fields related to contracts
      const allKeys = Object.keys(payments[0]);
      const contractRelatedKeys = allKeys.filter(k => k.toLowerCase().includes('contract'));
      console.log(`\n🔗 Contract-related fields: ${contractRelatedKeys.join(', ') || 'NONE'}`);
    }
  }

  async auditJournalEntryStructure() {
    console.log("\n📊 AUDIT 4: Journal Entry Data Structure");
    console.log("═══════════════════════════════════════\n");

    const { status, data } = await this.fetch("/accounting/journal-entries?limit=3");
    const entries = data?.data || [];

    console.log(`Total Journal Entries: ${data?.total || entries.length}`);
    if (entries.length > 0) {
      const sample = entries[0];
      console.log(`\n📋 Sample Journal Entry Structure:`);
      console.log(JSON.stringify(sample, null, 2).split('\n').slice(0, 40).join('\n'));

      // Check for transaction or contract references
      const allKeys = Object.keys(entries[0]);
      const refKeys = allKeys.filter(k => 
        k.toLowerCase().includes('transaction') || 
        k.toLowerCase().includes('contract') ||
        k.toLowerCase().includes('payment')
      );
      console.log(`\n🔗 Reference fields: ${refKeys.join(', ') || 'NONE'}`);

      // Check for linked data
      const withEntryId = entries.filter((e: any) => e.entryId);
      const withDebit = entries.filter((e: any) => e.debitAmount);
      const withCredit = entries.filter((e: any) => e.creditAmount);

      console.log(`\n📊 Data Completeness:`);
      console.log(`   With entryId: ${withEntryId.length}/${entries.length}`);
      console.log(`   With debitAmount: ${withDebit.length}/${entries.length}`);
      console.log(`   With creditAmount: ${withCredit.length}/${entries.length}`);
    }
  }

  async auditPaymentTransactionLink() {
    console.log("\n📊 AUDIT 5: Payment → Transaction Link");
    console.log("═══════════════════════════════════════\n");

    // Try different transaction endpoints
    const endpoints = [
      "/accounting/transactions",
      "/transactions",
      "/accounting/transactions-by-payment",
    ];

    for (const endpoint of endpoints) {
      const { status, data } = await this.fetch(endpoint);
      console.log(`${endpoint}: Status ${status}`);
      if (status === 200 && data?.data) {
        console.log(`   Count: ${data.data.length}`);
        if (data.data.length > 0) {
          console.log(`   Sample:`, JSON.stringify(data.data[0], null, 2).split('\n').slice(0, 15).join('\n'));
        }
        break;
      }
    }
  }

  async auditInvoices() {
    console.log("\n📊 AUDIT 6: Invoice Data");
    console.log("═══════════════════════════════════════\n");

    const { status, data } = await this.fetch("/invoices?limit=5");
    const invoices = data?.data || [];

    console.log(`Total Invoices: ${data?.total || invoices.length}`);
    if (invoices.length > 0) {
      const sample = invoices[0];
      const contractLinked = invoices.filter((i: any) => i.contractId);
      console.log(`✅ With contractId: ${contractLinked.length}/${invoices.length}`);
      console.log(`\n📋 Sample Invoice:`, JSON.stringify(sample, null, 2).split('\n').slice(0, 20).join('\n'));
    }
  }

  async generateSummary() {
    console.log("\n\n╔════════════════════════════════════════════════════════════════╗");
    console.log("║          AUDIT SUMMARY & RECOMMENDATIONS                       ║");
    console.log("╚════════════════════════════════════════════════════════════════╝\n");

    // Count issues
    const warns = findings.filter(f => f.severity === "WARN");
    const issues = findings.filter(f => f.severity === "ISSUE");

    console.log(`📈 Findings Summary:`);
    console.log(`   Info: ${findings.filter(f => f.severity === "INFO").length}`);
    console.log(`   Warnings: ${warns.length}`);
    console.log(`   Issues: ${issues.length}\n`);

    console.log(`🎯 Key Observations:`);
    console.log(`   1. Payment-Contract linkage: Check if contractId is being populated during payment creation`);
    console.log(`   2. Transaction endpoint: Verify correct endpoint path and data structure`);
    console.log(`   3. Journal Entry linkage: Ensure entries reference payments/contracts properly`);
    console.log(`   4. Data flow: Contract → Payment → Invoice → Transaction → Journal Entry`);

    console.log(`\n💡 Recommendations:`);
    console.log(`   • Review payment creation logic for contractId assignment`);
    console.log(`   • Verify transaction creation is triggered by payment creation`);
    console.log(`   • Check journal entry auto-generation for accuracy`);
    console.log(`   • Validate ledger posting logic\n`);
  }

  async runAudit() {
    console.log("╔════════════════════════════════════════════════════════════════╗");
    console.log("║   DETAILED PAYMENT-CONTRACT AUDIT                              ║");
    console.log("║   Diagnose data flow and linkage issues                         ║");
    console.log("╚════════════════════════════════════════════════════════════════╝");

    if (!(await this.login())) {
      console.error("❌ Authentication failed");
      process.exit(1);
    }

    console.log("\n🔐 Authenticated\n");

    await this.auditPaymentContractLink();
    await this.auditContractStructure();
    await this.auditPaymentStructure();
    await this.auditJournalEntryStructure();
    await this.auditPaymentTransactionLink();
    await this.auditInvoices();
    await this.generateSummary();
  }
}

const audit = new DetailedPaymentContractAudit();
audit.runAudit().catch((err) => {
  console.error("Audit error:", err);
  process.exit(1);
});
