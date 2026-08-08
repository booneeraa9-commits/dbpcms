import { Router } from "express";
import type { Request, Response } from "express";
import { PERMISSIONS } from "@dbpcms/shared";
import { authenticate } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { asyncHandler } from "../../core/http/async-handler.js";
import { sendList, sendSuccess } from "../../core/http/responses.js";
import { usersService } from "./users.service.js";

function actor(req: Request) {
  return {
    userId: req.auth!.userId,
    ipAddress: req.ip ?? null,
    userAgent: req.headers["user-agent"] ?? null,
  };
}

export const usersRouter = Router();
usersRouter.use(authenticate);

// List available roles (for the role picker). Needs role:read.
usersRouter.get(
  "/roles",
  requirePermission(PERMISSIONS.ROLE_READ),
  asyncHandler(async (_req: Request, res: Response) => {
    sendSuccess(res, await usersService.listRoles());
  }),
);

usersRouter.get(
  "/",
  requirePermission(PERMISSIONS.USER_READ),
  asyncHandler(async (req: Request, res: Response) => {
    const { items, total, page, pageSize } = await usersService.list(
      req.query as Record<string, unknown>,
    );
    sendList(res, items, { page, pageSize, totalItems: total });
  }),
);

usersRouter.get(
  "/:id",
  requirePermission(PERMISSIONS.USER_READ),
  asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await usersService.getById(req.params.id!));
  }),
);

usersRouter.post(
  "/",
  requirePermission(PERMISSIONS.USER_CREATE),
  asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await usersService.create(req.body, actor(req)), 201);
  }),
);

usersRouter.patch(
  "/:id",
  requirePermission(PERMISSIONS.USER_UPDATE),
  asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await usersService.update(req.params.id!, req.body, actor(req)));
  }),
);

usersRouter.post(
  "/:id/reset-password",
  requirePermission(PERMISSIONS.USER_RESET_PASSWORD),
  asyncHandler(async (req: Request, res: Response) => {
    await usersService.resetPassword(req.params.id!, req.body, actor(req));
    sendSuccess(res, { reset: true });
  }),
);

usersRouter.delete(
  "/:id",
  requirePermission(PERMISSIONS.USER_DELETE),
  asyncHandler(async (req: Request, res: Response) => {
    await usersService.remove(req.params.id!, actor(req));
    res.status(204).send();
  }),
);
