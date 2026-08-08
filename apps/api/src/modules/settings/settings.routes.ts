import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { PERMISSIONS } from "@dbpcms/shared";
import { authenticate } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { asyncHandler } from "../../core/http/async-handler.js";
import { sendSuccess } from "../../core/http/responses.js";
import { settingsService } from "./settings.service.js";

function actor(req: Request) {
  return {
    userId: req.auth!.userId,
    ipAddress: req.ip ?? null,
    userAgent: req.headers["user-agent"] ?? null,
  };
}

const updateSchema = z.object({
  value: z.string().trim().min(1, "Value is required.").max(200),
});

export const settingsRouter = Router();
settingsRouter.use(authenticate);

settingsRouter.get(
  "/",
  requirePermission(PERMISSIONS.SYSTEM_SETTING_MANAGE),
  asyncHandler(async (_req: Request, res: Response) => {
    sendSuccess(res, await settingsService.list());
  }),
);

settingsRouter.patch(
  "/:key",
  requirePermission(PERMISSIONS.SYSTEM_SETTING_MANAGE),
  asyncHandler(async (req: Request, res: Response) => {
    const { value } = updateSchema.parse(req.body);
    sendSuccess(res, await settingsService.update(req.params.key!, value, actor(req)));
  }),
);
