import { Router } from "express";
import type { Request, Response } from "express";
import { PERMISSIONS } from "@dbpcms/shared";
import { authenticate } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { asyncHandler } from "../../core/http/async-handler.js";
import { sendList, sendSuccess } from "../../core/http/responses.js";
import { studentsService } from "./students.service.js";

function actor(req: Request) {
  return { userId: req.auth!.userId, ipAddress: req.ip ?? null, userAgent: req.headers["user-agent"] ?? null };
}

export const studentsRouter = Router();
studentsRouter.use(authenticate);

studentsRouter.get("/", requirePermission(PERMISSIONS.STUDENT_READ), asyncHandler(async (req: Request, res: Response) => {
  const { items, total, page, pageSize } = await studentsService.list(req.query as Record<string, unknown>);
  sendList(res, items, { page, pageSize, totalItems: total });
}));
studentsRouter.get("/:id", requirePermission(PERMISSIONS.STUDENT_READ), asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, await studentsService.getById(req.params.id!));
}));
studentsRouter.post("/", requirePermission(PERMISSIONS.STUDENT_MANAGE), asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, await studentsService.create(req.body, actor(req)), 201);
}));
studentsRouter.patch("/:id", requirePermission(PERMISSIONS.STUDENT_MANAGE), asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, await studentsService.update(req.params.id!, req.body, actor(req)));
}));
studentsRouter.delete("/:id", requirePermission(PERMISSIONS.STUDENT_MANAGE), asyncHandler(async (req: Request, res: Response) => {
  await studentsService.remove(req.params.id!, actor(req));
  res.status(204).send();
}));
