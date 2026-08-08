import { Router } from "express";
import type { Request, Response } from "express";
import { asyncHandler } from "../../core/http/async-handler.js";
import { sendSuccess } from "../../core/http/responses.js";
import { verificationService } from "./verification.service.js";

/**
 * PUBLIC verification endpoint — no authentication. Anyone holding a printed
 * document can check its code here. It returns only a safe summary (kind,
 * subject label, issued date), never sensitive record data.
 */
export const verificationRouter = Router();

verificationRouter.get(
  "/:code",
  asyncHandler(async (req: Request, res: Response) => {
    const result = await verificationService.verify(req.params.code!);
    if (!result) {
      sendSuccess(res, { valid: false });
      return;
    }
    sendSuccess(res, result);
  }),
);
