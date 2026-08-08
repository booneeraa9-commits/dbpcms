import { Router } from "express";
import type { Request, Response } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { asyncHandler } from "../../core/http/async-handler.js";
import { sendSuccess } from "../../core/http/responses.js";
import { dashboardService } from "./dashboard.service.js";

/** Dashboard summary — any authenticated user; content is tailored to their role. */
export const dashboardRouter = Router();
dashboardRouter.use(authenticate);

dashboardRouter.get(
  "/summary",
  asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await dashboardService.summary(req.auth!.userId));
  }),
);
