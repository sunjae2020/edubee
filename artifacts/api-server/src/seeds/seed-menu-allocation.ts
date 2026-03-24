import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const CATEGORIES = [
  { name: "DASHBOARD",    sort_order: 1  },
  { name: "CRM",          sort_order: 2  },
  { name: "SALES",        sort_order: 3  },
  { name: "CAMP",         sort_order: 4  },
  { name: "SERVICES",     sort_order: 5  },
  { name: "PRODUCTS",     sort_order: 6  },
  { name: "FINANCE",      sort_order: 7  },
  { name: "REPORTS",      sort_order: 8  },
  { name: "AI ASSISTANT", sort_order: 9  },
  { name: "ADMIN",        sort_order: 10 },
  { name: "SETTINGS",     sort_order: 11 },
];

const ITEMS_BY_CATEGORY: Record<string, { name: string; route_key: string; icon_name: string; sort_order: number }[]> = {
  DASHBOARD: [
    { name: "Dashboard",         route_key: "dashboard",         icon_name: "LayoutDashboard", sort_order: 1 },
  ],
  CRM: [
    { name: "Contacts",          route_key: "crm-contacts",      icon_name: "Users",           sort_order: 1 },
    { name: "Accounts",          route_key: "crm-accounts",      icon_name: "Building2",       sort_order: 2 },
    { name: "Leads",             route_key: "crm-leads",         icon_name: "Target",          sort_order: 3 },
    { name: "Quotes",            route_key: "crm-quotes",        icon_name: "FileText",        sort_order: 4 },
    { name: "Contracts",         route_key: "crm-contracts",     icon_name: "FileCheck",       sort_order: 5 },
    { name: "Tasks & CS",        route_key: "tasks-cs",          icon_name: "Ticket",          sort_order: 6 },
  ],
  SALES: [
    { name: "Applications",      route_key: "applications",      icon_name: "ClipboardList",   sort_order: 1 },
    { name: "Documents",         route_key: "documents",         icon_name: "FolderOpen",      sort_order: 2 },
  ],
  CAMP: [
    { name: "Package Groups",    route_key: "package-groups",    icon_name: "Layers",          sort_order: 1 },
    { name: "Packages",          route_key: "packages",          icon_name: "Package",         sort_order: 2 },
    { name: "Enrollment Spots",  route_key: "enrollment-spots",  icon_name: "ListChecks",      sort_order: 3 },
    { name: "Camp Application",  route_key: "camp-applications", icon_name: "ClipboardList",   sort_order: 4 },
    { name: "Camp Contract",     route_key: "camp-contracts",    icon_name: "FileText",        sort_order: 5 },
    { name: "Institute / Study", route_key: "camp-institute",    icon_name: "GraduationCap",   sort_order: 6 },
    { name: "Hotel",             route_key: "camp-hotel",        icon_name: "Hotel",           sort_order: 7 },
    { name: "Pickup / Transfer", route_key: "camp-pickup",       icon_name: "Car",             sort_order: 8 },
    { name: "Tour",              route_key: "camp-tour",         icon_name: "Map",             sort_order: 9 },
    { name: "Interviews",        route_key: "camp-interviews",   icon_name: "CalendarCheck",   sort_order: 10 },
  ],
  SERVICES: [
    { name: "Study Abroad",      route_key: "study-abroad",      icon_name: "GraduationCap",   sort_order: 1 },
    { name: "Pickup / Transfer", route_key: "pickup",            icon_name: "Car",             sort_order: 2 },
    { name: "Accommodation",     route_key: "accommodation",     icon_name: "Building2",       sort_order: 3 },
    { name: "Internship",        route_key: "internship",        icon_name: "Briefcase",       sort_order: 4 },
    { name: "Guardian",          route_key: "guardian",          icon_name: "Shield",          sort_order: 5 },
    { name: "Settlement",        route_key: "settlement",        icon_name: "FileCheck",       sort_order: 6 },
    { name: "Other Services",    route_key: "other-services",    icon_name: "Wrench",          sort_order: 7 },
  ],
  PRODUCTS: [
    { name: "Products Group",    route_key: "product-groups",    icon_name: "Layers",          sort_order: 1 },
    { name: "Products Type",     route_key: "product-types",     icon_name: "Tag",             sort_order: 2 },
    { name: "Products",          route_key: "products",          icon_name: "ShoppingBag",     sort_order: 3 },
    { name: "Promotion",         route_key: "promotions",        icon_name: "Percent",         sort_order: 4 },
    { name: "Commission",        route_key: "commissions",       icon_name: "BadgeDollarSign", sort_order: 5 },
  ],
  FINANCE: [
    { name: "Invoices",          route_key: "invoices",          icon_name: "Receipt",         sort_order: 1 },
    { name: "Receipts",          route_key: "receipts",          icon_name: "FileCheck",       sort_order: 2 },
    { name: "Payments",          route_key: "payments",          icon_name: "CreditCard",      sort_order: 3 },
    { name: "Transactions",      route_key: "transactions",      icon_name: "ArrowLeftRight",  sort_order: 4 },
    { name: "AR / AP Tracker",   route_key: "ar-ap",             icon_name: "ArrowLeftRight",  sort_order: 5 },
    { name: "Journal Entries",   route_key: "journal",           icon_name: "BookMarked",      sort_order: 6 },
    { name: "Tax Invoices",      route_key: "tax-invoices",      icon_name: "FileText",        sort_order: 7 },
    { name: "Chart of Accounts", route_key: "coa",               icon_name: "BookOpen",        sort_order: 8 },
    { name: "Exchange Rates",    route_key: "exchange-rates",    icon_name: "RefreshCw",       sort_order: 9 },
  ],
  REPORTS: [
    { name: "Program Reports",   route_key: "reports",           icon_name: "BarChart2",       sort_order: 1 },
  ],
  "AI ASSISTANT": [
    { name: "AI Chatbot",        route_key: "chatbot",           icon_name: "Bot",             sort_order: 1 },
  ],
  ADMIN: [
    { name: "Users",             route_key: "users",             icon_name: "UserCog",         sort_order: 1 },
  ],
  SETTINGS: [
    { name: "General",           route_key: "settings-general",   icon_name: "Settings",       sort_order: 1 },
    { name: "Page Access",       route_key: "page-access",        icon_name: "Lock",           sort_order: 2 },
    { name: "Field Permissions", route_key: "field-permissions",  icon_name: "Grid2x2",        sort_order: 3 },
    { name: "Doc Permissions",   route_key: "doc-permissions",    icon_name: "FileSearch",     sort_order: 4 },
    { name: "Impersonation Logs",route_key: "impersonation-logs", icon_name: "UserSearch",     sort_order: 5 },
    { name: "Data Manager",      route_key: "data-manager",       icon_name: "FolderOpen",     sort_order: 6 },
  ],
};

