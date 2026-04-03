const BASE_URL = "http://localhost:8080/api";
const ADMIN_EMAIL = "admin@edubee.co";
const ADMIN_PASSWORD = "Admin123!";

interface InvoiceConfig {
  category: "Client" | "Agent" | "Partner";
  description: string;
  amount: number;
}

class InvoiceGenerator {
  private token: string = "";
  private contracts: any[] = [];
  private users: any[] = [];
  private createdInvoices: any[] = [];

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
      console.log("✅ Authentication successful");
      return true;
    }
    console.error("❌ Authentication failed");
    return false;
  }

  async fetchData(): Promise<boolean> {
    console.log("\n📦 Fetching existing data...");

    // Fetch contracts
    const { data: contractsData } = await this.fetch("/contracts?limit=10");
    this.contracts = contractsData?.data || [];
    console.log(`   ✅ Found ${this.contracts.length} contracts`);

    // Use hardcoded users from known system
    this.users = [
      { id: "639154e0-0f35-4e3b-a7c5-ee458b205fa1", email: "admin@edubee.co" },
      { id: "f58594ec-d245-4cdb-88c0-28ccaefef287", email: "driver@pickup.com" },
      { id: "43d1c3f8-ca37-4f4d-9602-04704b8c1651", email: "coord1@edubee.co" },
    ];
    console.log(`   ✅ Found ${this.users.length} users`);

    this.users.forEach((u: any) => {
      console.log(`      - ${u.email}`);
    });

    return this.contracts.length > 0 && this.users.length > 0;
  }

  async createInvoice(
    category: "Client" | "Agent" | "Partner",
    index: number,
    contractId: string,
    recipientId: string,
    amount: number
  ): Promise<boolean> {
    const categoryLabels = {
      Client: "Client Invoice",
      Agent: "Agent Invoice",
      Partner: "Partner Invoice",
    };

    const taxAmount = Math.round(amount * 0.1 * 100) / 100;
    const invoiceData = {
      invoiceNumber: `INV-${category.toUpperCase()}-${Date.now()}-${index}`,
      contractId,
      recipientId,
      invoiceType: category.toLowerCase(),
      totalAmount: amount,
      taxAmount: taxAmount,
      status: "draft",
      issuedAt: new Date().toISOString(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      notes: `Sample ${categoryLabels[category]} for testing purposes`,
    };

    const { status, data } = await this.fetch("/invoices", {
      method: "POST",
      body: JSON.stringify(invoiceData),
    });

    if (status === 201) {
      this.createdInvoices.push({
        category,
        invoiceNumber: data.invoiceNumber,
        id: data.id,
        amount,
      });
      console.log(
        `   ✅ Created ${category} Invoice #${index}: ${data.invoiceNumber} (AUD $${amount})`
      );
      return true;
    } else {
      console.error(
        `   ❌ Failed to create ${category} Invoice #${index}: ${data?.error || "Unknown error"}`
      );
      return false;
    }
  }

  async generateSampleInvoices(): Promise<void> {
    console.log(
      "\n════════════════════════════════════════════════════════════════"
    );
    console.log("  📋 GENERATING SAMPLE INVOICES");
    console.log("  Categories: Client (3), Agent (3), Partner (3)");
    console.log(
      "════════════════════════════════════════════════════════════════\n"
    );

    const configs: InvoiceConfig[] = [
      // CLIENT INVOICES (학생/고객 대상)
      {
        category: "Client",
        description: "Study Abroad Program - Client Invoice",
        amount: 5000,
      },
      {
        category: "Client",
        description: "English Course Package - Client Invoice",
        amount: 3500,
      },
      {
        category: "Client",
        description: "Summer Camp Program - Client Invoice",
        amount: 4200,
      },

      // AGENT INVOICES (에이전트 대상)
      {
        category: "Agent",
        description: "Agent Commission - Study Abroad Program",
        amount: 1000,
      },
      {
        category: "Agent",
        description: "Agent Commission - English Course",
        amount: 700,
      },
      {
        category: "Agent",
        description: "Agent Commission - Summer Camp",
        amount: 840,
      },

      // PARTNER INVOICES (파트너/공급사 대상)
      {
        category: "Partner",
        description: "Partner Service Fee - Accommodation",
        amount: 1500,
      },
      {
        category: "Partner",
        description: "Partner Service Fee - Transportation",
        amount: 800,
      },
      {
        category: "Partner",
        description: "Partner Service Fee - Activities",
        amount: 600,
      },
    ];

    let successCount = 0;
    let currentIndex = { Client: 1, Agent: 1, Partner: 1 };

    for (const config of configs) {
      // Rotate through contracts
      const contractIndex = configs.indexOf(config) % this.contracts.length;
      const contract = this.contracts[contractIndex];

      // Determine recipient based on category - rotate through users
      const userIndex = configs.indexOf(config) % this.users.length;
      const recipientId = this.users[userIndex].id;

      const success = await this.createInvoice(
        config.category,
        currentIndex[config.category],
        contract.id,
        recipientId,
        config.amount
      );

      if (success) successCount++;
      currentIndex[config.category]++;
    }

    // Summary
    console.log(
      "\n════════════════════════════════════════════════════════════════"
    );
    console.log("  📊 SUMMARY");
    console.log(
      "════════════════════════════════════════════════════════════════\n"
    );

    console.log(`✅ Total created: ${successCount}/${configs.length}`);
    console.log(`\n📋 Created Invoices:`);

    const byCategory = {
      Client: this.createdInvoices.filter((i) => i.category === "Client"),
      Agent: this.createdInvoices.filter((i) => i.category === "Agent"),
      Partner: this.createdInvoices.filter((i) => i.category === "Partner"),
    };

    console.log(`\n   👥 Client Invoices (${byCategory.Client.length}):`);
    byCategory.Client.forEach((inv) => {
      console.log(`      • ${inv.invoiceNumber} - AUD $${inv.amount}`);
    });

    console.log(`\n   🤝 Agent Invoices (${byCategory.Agent.length}):`);
    byCategory.Agent.forEach((inv) => {
      console.log(`      • ${inv.invoiceNumber} - AUD $${inv.amount}`);
    });

    console.log(`\n   🏢 Partner Invoices (${byCategory.Partner.length}):`);
    byCategory.Partner.forEach((inv) => {
      console.log(`      • ${inv.invoiceNumber} - AUD $${inv.amount}`);
    });

    console.log(
      "\n════════════════════════════════════════════════════════════════\n"
    );

    if (successCount === configs.length) {
      console.log("✨ All invoices generated successfully!");
    } else {
      console.log(
        `⚠️  ${configs.length - successCount} invoice(s) failed to create`
      );
    }
  }

  async run(): Promise<void> {
    if (!(await this.login())) {
      process.exit(1);
    }

    if (!(await this.fetchData())) {
      console.error("❌ Failed to fetch required data");
      process.exit(1);
    }

    await this.generateSampleInvoices();
  }
}

const generator = new InvoiceGenerator();
generator.run().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
