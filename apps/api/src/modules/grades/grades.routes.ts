import { Router } from "express";
import type { Request, Response } from "express";
import { PERMISSIONS } from "@dbpcms/shared";
import { authenticate } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { asyncHandler } from "../../core/http/async-handler.js";
import { sendSuccess } from "../../core/http/responses.js";
import { gradesService } from "./grades.service.js";

function actor(req: Request) {
  return { userId: req.auth!.userId, ipAddress: req.ip ?? null, userAgent: req.headers["user-agent"] ?? null };
}

export const gradesRouter = Router();
gradesRouter.use(authenticate);

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
