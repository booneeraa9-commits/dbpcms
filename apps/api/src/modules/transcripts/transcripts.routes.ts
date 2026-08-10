import { Router } from "express";
import type { Request, Response } from "express";
import { PERMISSIONS } from "@dbpcms/shared";
import { authenticate } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { asyncHandler } from "../../core/http/async-handler.js";
import { sendSuccess } from "../../core/http/responses.js";
import { publicAppUrl } from "../../config/env.js";
import { transcriptsService } from "./transcripts.service.js";
import { buildTranscriptHtml } from "./transcript-print.js";

/**
 * Transcript routes. Generating/printing official transcripts requires
 * transcript:generate (registrar + admin per the chosen access policy).
 */
export const transcriptsRouter = Router();
transcriptsRouter.use(authenticate);

transcriptsRouter.get(
  "/students/:studentId",
  requirePermission(PERMISSIONS.TRANSCRIPT_GENERATE),
  asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await transcriptsService.build(req.params.studentId!));
  }),
);

transcriptsRouter.get(
  "/students/:studentId/print",
  requirePermission(PERMISSIONS.TRANSCRIPT_GENERATE),
  asyncHandler(async (req: Request, res: Response) => {
    const html = await buildTranscriptHtml(req.params.studentId!, publicAppUrl, req.auth!.userId);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  }),
);
