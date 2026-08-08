import { Router } from "express";
import type { Request, Response } from "express";
import multer from "multer";
import { PERMISSIONS, MAX_UPLOAD_BYTES } from "@dbpcms/shared";
import { authenticate } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { asyncHandler } from "../../core/http/async-handler.js";
import { sendSuccess } from "../../core/http/responses.js";
import { documentsService } from "./documents.service.js";

/**
 * Document routes, nested under /employees/:employeeId/documents.
 * Files are received into memory (multer memoryStorage) so the file-processor
 * can validate/compress them before they ever touch disk.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES + 1024 }, // hard cap; precise check in processor
});

function actor(req: Request) {
  return {
    userId: req.auth!.userId,
    ipAddress: req.ip ?? null,
    userAgent: req.headers["user-agent"] ?? null,
  };
}

export const documentsRouter = Router({ mergeParams: true });
documentsRouter.use(authenticate);

documentsRouter.get(
  "/",
  requirePermission(PERMISSIONS.DOCUMENT_READ),
  asyncHandler(async (req: Request, res: Response) => {
    const items = await documentsService.listForEmployee(req.params.employeeId!);
    sendSuccess(res, items);
  }),
);

documentsRouter.post(
  "/",
  requirePermission(PERMISSIONS.DOCUMENT_UPLOAD),
  upload.single("file"),
  asyncHandler(async (req: Request, res: Response) => {
    const created = await documentsService.upload(
      req.params.employeeId!,
      req.body.documentType,
      req.file,
      actor(req),
    );
    sendSuccess(res, created, 201);
  }),
);

documentsRouter.get(
  "/:documentId/download",
  requirePermission(PERMISSIONS.DOCUMENT_READ),
  asyncHandler(async (req: Request, res: Response) => {
    const { data, mimeType, filename } = await documentsService.getFile(
      req.params.employeeId!,
      req.params.documentId!,
    );
    res.setHeader("Content-Type", mimeType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(filename)}"`,
    );
    res.send(data);
  }),
);

documentsRouter.delete(
  "/:documentId",
  requirePermission(PERMISSIONS.DOCUMENT_DELETE),
  asyncHandler(async (req: Request, res: Response) => {
    await documentsService.remove(
      req.params.employeeId!,
      req.params.documentId!,
      actor(req),
    );
    res.status(204).send();
  }),
);
