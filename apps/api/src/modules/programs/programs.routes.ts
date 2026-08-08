import { Router } from "express";
import { PERMISSIONS } from "@dbpcms/shared";
import { authenticate } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { asyncHandler } from "../../core/http/async-handler.js";
import { programsController } from "./programs.controller.js";

export const programsRouter = Router();
programsRouter.use(authenticate);

programsRouter.get(
  "/",
  requirePermission(PERMISSIONS.PROGRAM_READ),
  asyncHandler(programsController.list),
);
programsRouter.get(
  "/:id",
  requirePermission(PERMISSIONS.PROGRAM_READ),
  asyncHandler(programsController.getById),
);
programsRouter.post(
  "/",
  requirePermission(PERMISSIONS.PROGRAM_MANAGE),
  asyncHandler(programsController.create),
);
programsRouter.patch(
  "/:id",
  requirePermission(PERMISSIONS.PROGRAM_MANAGE),
  asyncHandler(programsController.update),
);
programsRouter.delete(
  "/:id",
  requirePermission(PERMISSIONS.PROGRAM_MANAGE),
  asyncHandler(programsController.remove),
);
