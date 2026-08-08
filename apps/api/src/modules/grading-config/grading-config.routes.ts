import { Router } from "express";
import type { Request, Response } from "express";
import { PERMISSIONS } from "@dbpcms/shared";
import { authenticate } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { asyncHandler } from "../../core/http/async-handler.js";
import { sendSuccess } from "../../core/http/responses.js";
import { gradingConfigService } from "./grading-config.service.js";

function actor(req: Request) {
  return { userId: req.auth!.userId, ipAddress: req.ip ?? null, userAgent: req.headers["user-agent"] ?? null };
}

export const gradingConfigRouter = Router();
gradingConfigRouter.use(authenticate);

// Reading config is allowed to anyone who can enter grades or configure grading.
const canRead = requirePermission; // alias for readability

// Components
gradingConfigRouter.get("/components", requirePermission(PERMISSIONS.GRADE_ENTER), asyncHandler(async (_req, res: Response) => {
  const [components, weightTotal] = await Promise.all([
    gradingConfigService.listComponents(),
    gradingConfigService.componentsWeightTotal(),
  ]);
  sendSuccess(res, { components, weightTotal });
}));
gradingConfigRouter.post("/components", requirePermission(PERMISSIONS.GRADING_CONFIG), asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, await gradingConfigService.createComponent(req.body, actor(req)), 201);
}));
gradingConfigRouter.patch("/components/:id", requirePermission(PERMISSIONS.GRADING_CONFIG), asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, await gradingConfigService.updateComponent(req.params.id!, req.body, actor(req)));
}));
gradingConfigRouter.delete("/components/:id", requirePermission(PERMISSIONS.GRADING_CONFIG), asyncHandler(async (req: Request, res: Response) => {
  await gradingConfigService.removeComponent(req.params.id!, actor(req));
  res.status(204).send();
}));

// Scales
gradingConfigRouter.get("/scales", requirePermission(PERMISSIONS.GRADE_ENTER), asyncHandler(async (_req, res: Response) => {
  sendSuccess(res, await gradingConfigService.listScales());
}));
gradingConfigRouter.get("/scales/active", requirePermission(PERMISSIONS.GRADE_ENTER), asyncHandler(async (_req, res: Response) => {
  sendSuccess(res, await gradingConfigService.getActiveScale());
}));
gradingConfigRouter.post("/scales", requirePermission(PERMISSIONS.GRADING_CONFIG), asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, await gradingConfigService.saveScale(req.body, actor(req)), 201);
}));

void canRead;
