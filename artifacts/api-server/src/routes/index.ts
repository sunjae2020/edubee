import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import storageRouter from "./storage.js";
import authRouter from "./auth.js";
import usersRouter from "./users.js";
import packagesRouter from "./packages.js";
import applicationsRouter from "./applications.js";
import contractsRouter from "./contracts.js";
import financeRouter from "./finance.js";
import dashboardRouter from "./dashboard.js";
import publicRouter from "./public.js";
import servicesRouter from "./services.js";
import myAccountingRouter from "./my-accounting.js";
import reportsRouter from "./reports.js";
import notificationsRouter from "./notifications.js";
import tasksRouter from "./tasks.js";
import notesRouter from "./notes.js";
import dataManagerRouter from "./data-manager.js";
import ledgerRouter from "./ledger.js";
import documentsRouter from "./documents.js";
import settingsRouter from "./settings.js";
import settingsLookupsRouter from "./settings-lookups.js";
import chatbotRouter from "./chatbot.js";
import aiRouter from "./ai.js";
import contractFinanceRouter from "./contract-finance.js";
import contractSigningRouter from "./contract-signing.js";
import crmContactsRouter from "./crm-contacts.js";
import crmLeadsRouter from "./crm-leads.js";
import crmQuotesRouter from "./crm-quotes.js";
import accountingCoaRouter from "./accounting-coa.js";
import accountingArApRouter from "./accounting-arap.js";
import accountingPaymentsRouter from "./accounting-payments.js";
import servicesStudyAbroadRouter from "./services-study-abroad.js";
import servicesAccommodationRouter from "./services-accommodation.js";
import servicesPickupRouter from "./services-pickup.js";
import servicesInternshipRouter from "./services-internship.js";
import servicesGuardianRouter from "./services-guardian.js";
import servicesOtherRouter from "./services-other.js";
import servicesVisaRouter from "./services-visa.js";
import servicesTourRouter from "./services-tour.js";
import campApplicationsRouter from "./camp-applications.js";
import campServicesRouter from "./camp-services.js";
import campCoordinatorsRouter from "./camp-coordinators.js";
import campPhotosRouter from "./camp-photos.js";
import dashboardCrmRouter from "./dashboard-crm.js";
import dashboardV2Router from "./dashboard-v2.js";
import crmAccountsRouter from "./crm-accounts.js";
import productCatalogRouter from "./product-catalog.js";
import accountingTransactionsRouter from "./accounting-transactions.js";
import quoteProductsRouter from "./quote-products.js";
import crmContractsRouter from "./crm-contracts.js";
import paymentHeadersRouter from "./payment-headers.js";
import paymentLinesRouter from "./payment-lines.js";
import journalEntriesRouter from "./journal-entries.js";
import invoicesRouter from "./invoices.js";
import taxInvoicesRouter from "./tax-invoices.js";
import statementsRouter from "./statements.js";
import menuAllocationRouter from "./menu-allocation.js";
import accountServiceProfilesRouter from "./account-service-profiles.js";
import costLinesRouter from "./cost-lines.js";
import allApplicationsRouter from "./all-applications.js";
import teamsRouter from "./teams.js";
import kpiRouter from "./kpi.js";
import applicationFormsRouter from "./application-forms.js";
import tenantSettingsRouter from "./tenant-settings.js";
import superAdminRouter from "./superadmin.js";
import platformPlansRouter from "./platformPlans.js";
import platformCrmRouter from "./platform-crm.js";
import adminDataImportRouter from "./admin-data-import.js";
import platformIntegrationsRouter from "./platform-integrations.js";
import portalRouter from "./portal.js";
import privacyRouter from "./privacy.js";
import myDataRouter from "./my-data.js";
import securityIncidentsRouter from "./security-incidents.js";
import communityRouter from "./community.js";
import schoolingConsultationsRouter from "./schooling-consultations.js";
import studyAbroadConsultationsRouter from "./study-abroad-consultations.js";
import generalConsultationsRouter from "./general-consultations.js";
import publicConsultationsRouter from "./public-consultations.js";
import airtableRouter from "./airtable.js";
import googleDriveRouter from "./google-drive.js";
import { tenantResolver } from "../middleware/tenantResolver.js";
import { runWithTenantSchema, tenantSchemaExists, pool } from "@workspace/db";
import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const router: IRouter = Router();

