import { Router } from "express";
import type { Request, Response } from "express";
import { PERMISSIONS } from "@dbpcms/shared";
import { authenticate } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { asyncHandler } from "../../core/http/async-handler.js";
import { sendList, sendSuccess } from "../../core/http/responses.js";
import { academicYearsService } from "./academic-years.service.js";

function actor(req: Request) {
  return {
    userId: req.auth!.userId,
    ipAddress: req.ip ?? null,
    userAgent: req.headers["user-agent"] ?? null,
  };
}

export const academicYearsRouter = Router();
academicYearsRouter.use(authenticate);

// Reading academic years is allowed to anyone who can read programs/departments.
academicYearsRouter.get(
  "/",
  requirePermission(PERMISSIONS.PROGRAM_READ),
  asyncHandler(async (req: Request, res: Response) => {
    const { items, total, page, pageSize } = await academicYearsService.list(
      req.query as Record<string, unknown>,
    );
    sendList(res, items, { page, pageSize, totalItems: total });
  }),
);

academicYearsRouter.post(
  "/",
  requirePermission(PERMISSIONS.ACADEMIC_YEAR_MANAGE),
  asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await academicYearsService.create(req.body, actor(req)), 201);
  }),
);

academicYearsRouter.post(
  "/:id/set-current",
  requirePermission(PERMISSIONS.ACADEMIC_YEAR_MANAGE),
  asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await academicYearsService.setCurrent(req.params.id!, actor(req)));
  }),
);

academicYearsRouter.delete(
  "/:id",
  requirePermission(PERMISSIONS.ACADEMIC_YEAR_MANAGE),
  asyncHandler(async (req: Request, res: Response) => {
    await academicYearsService.remove(req.params.id!, actor(req));
    res.status(204).send();
  }),
);
