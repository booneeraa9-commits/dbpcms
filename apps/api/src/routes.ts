import { Router } from "express";
import { healthRouter } from "./modules/health/health.routes.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { departmentsRouter } from "./modules/departments/departments.routes.js";

/**
 * The API v1 router. Every module registers its routes here under /api/v1.
 * As we build features, each new module adds one line below.
 */
export const apiV1Router = Router();

apiV1Router.use("/health", healthRouter);
apiV1Router.use("/auth", authRouter);
apiV1Router.use("/departments", departmentsRouter);

// Future modules will be mounted here, e.g.:
// apiV1Router.use("/employees", employeeRouter);
