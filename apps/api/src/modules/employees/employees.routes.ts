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
import multer from "multer";
import { documentsRouter } from "../documents/documents.routes.js";
import { buildEmployeeProfileHtml } from "./profile-print.js";
import { photoService } from "./photo.service.js";
import { publicAppUrl } from "../../config/env.js";

const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 + 1024 },
});

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

// Employee portrait photo: upload (multipart), fetch, and remove.
employeesRouter.get(
  "/:id/photo",
  requirePermission(PERMISSIONS.EMPLOYEE_READ),
  asyncHandler(async (req: Request, res: Response) => {
    const { data, mimeType } = await photoService.getPhoto(req.params.id!);
    res.setHeader("Content-Type", mimeType);
    res.setHeader("Cache-Control", "private, max-age=60");
    res.send(data);
  }),
);
employeesRouter.post(
  "/:id/photo",
  requirePermission(PERMISSIONS.EMPLOYEE_UPDATE),
  photoUpload.single("file"),
  asyncHandler(async (req: Request, res: Response) => {
    await photoService.upload(req.params.id!, req.file, {
      userId: req.auth!.userId,
      ipAddress: req.ip ?? null,
      userAgent: req.headers["user-agent"] ?? null,
    });
    sendSuccess(res, { uploaded: true }, 201);
  }),
);
employeesRouter.delete(
  "/:id/photo",
  requirePermission(PERMISSIONS.EMPLOYEE_UPDATE),
  asyncHandler(async (req: Request, res: Response) => {
    await photoService.remove(req.params.id!, {
      userId: req.auth!.userId,
      ipAddress: req.ip ?? null,
      userAgent: req.headers["user-agent"] ?? null,
    });
    res.status(204).send();
  }),
);

// Printable A4 profile (HTML with a QR verification code). The browser's print
// dialog turns it into a PDF. Requires the print permission.
employeesRouter.get(
  "/:id/print",
  requirePermission(PERMISSIONS.EMPLOYEE_PRINT),
  asyncHandler(async (req: Request, res: Response) => {
    // Public base URL for the verify link/QR = the deployment's real public URL
    // (auto-detected on Render, configurable via PUBLIC_APP_URL). Never localhost
    // in production, so scanned QR codes resolve on any device.
    const html = await buildEmployeeProfileHtml(
      req.params.id!,
      publicAppUrl,
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
