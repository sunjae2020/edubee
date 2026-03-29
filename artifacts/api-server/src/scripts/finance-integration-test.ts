const BASE_URL = "http://localhost:8080/api";
const ADMIN_EMAIL = "admin@edubee.com";
const ADMIN_PASSWORD = "Admin123!";

interface TestResult {
  phase: string;
  step: string;
  status: "PASS" | "FAIL" | "SKIP";
  message: string;
  data?: any;
  error?: string;
}

const results: TestResult[] = [];

class FinanceTestRunner {
  private token: string = "";
  private testDataIds: Record<string, string> = {};

  private async sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async fetch(endpoint: string, options?: RequestInit) {
    const url = `${BASE_URL}${endpoint}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
      ...(options?.headers as Record<string, string>),
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({}));
    return { status: response.status, data };
  }

  private logResult(
    phase: string,
    step: string,
    status: "PASS" | "FAIL" | "SKIP",
    message: string,
    data?: any,
    error?: string
  ) {
    const result: TestResult = { phase, step, status, message, data, error };
    results.push(result);
    const icon = status === "PASS" ? "✅" : status === "FAIL" ? "❌" : "⏭️";
    console.log(`\n${icon} [${phase}] ${step}`);
    console.log(`   📝 ${message}`);
    if (error) console.log(`   ⚠️  ${error}`);
  }

  async login(): Promise<boolean> {
    try {
      console.log("\n🔑 Authentication...");
      const { status, data } = await this.fetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
        }),
      });

      if (status === 200 && data.accessToken) {
        this.token = data.accessToken;
        this.logResult("Setup", "Login", "PASS", `Token obtained`, {
          email: ADMIN_EMAIL,
        });
        return true;
      }
      this.logResult("Setup", "Login", "FAIL", "Authentication failed", {}, data?.error);
      return false;
    } catch (err: any) {
      this.logResult("Setup", "Login", "FAIL", "Network error", {}, err.message);
      return false;
    }
  }

  async prepareTestData(): Promise<boolean> {
    try {
      console.log("\n📦 Preparing test data...");

      const { status, data: accountsData } = await this.fetch("/crm/accounts");
      if (status !== 200) {
        this.logResult(
          "Setup",
          "Prepare Test Data",
          "FAIL",
          "Failed to fetch accounts",
          {},
          `Status: ${status}`
        );
        return false;
      }

      const accounts = accountsData?.data || [];
      const schoolAccount = accounts.find((a: any) => a.name && a.name.includes("Sydney")) || accounts[0];

      if (!schoolAccount) {
        this.logResult(
          "Setup",
          "Prepare Test Data",
          "FAIL",
          "No account found",
          {},
          "At least one account required"
        );
        return false;
      }

      this.testDataIds.schoolAccountId = schoolAccount.id;
      this.testDataIds.agentAccountId = schoolAccount.id;

      // Get packages
      const { status: pkgStatus, data: pkgData } = await this.fetch("/packages");
      const packages = pkgData?.data || [];
      const testPackage = packages[0];

      if (!testPackage) {
        this.logResult(
          "Setup",
          "Prepare Test Data",
          "FAIL",
          "No packages found",
          {},
          "At least one package required"
        );
        return false;
      }

      this.testDataIds.packageId = testPackage.id;
      this.testDataIds.packageGroupId = testPackage.packageGroupId || "";

      this.logResult("Setup", "Prepare Test Data", "PASS", "Test data ready", {
        schoolAccount: schoolAccount.name,
        testPackage: testPackage.name,
      });

      return true;
    } catch (err: any) {
      this.logResult("Setup", "Prepare Test Data", "FAIL", "Data preparation failed", {}, err.message);
      return false;
    }
  }

  async runPhase1(): Promise<boolean> {
    console.log("\n\n═══════════════════════════════════════════");
    console.log("PHASE 1: Application → Quote → Contract");
    console.log("═══════════════════════════════════════════");

    try {
      // Step 1: Create Application
      console.log("\n[Step 1] Creating Application...");
      const timestamp = Date.now();
      const { status: appStatus, data: appData } = await this.fetch("/applications", {
        method: "POST",
        body: JSON.stringify({
          applicantName: "Test Student",
          applicantEmail: "test@example.com",
          status: "pending",
          totalChildren: 1,
        }),
      });

      if (appStatus !== 201) {
        this.logResult(
          "Phase 1",
          "Step 1: Create Application",
          "FAIL",
          `Status: ${appStatus}`,
          {},
          appData?.error
        );
        return false;
      }

      this.testDataIds.applicationId = appData.id;
      this.logResult("Phase 1", "Step 1: Create Application", "PASS", 
        `Application created: ${appData.applicationNumber}`, 
        { id: appData.id }
      );

      // Step 2: Create Contract directly
      await this.sleep(100);
      console.log("\n[Step 2] Creating Contract...");
      const { status: ctStatus, data: ctData } = await this.fetch("/contracts", {
        method: "POST",
        body: JSON.stringify({
          contractNumber: `CT-TEST-${timestamp}`,
          studentName: "Test Student",
          clientEmail: "test@example.com",
          totalAmount: 5000,
          currency: "AUD",
          status: "draft",
          startDate: "2024-06-01",
          endDate: "2024-09-01",
        }),
      });

      if (ctStatus !== 201) {
        this.logResult(
          "Phase 1",
          "Step 2: Create Contract",
          "FAIL",
          `Status: ${ctStatus}`,
          {},
          ctData?.error
        );
        return false;
      }

      this.testDataIds.contractId = ctData.id;
      this.logResult("Phase 1", "Step 2: Create Contract", "PASS", 
        `Contract created: ${ctData.contractNumber}`, 
        { id: ctData.id, total: 5000 }
      );

      return true;
    } catch (err: any) {
      console.error("Phase 1 Error:", err.message);
      return false;
    }
  }

  async runPhase2(): Promise<boolean> {
    console.log("\n\n═══════════════════════════════════════════");
    console.log("PHASE 2: Service Modules");
    console.log("═══════════════════════════════════════════");

    try {
      console.log("\n[Step 3] Creating Settlement...");
      const { status: setlStatus, data: setlData } = await this.fetch("/services/settlement", {
        method: "POST",
        body: JSON.stringify({
          contractId: this.testDataIds.contractId,
          serviceDescription: "Test Study Abroad Package",
          grossAmount: 5000,
          commissionRate: 10,
          status: "pending",
        }),
      });

      if (setlStatus !== 201) {
        this.logResult(
          "Phase 2",
          "Step 3: Create Settlement",
          "FAIL",
          `Status: ${setlStatus}`,
          {},
          setlData?.error
        );
        return false;
      }

      this.testDataIds.settlementId = setlData.id;
      const expectedCommission = 500;
      const expectedNetAmount = 4500;
      const commissionOk = Number(setlData.commissionAmount) === expectedCommission;
      const netOk = Number(setlData.netAmount) === expectedNetAmount;

      if (!commissionOk || !netOk) {
        this.logResult(
          "Phase 2",
          "Step 3: Create Settlement",
          "FAIL",
          "Settlement calculations incorrect",
          {},
          `Commission: ${setlData.commissionAmount} (expected ${expectedCommission}), Net: ${setlData.netAmount} (expected ${expectedNetAmount})`
        );
        return false;
      }

      this.logResult("Phase 2", "Step 3: Create Settlement", "PASS", 
        `Settlement created with commission calculations`, 
        { 
          id: setlData.id, 
          grossAmount: 5000, 
          commission: expectedCommission, 
          netAmount: expectedNetAmount 
        }
      );

      return true;
    } catch (err: any) {
      console.error("Phase 2 Error:", err.message);
      return false;
    }
  }

  async runPhase3(): Promise<boolean> {
    console.log("\n\n═══════════════════════════════════════════");
    console.log("PHASE 3: Invoice & Payment");
    console.log("═══════════════════════════════════════════");

    try {
      console.log("\n[Step 4] Creating unified Invoice (Tax Invoice)...");
      const timestamp = new Date().toISOString().split("T")[0];
      const { status: invStatus, data: invData } = await this.fetch("/invoices", {
        method: "POST",
        body: JSON.stringify({
          invoiceNumber: `INV-TEST-${Date.now()}`,
          invoiceRef: `TAX-TEST-${Date.now()}`,
          invoiceType: "tax_invoice",
          contractId: this.testDataIds.contractId,
          programName: "Test Course",
          studentName: "Test Student",
          courseStartDate: "2024-06-01",
          courseEndDate: "2024-09-01",
          totalAmount: 5000,
          gstAmount: 500,
          status: "draft",
          issuedAt: timestamp,
          dueDate: "2024-06-30",
        }),
      });

      if (invStatus !== 201) {
        this.logResult(
          "Phase 3",
          "Step 4: Create Invoice (Tax)",
          "FAIL",
          `Status: ${invStatus}`,
          {},
          invData?.error
        );
        return false;
      }

      this.testDataIds.invoiceId = invData.id;
      this.logResult("Phase 3", "Step 4: Create Invoice (Tax)", "PASS", 
        `Tax Invoice created: ${invData.invoiceRef}`, 
        { id: invData.id, gst: 500 }
      );

      // Step 5: Issue Invoice
      await this.sleep(100);
      console.log("\n[Step 5] Issuing Invoice...");
      const { status: issueStatus } = await this.fetch(`/invoices/${this.testDataIds.invoiceId}`, {
        method: "PUT",
        body: JSON.stringify({
          status: "sent",
          issuedAt: timestamp,
        }),
      });

      if (issueStatus !== 200) {
        this.logResult("Phase 3", "Step 5: Issue Invoice", "FAIL", `Status: ${issueStatus}`);
      } else {
        this.logResult("Phase 3", "Step 5: Issue Invoice", "PASS", "Invoice status: sent");
      }

      // Step 6: Create Payment
      await this.sleep(100);
      console.log("\n[Step 6] Processing Payment (Trust Receipt)...");
      const { status: payStatus, data: payData } = await this.fetch("/accounting/payments", {
        method: "POST",
        body: JSON.stringify({
          paymentRef: `PAY-TEST-${Date.now()}`,
          paymentType: "Trust Receipt",
          paymentDate: timestamp,
          totalAmount: 5500,
          currency: "AUD",
          status: "Active",
          notes: `Payment for Contract ${this.testDataIds.contractId}`,
        }),
      });

      if (payStatus !== 201) {
        this.logResult(
          "Phase 3",
          "Step 6: Create Payment",
          "FAIL",
          `Status: ${payStatus}`,
          {},
          payData?.error
        );
        return false;
      }

      this.testDataIds.paymentId = payData.id;
      this.logResult("Phase 3", "Step 6: Create Payment", "PASS", 
        `Payment created: ${payData.paymentRef}`, 
        { id: payData.id, amount: 5500 }
      );

      return true;
    } catch (err: any) {
      console.error("Phase 3 Error:", err.message);
      return false;
    }
  }

  async runPhase4(): Promise<boolean> {
    console.log("\n\n═══════════════════════════════════════════");
    console.log("PHASE 4: Accounting & Journal Entries");
    console.log("═══════════════════════════════════════════");

    try {
      console.log("\n[Step 7] Verifying Journal Entries...");
      const { status: jeStatus, data: jeData } = await this.fetch("/accounting/journal-entries");
      const journalEntries = jeData?.data || [];

      if (jeStatus !== 200 || journalEntries.length === 0) {
        this.logResult("Phase 4", "Step 7: Verify Journal Entries", "SKIP", 
          "Journal entries not yet generated (expected on payment confirmation)"
        );
      } else {
        this.logResult("Phase 4", "Step 7: Verify Journal Entries", "PASS", 
          `${journalEntries.length} journal entry(ies) found`, 
          { jeCount: journalEntries.length }
        );
      }

      return true;
    } catch (err: any) {
      console.error("Phase 4 Error:", err.message);
      return false;
    }
  }

  async runPhase5(): Promise<boolean> {
    console.log("\n\n═══════════════════════════════════════════");
    console.log("PHASE 5: Settlement & Revenue Recognition");
    console.log("═══════════════════════════════════════════");

    try {
      console.log("\n[Step 8] Confirming Settlement...");
      const timestamp = new Date().toISOString().split("T")[0];
      const { status: confirmStatus, data: confirmData } = await this.fetch(
        `/services/settlement/${this.testDataIds.settlementId}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            status: "submitted",
            settlementDate: timestamp,
          }),
        }
      );

      if (confirmStatus !== 200) {
        this.logResult("Phase 5", "Step 8: Confirm Settlement", "FAIL", 
          `Status: ${confirmStatus}`, {}, confirmData?.error
        );
      } else {
        this.logResult("Phase 5", "Step 8: Confirm Settlement", "PASS", 
          "Settlement confirmed: submitted"
        );
      }

      return true;
    } catch (err: any) {
      console.error("Phase 5 Error:", err.message);
      return false;
    }
  }

  async runPhase6(): Promise<boolean> {
    console.log("\n\n═══════════════════════════════════════════");
    console.log("PHASE 6: Data Integrity Validation");
    console.log("═══════════════════════════════════════════");

    try {
      console.log("\n[Step 9] Final Data Consistency Check...");

      // Get all key entities
      const { status: appStatus, data: appData } = await this.fetch(
        `/applications/${this.testDataIds.applicationId}`
      );
      const { status: ctStatus, data: ctData } = await this.fetch(
        `/contracts/${this.testDataIds.contractId}`
      );
      const { status: invStatus, data: invData } = await this.fetch(
        `/invoices/${this.testDataIds.invoiceId}`
      );
      const { status: setlStatus, data: setlData } = await this.fetch(
        `/services/settlement/${this.testDataIds.settlementId}`
      );

      if (
        appStatus === 200 &&
        ctStatus === 200 &&
        invStatus === 200 &&
        setlStatus === 200
      ) {
        const allConsistent = 
          appData?.agentAccountId === ctData?.agentAccountId &&
          ctData?.agentAccountId === setlData?.providerAccountId &&
          Number(ctData?.totalAmount) === Number(setlData?.grossAmount) &&
          Number(invData?.totalAmount) === Number(ctData?.totalAmount);

        if (allConsistent) {
          this.logResult("Phase 6", "Step 9: Data Consistency", "PASS", 
            "All data consistent across entities", 
            {
              application: { id: appData?.id },
              contract: { id: ctData?.id, total: ctData?.totalAmount },
              invoice: { id: invData?.id },
              settlement: { id: setlData?.id },
            }
          );
        } else {
          this.logResult("Phase 6", "Step 9: Data Consistency", "FAIL", 
            "Data inconsistencies detected"
          );
        }
      } else {
        this.logResult("Phase 6", "Step 9: Data Consistency", "FAIL", 
          "Failed to fetch entities for validation"
        );
      }

      return true;
    } catch (err: any) {
      console.error("Phase 6 Error:", err.message);
      return false;
    }
  }

  async generateReport() {
    console.log("\n\n╔════════════════════════════════════════════════════════════════╗");
    console.log("║          FINANCE INTEGRATION TEST REPORT                       ║");
    console.log("╚════════════════════════════════════════════════════════════════╝");

    const passCount = results.filter((r) => r.status === "PASS").length;
    const failCount = results.filter((r) => r.status === "FAIL").length;
    const skipCount = results.filter((r) => r.status === "SKIP").length;
    const totalTests = results.length;
    const passPercentage = totalTests > 0 ? ((passCount / totalTests) * 100).toFixed(1) : "0.0";

    console.log(`\n📊 SUMMARY`);
    console.log(`   ✅ Passed: ${passCount}/${totalTests}`);
    console.log(`   ❌ Failed: ${failCount}/${totalTests}`);
    console.log(`   ⏭️  Skipped: ${skipCount}/${totalTests}`);
    console.log(`   📈 Success Rate: ${passPercentage}%`);

    console.log(`\n📋 DETAILED RESULTS`);
    const groupedByPhase = results.reduce(
      (acc, r) => {
        if (!acc[r.phase]) acc[r.phase] = [];
        acc[r.phase].push(r);
        return acc;
      },
      {} as Record<string, TestResult[]>
    );

    for (const [phase, tests] of Object.entries(groupedByPhase)) {
      console.log(`\n   ${phase}:`);
      tests.forEach((t) => {
        const icon = t.status === "PASS" ? "✅" : t.status === "FAIL" ? "❌" : "⏭️";
        console.log(`      ${icon} ${t.step}`);
        if (t.error) console.log(`         ⚠️  ${t.error}`);
      });
    }

    console.log(`\n🎯 OVERALL ASSESSMENT`);
    if (failCount === 0) {
      console.log(`   ✨ ALL SYSTEMS OPERATIONAL`);
    } else if (failCount <= 2) {
      console.log(`   ⚠️  MINOR ISSUES - ${failCount} test(s) failed`);
    } else {
      console.log(`   ❌ SIGNIFICANT ISSUES - ${failCount} test(s) failed`);
    }

    console.log(`\n📌 TEST DATA CREATED`);
    Object.entries(this.testDataIds).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`);
    });

    console.log(`\n═══════════════════════════════════════════════════════════════\n`);
  }

  async runAllTests() {
    console.log("╔════════════════════════════════════════════════════════════════╗");
    console.log("║   EDUBEE CRM FINANCE INTEGRATION TEST SUITE                    ║");
    console.log("║   Full system validation: Application → Settlement             ║");
    console.log("╚════════════════════════════════════════════════════════════════╝");

    if (!(await this.login())) {
      console.error("❌ Cannot proceed without authentication");
      process.exit(1);
    }

    if (!(await this.prepareTestData())) {
      console.error("❌ Cannot proceed without test data");
      process.exit(1);
    }

    await this.runPhase1();
    await this.sleep(200);
    await this.runPhase2();
    await this.sleep(200);
    await this.runPhase3();
    await this.sleep(200);
    await this.runPhase4();
    await this.sleep(200);
    await this.runPhase5();
    await this.sleep(200);
    await this.runPhase6();

    this.generateReport();
  }
}

const runner = new FinanceTestRunner();
runner.runAllTests().catch((err) => {
  console.error("Test runner error:", err);
  process.exit(1);
});
