import { Router } from "express";
import type { Request, Response } from "express";
import { PERMISSIONS } from "@dbpcms/shared";
import { authenticate } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { asyncHandler } from "../../core/http/async-handler.js";
import { sendList, sendSuccess } from "../../core/http/responses.js";
import { ROLES } from "@dbpcms/shared";
import { prisma } from "../../core/db/prisma.js";
import { sectionsService } from "./sections.service.js";

function actor(req: Request) {
  return { userId: req.auth!.userId, ipAddress: req.ip ?? null, userAgent: req.headers["user-agent"] ?? null };
}

export const sectionsRouter = Router();
sectionsRouter.use(authenticate);

// Instructor options for the assignment picker (users with the instructor role).
sectionsRouter.get("/instructors", requirePermission(PERMISSIONS.SECTION_MANAGE), asyncHandler(async (_req: Request, res: Response) => {
  const instructors = await prisma.user.findMany({
    where: { deletedAt: null, isActive: true, roles: { some: { role: { name: ROLES.INSTRUCTOR } } } },
    select: { id: true, fullName: true, email: true },
    orderBy: { fullName: "asc" },
  });
  sendSuccess(res, instructors);
}));

sectionsRouter.get("/", requirePermission(PERMISSIONS.SECTION_MANAGE), asyncHandler(async (req: Request, res: Response) => {
  const { items, total, page, pageSize } = await sectionsService.list(req.query as Record<string, unknown>);
  sendList(res, items, { page, pageSize, totalItems: total });
}));
sectionsRouter.get("/:id", requirePermission(PERMISSIONS.SECTION_MANAGE), asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, await sectionsService.getById(req.params.id!));
}));
sectionsRouter.post("/", requirePermission(PERMISSIONS.SECTION_MANAGE), asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, await sectionsService.create(req.body, actor(req)), 201);
}));
sectionsRouter.delete("/:id", requirePermission(PERMISSIONS.SECTION_MANAGE), asyncHandler(async (req: Request, res: Response) => {
  await sectionsService.remove(req.params.id!, actor(req));
  res.status(204).send();
}));

// Instructor assignment
sectionsRouter.post("/:id/instructors", requirePermission(PERMISSIONS.SECTION_MANAGE), asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, await sectionsService.assignInstructor(req.params.id!, req.body, actor(req)));
}));
sectionsRouter.delete("/:id/instructors/:instructorId", requirePermission(PERMISSIONS.SECTION_MANAGE), asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, await sectionsService.unassignInstructor(req.params.id!, req.params.instructorId!, actor(req)));
}));

// Enrollment
sectionsRouter.get("/:id/enrollments", requirePermission(PERMISSIONS.SECTION_MANAGE), asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, await sectionsService.listEnrollments(req.params.id!));
}));
sectionsRouter.post("/:id/enrollments", requirePermission(PERMISSIONS.SECTION_MANAGE), asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, await sectionsService.enroll(req.params.id!, req.body, actor(req)), 201);
}));
sectionsRouter.delete("/:id/enrollments/:enrollmentId", requirePermission(PERMISSIONS.SECTION_MANAGE), asyncHandler(async (req: Request, res: Response) => {
  await sectionsService.unenroll(req.params.id!, req.params.enrollmentId!, actor(req));
  res.status(204).send();
}));
