import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
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

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/users", usersRouter);
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

export default router;
