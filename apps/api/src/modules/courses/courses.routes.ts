import { Router } from "express";
import type { Request, Response } from "express";
import { PERMISSIONS } from "@dbpcms/shared";
import { authenticate } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { asyncHandler } from "../../core/http/async-handler.js";
import { sendList, sendSuccess } from "../../core/http/responses.js";
import { coursesService } from "./courses.service.js";

function actor(req: Request) {
  return { userId: req.auth!.userId, ipAddress: req.ip ?? null, userAgent: req.headers["user-agent"] ?? null };
}

export const coursesRouter = Router();
coursesRouter.use(authenticate);

coursesRouter.get("/", requirePermission(PERMISSIONS.COURSE_MANAGE), asyncHandler(async (req: Request, res: Response) => {
  const { items, total, page, pageSize } = await coursesService.list(req.query as Record<string, unknown>);
  sendList(res, items, { page, pageSize, totalItems: total });
}));
coursesRouter.post("/", requirePermission(PERMISSIONS.COURSE_MANAGE), asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, await coursesService.create(req.body, actor(req)), 201);
}));
coursesRouter.patch("/:id", requirePermission(PERMISSIONS.COURSE_MANAGE), asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, await coursesService.update(req.params.id!, req.body, actor(req)));
}));
coursesRouter.delete("/:id", requirePermission(PERMISSIONS.COURSE_MANAGE), asyncHandler(async (req: Request, res: Response) => {
  await coursesService.remove(req.params.id!, actor(req));
  res.status(204).send();
}));
