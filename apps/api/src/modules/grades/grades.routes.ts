import { Router } from "express";
import type { Request, Response } from "express";
import { PERMISSIONS } from "@dbpcms/shared";
import { authenticate } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { asyncHandler } from "../../core/http/async-handler.js";
import { sendSuccess } from "../../core/http/responses.js";
import { gradesService } from "./grades.service.js";
import { gradeWorkflowService } from "./workflow.service.js";

function actor(req: Request) {
  return { userId: req.auth!.userId, ipAddress: req.ip ?? null, userAgent: req.headers["user-agent"] ?? null };
}

export const gradesRouter = Router();
gradesRouter.use(authenticate);

// Sections the current user may grade (their own if instructor; all if admin/registrar).
gradesRouter.get(
  "/sections",
  requirePermission(PERMISSIONS.GRADE_ENTER),
  asyncHandler(async (req: Request, res: Response) => {
    const semester = typeof req.query.semester === "string" ? req.query.semester : undefined;
    const items = await gradesService.listGradableSections(req.auth!.userId, { semester });
    sendSuccess(res, items);
  }),
);

// Read the gradesheet for a section (grid data + live computed results).
gradesRouter.get(
  "/sections/:sectionId/gradesheet",
  requirePermission(PERMISSIONS.GRADE_ENTER),
  asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await gradesService.getGradesheet(req.params.sectionId!));
  }),
);

// Save/draft marks for a section.
gradesRouter.put(
  "/sections/:sectionId/grades",
  requirePermission(PERMISSIONS.GRADE_ENTER),
  asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await gradesService.saveGrades(req.params.sectionId!, req.body, actor(req)));
  }),
);

// --- Approval workflow (Phase 7B) ---
gradesRouter.post(
  "/sections/:sectionId/submit",
  requirePermission(PERMISSIONS.GRADE_SUBMIT),
  asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await gradeWorkflowService.submit(req.params.sectionId!, actor(req)));
  }),
);
gradesRouter.post(
  "/sections/:sectionId/approve",
  requirePermission(PERMISSIONS.GRADE_APPROVE),
  asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await gradeWorkflowService.approve(req.params.sectionId!, actor(req)));
  }),
);
gradesRouter.post(
  "/sections/:sectionId/publish",
  requirePermission(PERMISSIONS.GRADE_PUBLISH),
  asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await gradeWorkflowService.publish(req.params.sectionId!, actor(req)));
  }),
);
gradesRouter.post(
  "/sections/:sectionId/return",
  requirePermission(PERMISSIONS.GRADE_APPROVE),
  asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await gradeWorkflowService.returnForCorrection(req.params.sectionId!, req.body, actor(req)));
  }),
);
gradesRouter.post(
  "/sections/:sectionId/unlock",
  requirePermission(PERMISSIONS.GRADE_UNLOCK),
  asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await gradeWorkflowService.unlock(req.params.sectionId!, actor(req)));
  }),
);
