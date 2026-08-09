import { Router } from "express";
import { healthRouter } from "./modules/health/health.routes.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { departmentsRouter } from "./modules/departments/departments.routes.js";
import { programsRouter } from "./modules/programs/programs.routes.js";
import { academicYearsRouter } from "./modules/academic-years/academic-years.routes.js";
import { semestersRouter } from "./modules/semesters/semesters.routes.js";
import { usersRouter } from "./modules/users/users.routes.js";
import { auditLogsRouter } from "./modules/audit-logs/audit-logs.routes.js";
import { employeesRouter } from "./modules/employees/employees.routes.js";
import { settingsRouter } from "./modules/settings/settings.routes.js";
import { reportsRouter } from "./modules/reports/reports.routes.js";
import { verificationRouter } from "./modules/verification/verification.routes.js";
import { studentsRouter } from "./modules/students/students.routes.js";
import { coursesRouter } from "./modules/courses/courses.routes.js";
import { sectionsRouter } from "./modules/sections/sections.routes.js";
import { gradingConfigRouter } from "./modules/grading-config/grading-config.routes.js";
import { gradesRouter } from "./modules/grades/grades.routes.js";
import { dashboardRouter } from "./modules/dashboard/dashboard.routes.js";
import { transcriptsRouter } from "./modules/transcripts/transcripts.routes.js";
import { searchRouter } from "./modules/search/search.routes.js";

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
apiV1Router.use("/employees", employeesRouter);
apiV1Router.use("/settings", settingsRouter);
apiV1Router.use("/reports", reportsRouter);
apiV1Router.use("/students", studentsRouter);
apiV1Router.use("/courses", coursesRouter);
apiV1Router.use("/sections", sectionsRouter);
apiV1Router.use("/grading-config", gradingConfigRouter);
apiV1Router.use("/grades", gradesRouter);
apiV1Router.use("/dashboard", dashboardRouter);
apiV1Router.use("/transcripts", transcriptsRouter);
apiV1Router.use("/search", searchRouter);
// Public (no auth) verification lookup.
apiV1Router.use("/verify", verificationRouter);

// Future modules will be mounted here, e.g.:
// apiV1Router.use("/employees", employeeRouter);
