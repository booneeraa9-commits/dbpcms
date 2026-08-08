import { Router } from "express";
import { PERMISSIONS } from "@dbpcms/shared";
import { authenticate } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { asyncHandler } from "../../core/http/async-handler.js";
import { departmentsController } from "./departments.controller.js";

/**
 * Department routes. Reading needs department:read; creating/editing/deleting
 * needs department:manage. Every route requires authentication.
 */
export const departmentsRouter = Router();

departmentsRouter.use(authenticate);

departmentsRouter.get(
  "/",
  requirePermission(PERMISSIONS.DEPARTMENT_READ),
  asyncHandler(departmentsController.list),
);
departmentsRouter.get(
  "/:id",
  requirePermission(PERMISSIONS.DEPARTMENT_READ),
  asyncHandler(departmentsController.getById),
);
departmentsRouter.post(
  "/",
  requirePermission(PERMISSIONS.DEPARTMENT_MANAGE),
  asyncHandler(departmentsController.create),
);
departmentsRouter.patch(
  "/:id",
  requirePermission(PERMISSIONS.DEPARTMENT_MANAGE),
  asyncHandler(departmentsController.update),
);
departmentsRouter.delete(
  "/:id",
  requirePermission(PERMISSIONS.DEPARTMENT_MANAGE),
  asyncHandler(departmentsController.remove),
);
