import { Router } from "express";
import { healthRouter } from "./modules/health/health.routes.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { departmentsRouter } from "./modules/departments/departments.routes.js";
import { programsRouter } from "./modules/programs/programs.routes.js";
import { academicYearsRouter } from "./modules/academic-years/academic-years.routes.js";
import { semestersRouter } from "./modules/semesters/semesters.routes.js";
import { usersRouter } from "./modules/users/users.routes.js";
import { auditLogsRouter } from "./modules/audit-logs/audit-logs.routes.js";

/**
 * The API v1 router. Every module registers its routes here under /api/v1.
 * As we build features, each new module adds one line below.
 */
export const apiV1Router = Router();

apiV1Router.use("/health", healthRouter);
apiV1Router.use("/auth", authRouter);
apiV1Router.use("/departments", departmentsRouter);
apiV1Router.use("/programs", programsRouter);
apiV1Router.use("/academic-years", academicYearsRouter);
apiV1Router.use("/semesters", semestersRouter);
apiV1Router.use("/users", usersRouter);
apiV1Router.use("/audit-logs", auditLogsRouter);

// Future modules will be mounted here, e.g.:
// apiV1Router.use("/employees", employeeRouter);
