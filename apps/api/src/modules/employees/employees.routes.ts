import { Router } from "express";
import type { Request, Response } from "express";
import { PERMISSIONS } from "@dbpcms/shared";
import { authenticate } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { asyncHandler } from "../../core/http/async-handler.js";
import { sendList, sendSuccess } from "../../core/http/responses.js";
import { employeesService } from "./employees.service.js";
import {
  educationRouter,
  qualificationRouter,
  historyRouter,
  emergencyRouter,
} from "./subrecords.routes.js";
import { documentsRouter } from "../documents/documents.routes.js";
import { buildEmployeeProfileHtml } from "./profile-print.js";
import { env } from "../../config/env.js";

function actor(req: Request) {
  return {
    userId: req.auth!.userId,
    ipAddress: req.ip ?? null,
    userAgent: req.headers["user-agent"] ?? null,
  };
}

export const employeesRouter = Router();
employeesRouter.use(authenticate);

// Nested sub-record routes (education, qualifications, history, contacts).
employeesRouter.use("/:employeeId/education", educationRouter);
employeesRouter.use("/:employeeId/qualifications", qualificationRouter);
employeesRouter.use("/:employeeId/employment-history", historyRouter);
employeesRouter.use("/:employeeId/emergency-contacts", emergencyRouter);
employeesRouter.use("/:employeeId/documents", documentsRouter);

employeesRouter.get(
  "/",
  requirePermission(PERMISSIONS.EMPLOYEE_READ),
  asyncHandler(async (req: Request, res: Response) => {
    const { items, total, page, pageSize } = await employeesService.list(
      req.query as Record<string, unknown>,
    );
    sendList(res, items, { page, pageSize, totalItems: total });
  }),
);

employeesRouter.get(
  "/:id",
  requirePermission(PERMISSIONS.EMPLOYEE_READ),
  asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await employeesService.getById(req.params.id!));
  }),
);

// Printable A4 profile (HTML with a QR verification code). The browser's print
// dialog turns it into a PDF. Requires the print permission.
employeesRouter.get(
  "/:id/print",
  requirePermission(PERMISSIONS.EMPLOYEE_PRINT),
  asyncHandler(async (req: Request, res: Response) => {
    // Public base URL for the verify link/QR = the first allowed CORS origin.
    const publicBaseUrl = env.CORS_ORIGINS[0] ?? "http://localhost:5173";
    const html = await buildEmployeeProfileHtml(
      req.params.id!,
      publicBaseUrl,
      req.auth!.userId,
    );
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  }),
);

employeesRouter.post(
  "/",
  requirePermission(PERMISSIONS.EMPLOYEE_CREATE),
  asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await employeesService.create(req.body, actor(req)), 201);
  }),
);

employeesRouter.patch(
  "/:id",
  requirePermission(PERMISSIONS.EMPLOYEE_UPDATE),
  asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await employeesService.update(req.params.id!, req.body, actor(req)));
  }),
);

employeesRouter.delete(
  "/:id",
  requirePermission(PERMISSIONS.EMPLOYEE_DELETE),
  asyncHandler(async (req: Request, res: Response) => {
    await employeesService.remove(req.params.id!, actor(req));
    res.status(204).send();
  }),
);
