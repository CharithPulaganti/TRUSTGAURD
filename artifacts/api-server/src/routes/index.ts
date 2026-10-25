import { Router, type IRouter } from "express";
import healthRouter from "./health";
import trustguardRouter, { trustguardErrorHandler } from "./trustguard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(trustguardRouter);
router.use(trustguardErrorHandler);

export default router;