router.use(healthRouter);
router.use(storageRouter);
router.use(publicConsultationsRouter);
// ── Tenant resolver: reads X-Organisation-Id header → req.tenantId / req.tenant ──
router.use(tenantResolver);
// ── Tenant Schema middleware ────────────────────────────────────────────────────
// Runs after tenantResolver. If the tenant's PostgreSQL schema exists,
// the request is executed in an AsyncLocalStorage context → all db queries use the tenant schema.
//
// camp_coordinator exception: CC users must read data from the OWNER schema of the delegated PG.
// • Direct login (CC JWT): switch to owner schema
// • View-As (admin → CC): switch to owner schema of the View-As target CC
router.use(async (req: Request, res: Response, next: NextFunction) => {
  const subdomain = (req as any).tenant?.subdomain as string | undefined;
  if (!subdomain) return next();
  try {
    // Detect camp_coordinator (direct login or role View-As)
    const JWT_SECRET = process.env.JWT_SECRET;
    const authHeader = req.headers.authorization;
    let ccOrgId: string | null = null;

    if (JWT_SECRET && authHeader?.startsWith("Bearer ")) {
      try {
        const decoded = jwt.verify(authHeader.split(" ")[1], JWT_SECRET) as any;
        const viewAsRole = req.headers["x-view-as-role"] as string | undefined;

        if (decoded.role === "camp_coordinator") {
          // Direct CC login
          ccOrgId = decoded.organisationId ?? null;
        } else if (viewAsRole === "camp_coordinator") {
          // Role View-As: admin previewing CC perspective — use their own org's CC delegations
          ccOrgId = decoded.organisationId ?? null;
        }
      } catch { /* invalid JWT — let auth middleware handle */ }
    }

    if (ccOrgId) {
      // Find the owner schema for this CC's delegated package groups
      const ownerRes = await pool.query<{ subdomain: string }>(
        `SELECT DISTINCT o.subdomain
         FROM public.package_group_coordinators pgc
         JOIN public.package_groups pg ON pg.id = pgc.package_group_id
         JOIN public.organisations o ON o.id = pg.organisation_id
         WHERE pgc.coordinator_org_id = $1 AND pgc.status = 'Active' AND pgc.revoked_at IS NULL
         LIMIT 1`,
        [ccOrgId]
      );
      const ownerSlug = ownerRes.rows[0]?.subdomain;
      if (ownerSlug) {
        const ownerSchemaExists = await tenantSchemaExists(ownerSlug, pool);
        if (ownerSchemaExists) {
          runWithTenantSchema(ownerSlug, next);
          return;
        }
      }
    }

    const schemaExists = await tenantSchemaExists(subdomain, pool);
    if (schemaExists) {
      runWithTenantSchema(subdomain, next);
    } else {
      next();
    }
  } catch {
    next();
  }
});
// ── Public settings route (theme, no auth) — registered early before auth-guarded routers ──
router.use("/settings", tenantSettingsRouter);
router.use("/auth", authRouter);
router.use(portalRouter);
router.use(privacyRouter);
router.use(myDataRouter);
router.use(securityIncidentsRouter);
router.use(communityRouter);
router.use("/users", usersRouter);
router.use(campCoordinatorsRouter);
router.use(packagesRouter);
router.use(applicationsRouter);
router.use(contractsRouter);
router.use(financeRouter);
router.use(dashboardRouter);
router.use(publicRouter);
router.use(servicesRouter);
router.use(myAccountingRouter);
router.use(reportsRouter);
router.use(notificationsRouter);
router.use(tasksRouter);
router.use(notesRouter);
router.use("/data-manager", dataManagerRouter);
router.use(ledgerRouter);
router.use(documentsRouter);
router.use("/settings", settingsRouter);
router.use(settingsLookupsRouter);
router.use(chatbotRouter);
router.use(aiRouter);
router.use(contractFinanceRouter);
router.use("/contract-signing", contractSigningRouter);
router.use(crmContactsRouter);
router.use(crmLeadsRouter);
router.use(crmQuotesRouter);
router.use(accountingCoaRouter);
router.use(accountingArApRouter);
router.use(accountingPaymentsRouter);
router.use(servicesStudyAbroadRouter);
router.use(servicesAccommodationRouter);
router.use(servicesPickupRouter);
router.use(servicesInternshipRouter);
router.use(servicesGuardianRouter);
router.use(servicesOtherRouter);
router.use(servicesVisaRouter);
router.use(servicesTourRouter);
router.use(campApplicationsRouter);
router.use(campServicesRouter);
router.use(dashboardCrmRouter);
router.use(dashboardV2Router);
router.use(crmAccountsRouter);
router.use(productCatalogRouter);
router.use(accountingTransactionsRouter);
router.use(quoteProductsRouter);
router.use(crmContractsRouter);
router.use(paymentHeadersRouter);
router.use(paymentLinesRouter);
router.use(journalEntriesRouter);
router.use("/invoices", invoicesRouter);
router.use(taxInvoicesRouter);
router.use(statementsRouter);
router.use(menuAllocationRouter);
router.use(accountServiceProfilesRouter);
router.use(costLinesRouter);
router.use(allApplicationsRouter);
router.use(teamsRouter);
router.use("/kpi", kpiRouter);
router.use(applicationFormsRouter);
router.use(superAdminRouter);
router.use(platformPlansRouter);
router.use(platformCrmRouter);
router.use(platformIntegrationsRouter);
router.use("/admin", adminDataImportRouter);
router.use(campPhotosRouter);
router.use(schoolingConsultationsRouter);
router.use(studyAbroadConsultationsRouter);
router.use(generalConsultationsRouter);
router.use(airtableRouter);
router.use(googleDriveRouter);

export default router;
