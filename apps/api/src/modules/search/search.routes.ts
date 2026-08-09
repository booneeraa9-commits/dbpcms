import { Router } from "express";
import type { Request, Response } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { asyncHandler } from "../../core/http/async-handler.js";
import { sendSuccess } from "../../core/http/responses.js";
import { searchService } from "./search.service.js";

/**
 * Global search. Any authenticated user; results are limited to the entity
 * types their permissions allow (the token already carries their permissions).
 */
export const searchRouter = Router();
searchRouter.use(authenticate);

searchRouter.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const query = typeof req.query.q === "string" ? req.query.q : "";
    const perms = new Set(req.auth!.permissions);
    sendSuccess(res, await searchService.search(query, perms));
  }),
);