export async function seedMenuAllocation() {
  try {
    const existing = await db.execute(sql`
      SELECT COUNT(*) AS count FROM menu_categories WHERE status = 'Active'
    `);
    const count = Number((existing.rows[0] as any).count);

    if (count >= 11) {
      console.log(`[MenuSeed] ${count} categories already exist — skipping`);
      return;
    }

    console.log("[MenuSeed] Seeding menu categories and items…");

    await db.execute(sql`UPDATE menu_categories SET status = 'Inactive', modified_on = NOW()`);
    await db.execute(sql`UPDATE menu_items SET status = 'Inactive', modified_on = NOW()`);

    for (const cat of CATEGORIES) {
      const catResult = await db.execute(sql`
        INSERT INTO menu_categories (name, sort_order)
        VALUES (${cat.name}, ${cat.sort_order})
        RETURNING id
      `);
      const catId = (catResult.rows[0] as any).id as string;

      const items = ITEMS_BY_CATEGORY[cat.name] ?? [];
      for (const item of items) {
        await db.execute(sql`
          INSERT INTO menu_items (category_id, name, route_key, icon_name, sort_order)
          VALUES (${catId}, ${item.name}, ${item.route_key}, ${item.icon_name}, ${item.sort_order})
        `);
      }
    }

    const total = Object.values(ITEMS_BY_CATEGORY).reduce((s, arr) => s + arr.length, 0);
    console.log(`[MenuSeed] Seeded ${CATEGORIES.length} categories, ${total} items`);
  } catch (err) {
    console.error("[MenuSeed] Error:", err);
  }
}
