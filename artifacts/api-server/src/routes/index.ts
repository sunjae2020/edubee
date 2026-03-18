import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import usersRouter from "./users.js";
import packagesRouter from "./packages.js";
import applicationsRouter from "./applications.js";
import contractsRouter from "./contracts.js";
import financeRouter from "./finance.js";
import dashboardRouter from "./dashboard.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/users", usersRouter);
router.use(packagesRouter);
router.use(applicationsRouter);
router.use(contractsRouter);
router.use(financeRouter);
router.use(dashboardRouter);

export default router;
