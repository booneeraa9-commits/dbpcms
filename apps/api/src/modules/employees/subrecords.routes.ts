import { Router } from "express";
import type { Request, Response } from "express";
import { PERMISSIONS } from "@dbpcms/shared";
import { authenticate } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { asyncHandler } from "../../core/http/async-handler.js";
import { sendSuccess } from "../../core/http/responses.js";
import { subrecordsService, type SubKind } from "./subrecords.service.js";

function actor(req: Request) {
  return {
    userId: req.auth!.userId,
    ipAddress: req.ip ?? null,
    userAgent: req.headers["user-agent"] ?? null,
  };
}

/**
 * Registers CRUD routes for one employee sub-record kind under
 * /employees/:employeeId/<path>. Reading needs employee:read; writing needs
 * employee:update (per the chosen permission model).
 *
 * mergeParams lets these nested routers see :employeeId from the parent.
 */
function makeSubRouter(kind: SubKind): Router {
  const r = Router({ mergeParams: true });
  r.use(authenticate);

  r.get(
    "/",
    requirePermission(PERMISSIONS.EMPLOYEE_READ),
    asyncHandler(async (req: Request, res: Response) => {
      const items = await subrecordsService.list(kind, req.params.employeeId!);
      sendSuccess(res, items);
    }),
  );

  r.post(
    "/",
    requirePermission(PERMISSIONS.EMPLOYEE_UPDATE),
    asyncHandler(async (req: Request, res: Response) => {
      const created = await subrecordsService.create(
        kind,
        req.params.employeeId!,
        req.body,
        actor(req),
      );
      sendSuccess(res, created, 201);
    }),
  );

  r.patch(
    "/:recordId",
    requirePermission(PERMISSIONS.EMPLOYEE_UPDATE),
    asyncHandler(async (req: Request, res: Response) => {
      const updated = await subrecordsService.update(
        kind,
        req.params.employeeId!,
        req.params.recordId!,
        req.body,
        actor(req),
      );
      sendSuccess(res, updated);
    }),
  );

  r.delete(
    "/:recordId",
    requirePermission(PERMISSIONS.EMPLOYEE_UPDATE),
    asyncHandler(async (req: Request, res: Response) => {
      await subrecordsService.remove(
        kind,
        req.params.employeeId!,
        req.params.recordId!,
        actor(req),
      );
      res.status(204).send();
    }),
  );

  return r;
}

export const educationRouter = makeSubRouter("education");
export const qualificationRouter = makeSubRouter("qualification");
export const historyRouter = makeSubRouter("history");
export const emergencyRouter = makeSubRouter("emergency");
