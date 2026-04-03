const BASE_URL = "http://localhost:8080/api";
const ADMIN_EMAIL = "admin@edubee.co";
const ADMIN_PASSWORD = "Admin123!";

interface ValidationResult {
  section: string;
  test: string;
  status: "PASS" | "FAIL" | "WARN";
  message: string;
  data?: any;
}

const results: ValidationResult[] = [];

class PaymentLedgerValidator {
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

  private logResult(
    section: string,
    test: string,
    status: "PASS" | "FAIL" | "WARN",
    message: string,
    data?: any
  ) {
    results.push({ section, test, status, message, data });
    const icon = status === "PASS" ? "✅" : status === "FAIL" ? "❌" : "⚠️";
    console.log(`\n${icon} [${section}] ${test}`);
    console.log(`   📝 ${message}`);
  }

  async login(): Promise<boolean> {
    try {
      console.log("\n🔑 Authenticating...");
      const { status, data } = await this.fetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
        }),
      });

      if (status === 200 && data.accessToken) {
        this.token = data.accessToken;
        this.logResult("Setup", "Login", "PASS", "Authenticated successfully");
        return true;
      }
      this.logResult("Setup", "Login", "FAIL", "Authentication failed");
      return false;
    } catch (err: any) {
      this.logResult("Setup", "Login", "FAIL", `Error: ${err.message}`);
      return false;
    }
  }

  async validateContractPaymentLink(): Promise<boolean> {
    console.log("\n\n═══════════════════════════════════════════");
    console.log("SECTION 1: Contract → Payment Linkage");
    console.log("═══════════════════════════════════════════");

    try {
      // Get contracts (use /crm/contracts which is more stable)
      const { status: ctStatus, data: ctData } = await this.fetch("/crm/contracts");
      if (ctStatus !== 200) {
        this.logResult(
          "Contract-Payment",
          "Fetch Contracts",
          "FAIL",
          `Failed to fetch contracts (status: ${ctStatus})`
        );
        return false;
      }

      const contracts = ctData?.data || [];
      if (contracts.length === 0) {
        this.logResult("Contract-Payment", "Fetch Contracts", "WARN", "No contracts found");
        return true;
      }

      console.log(`📋 Found ${contracts.length} contract(s)`);

      // Find contracts with payments
      let contractsWithPayments = 0;
      let totalAmount = 0;

      for (const contract of contracts.slice(0, 5)) {
        const { status: payStatus, data: payData } = await this.fetch(
          `/accounting/payments/by-contract/${contract.id}`
        );

        if (payStatus === 200 && payData?.data) {
          const payments = payData.data;
          if (payments.length > 0) {
            contractsWithPayments++;
            const contractAmount = payments.reduce(
              (sum: number, p: any) => sum + Number(p.totalAmount || 0),
              0
            );
            totalAmount += contractAmount;

            this.logResult(
              "Contract-Payment",
              `Contract ${contract.contractNumber}`,
              "PASS",
              `${payments.length} payment(s) linked (Total: AUD ${contractAmount.toFixed(2)})`,
              {
                contractId: contract.id,
                contractTotal: contract.totalAmount,
                paymentsTotal: contractAmount,
                payments: payments.map((p: any) => ({
                  id: p.id,
                  ref: p.paymentRef,
                  amount: p.totalAmount,
                  status: p.status,
                })),
              }
            );
          }
        }
      }

      console.log(`\n✅ ${contractsWithPayments}/${Math.min(5, contracts.length)} contracts have payments`);
      return contractsWithPayments > 0;
    } catch (err: any) {
      this.logResult(
        "Contract-Payment",
        "Validation",
        "FAIL",
        `Error: ${err.message}`
      );
      return false;
    }
  }

  async validatePaymentTransactionLink(): Promise<boolean> {
    console.log("\n\n═══════════════════════════════════════════");
    console.log("SECTION 2: Payment → Transaction Linkage");
    console.log("═══════════════════════════════════════════");

    try {
      // Get payments
      const { status: payStatus, data: payData } = await this.fetch(
        "/accounting/payments"
      );
      if (payStatus !== 200) {
        this.logResult(
          "Payment-Transaction",
          "Fetch Payments",
          "FAIL",
          `Failed to fetch payments (status: ${payStatus})`
        );
        return false;
      }

      const payments = payData?.data || [];
      if (payments.length === 0) {
        this.logResult("Payment-Transaction", "Fetch Payments", "WARN", "No payments found");
        return true;
      }

      console.log(`📋 Found ${payments.length} payment(s)`);

      let paymentsWithTransactions = 0;

      // Check first 5 payments for transaction linkage
      for (const payment of payments.slice(0, 5)) {
        const { status: txStatus, data: txData } = await this.fetch(
          `/accounting/transactions?paymentRef=${payment.paymentRef}`
        );

        if (txStatus === 200 && txData?.data) {
          const transactions = txData.data;
          if (transactions.length > 0) {
            paymentsWithTransactions++;
            this.logResult(
              "Payment-Transaction",
              `Payment ${payment.paymentRef}`,
              "PASS",
              `${transactions.length} transaction(s) found`,
              {
                paymentId: payment.id,
                paymentAmount: payment.totalAmount,
                transactions: transactions.map((t: any) => ({
                  id: t.id,
                  amount: t.amount,
                  type: t.transactionType,
                  status: t.status,
                })),
              }
            );
          } else {
            this.logResult(
              "Payment-Transaction",
              `Payment ${payment.paymentRef}`,
              "WARN",
              "No transactions linked to payment"
            );
          }
        }
      }

      console.log(
        `\n⚠️ ${paymentsWithTransactions}/${Math.min(5, payments.length)} payments have transactions`
      );
      return paymentsWithTransactions > 0;
    } catch (err: any) {
      this.logResult(
        "Payment-Transaction",
        "Validation",
        "FAIL",
        `Error: ${err.message}`
      );
      return false;
    }
  }

  async validateTransactionJournalLink(): Promise<boolean> {
    console.log("\n\n═══════════════════════════════════════════");
    console.log("SECTION 3: Transaction → Journal Entry Linkage");
    console.log("═══════════════════════════════════════════");

    try {
      // Get transactions (use /transactions which is working)
      const { status: txStatus, data: txData } = await this.fetch(
        "/transactions"
      );
      if (txStatus !== 200) {
        this.logResult(
          "Transaction-Journal",
          "Fetch Transactions",
          "FAIL",
          `Failed to fetch transactions (status: ${txStatus})`
        );
        return false;
      }

      const transactions = txData?.data || [];
      if (transactions.length === 0) {
        this.logResult(
          "Transaction-Journal",
          "Fetch Transactions",
          "WARN",
          "No transactions found"
        );
        return true;
      }

      console.log(`📋 Found ${transactions.length} transaction(s)`);

      let transactionsWithJE = 0;

      // Check first 5 transactions for journal entry linkage
      for (const tx of transactions.slice(0, 5)) {
        const { status: jeStatus, data: jeData } = await this.fetch(
          `/accounting/journal-entries?transactionId=${tx.id}`
        );

        if (jeStatus === 200 && jeData?.data) {
          const journalEntries = jeData.data;
          if (journalEntries.length > 0) {
            transactionsWithJE++;
            this.logResult(
              "Transaction-Journal",
              `Transaction ${tx.id?.substring(0, 8)}...`,
              "PASS",
              `${journalEntries.length} journal entry(ies) auto-generated`,
              {
                transactionId: tx.id,
                amount: tx.amount,
                journalEntries: journalEntries.map((je: any) => ({
                  id: je.id,
                  debit: je.debitAmount,
                  credit: je.creditAmount,
                  debitCoa: je.debitCoaName,
                  creditCoa: je.creditCoaName,
                  status: je.status,
                })),
              }
            );
          } else {
            this.logResult(
              "Transaction-Journal",
              `Transaction ${tx.id?.substring(0, 8)}...`,
              "WARN",
              "No journal entries linked to transaction"
            );
          }
        }
      }

      console.log(
        `\n⚠️ ${transactionsWithJE}/${Math.min(5, transactions.length)} transactions have journal entries`
      );
      return transactionsWithJE > 0;
    } catch (err: any) {
      this.logResult(
        "Transaction-Journal",
        "Validation",
        "FAIL",
        `Error: ${err.message}`
      );
      return false;
    }
  }

  async validateAccountLedger(): Promise<boolean> {
    console.log("\n\n═══════════════════════════════════════════");
    console.log("SECTION 4: Account Ledger Integration");
    console.log("═══════════════════════════════════════════");

    try {
      // Get chart of accounts
      const { status: coaStatus, data: coaData } = await this.fetch(
        "/accounting/coa"
      );
      if (coaStatus !== 200) {
        this.logResult(
          "Account-Ledger",
          "Fetch CoA",
          "FAIL",
          `Failed to fetch chart of accounts (status: ${coaStatus})`
        );
        return false;
      }

      const coaAccounts = coaData?.data || [];
      if (coaAccounts.length === 0) {
        this.logResult("Account-Ledger", "Fetch CoA", "WARN", "No CoA accounts found");
        return true;
      }

      console.log(`📋 Found ${coaAccounts.length} CoA account(s)`);

      let accountsWithLedger = 0;

      // Check first 5 accounts for ledger entries
      for (const account of coaAccounts.slice(0, 5)) {
        const { status: ledgeStatus, data: ledgeData } = await this.fetch(
          `/accounting/ledger/by-account/${account.id}`
        );

        if (ledgeStatus === 200 && ledgeData?.data) {
          const ledgerEntries = ledgeData.data;
          if (ledgerEntries.length > 0) {
            accountsWithLedger++;
            const balance = ledgerEntries.reduce((sum: number, entry: any) => {
              if (account.accountType === "Asset" || account.accountType === "Expense") {
                return sum + (Number(entry.debitAmount || 0) - Number(entry.creditAmount || 0));
              } else {
                return sum + (Number(entry.creditAmount || 0) - Number(entry.debitAmount || 0));
              }
            }, 0);

            this.logResult(
              "Account-Ledger",
              `${account.accountCode} - ${account.accountName}`,
              "PASS",
              `${ledgerEntries.length} ledger entry(ies), Balance: ${balance.toFixed(2)}`,
              {
                accountId: account.id,
                code: account.accountCode,
                type: account.accountType,
                balance: balance.toFixed(2),
                ledgerCount: ledgerEntries.length,
                recentEntries: ledgerEntries.slice(0, 3).map((le: any) => ({
                  date: le.entryDate,
                  debit: le.debitAmount,
                  credit: le.creditAmount,
                  description: le.description,
                })),
              }
            );
          }
        }
      }

      console.log(
        `\n✅ ${accountsWithLedger}/${Math.min(5, coaAccounts.length)} accounts have ledger entries`
      );
      return accountsWithLedger > 0;
    } catch (err: any) {
      this.logResult(
        "Account-Ledger",
        "Validation",
        "FAIL",
        `Error: ${err.message}`
      );
      return false;
    }
  }

  async validateJournalEntryBalance(): Promise<boolean> {
    console.log("\n\n═══════════════════════════════════════════");
    console.log("SECTION 5: Journal Entry Balance Validation");
    console.log("═══════════════════════════════════════════");

    try {
      const { status: jeStatus, data: jeData } = await this.fetch(
        "/accounting/journal-entries?limit=100"
      );
      if (jeStatus !== 200) {
        this.logResult(
          "Journal-Balance",
          "Fetch Entries",
          "FAIL",
          `Failed to fetch journal entries (status: ${jeStatus})`
        );
        return false;
      }

      const journalEntries = jeData?.data || [];
      if (journalEntries.length === 0) {
        this.logResult("Journal-Balance", "Fetch Entries", "WARN", "No journal entries found");
        return true;
      }

      console.log(`📋 Found ${journalEntries.length} journal entry(ies)`);

      // Group by entry ID and check balance
      const entriesMap = new Map<string, any[]>();
      journalEntries.forEach((je: any) => {
        if (!entriesMap.has(je.entryId)) {
          entriesMap.set(je.entryId, []);
        }
        entriesMap.get(je.entryId)!.push(je);
      });

      let balancedEntries = 0;
      const unbalancedEntries = [];

      for (const [entryId, entries] of entriesMap) {
        const totalDebit = entries.reduce(
          (sum: number, e: any) => sum + Number(e.debitAmount || 0),
          0
        );
        const totalCredit = entries.reduce(
          (sum: number, e: any) => sum + Number(e.creditAmount || 0),
          0
        );

        const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;
        if (isBalanced) {
          balancedEntries++;
        } else {
          unbalancedEntries.push({
            entryId,
            debit: totalDebit.toFixed(2),
            credit: totalCredit.toFixed(2),
            difference: (totalDebit - totalCredit).toFixed(2),
          });
        }
      }

      const status = balancedEntries === entriesMap.size ? "PASS" : "FAIL";
      this.logResult(
        "Journal-Balance",
        "Entry Balance Check",
        status,
        `${balancedEntries}/${entriesMap.size} entries are balanced`,
        {
          balancedEntries,
          totalEntries: entriesMap.size,
          unbalancedEntries: unbalancedEntries.slice(0, 3),
        }
      );

      return balancedEntries === entriesMap.size;
    } catch (err: any) {
      this.logResult(
        "Journal-Balance",
        "Validation",
        "FAIL",
        `Error: ${err.message}`
      );
      return false;
    }
  }

  async generateReport() {
    console.log("\n\n╔════════════════════════════════════════════════════════════════╗");
    console.log("║          PAYMENT-LEDGER INTEGRATION VALIDATION REPORT             ║");
    console.log("╚════════════════════════════════════════════════════════════════╝");

    const passCount = results.filter((r) => r.status === "PASS").length;
    const failCount = results.filter((r) => r.status === "FAIL").length;
    const warnCount = results.filter((r) => r.status === "WARN").length;
    const totalTests = results.length;
    const passPercentage = totalTests > 0 ? ((passCount / totalTests) * 100).toFixed(1) : "0.0";

    console.log(`\n📊 SUMMARY`);
    console.log(`   ✅ Passed: ${passCount}/${totalTests}`);
    console.log(`   ❌ Failed: ${failCount}/${totalTests}`);
    console.log(`   ⚠️  Warning: ${warnCount}/${totalTests}`);
    console.log(`   📈 Success Rate: ${passPercentage}%`);

    console.log(`\n📋 DETAILED RESULTS BY SECTION`);
    const groupedBySection = results.reduce(
      (acc, r) => {
        if (!acc[r.section]) acc[r.section] = [];
        acc[r.section].push(r);
        return acc;
      },
      {} as Record<string, ValidationResult[]>
    );

    for (const [section, tests] of Object.entries(groupedBySection)) {
      console.log(`\n   ${section}:`);
      tests.forEach((t) => {
        const icon = t.status === "PASS" ? "✅" : t.status === "FAIL" ? "❌" : "⚠️";
        console.log(`      ${icon} ${t.test}`);
        if (t.message) console.log(`         📝 ${t.message}`);
      });
    }

    console.log(`\n🎯 INTEGRATION ASSESSMENT`);
    if (failCount === 0 && warnCount <= 2) {
      console.log(`   ✨ SYSTEM OPERATING NORMALLY`);
      console.log(`   └─ Contract → Payment → Transaction → Journal Entry → Ledger chain validated`);
    } else if (failCount === 0) {
      console.log(`   ⚠️  MOSTLY OPERATIONAL WITH WARNINGS`);
      console.log(`   └─ ${warnCount} warning(s) detected - review recommended`);
    } else {
      console.log(`   ❌ INTEGRATION ISSUES DETECTED`);
      console.log(`   └─ ${failCount} critical issue(s) require investigation`);
    }

    console.log(`\n═══════════════════════════════════════════════════════════════\n`);
  }

  async runValidation() {
    console.log("╔════════════════════════════════════════════════════════════════╗");
    console.log("║   PAYMENT-LEDGER INTEGRATION VALIDATION                         ║");
    console.log("║   Validate: Contract→Payment→Transaction→Journal→Ledger         ║");
    console.log("╚════════════════════════════════════════════════════════════════╝");

    if (!(await this.login())) {
      console.error("❌ Cannot proceed without authentication");
      process.exit(1);
    }

    await this.validateContractPaymentLink();
    await this.validatePaymentTransactionLink();
    await this.validateTransactionJournalLink();
    await this.validateAccountLedger();
    await this.validateJournalEntryBalance();

    this.generateReport();
  }
}

const validator = new PaymentLedgerValidator();
validator.runValidation().catch((err) => {
  console.error("Validation error:", err);
  process.exit(1);
});
