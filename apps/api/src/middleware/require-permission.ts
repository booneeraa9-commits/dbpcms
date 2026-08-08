import type { NextFunction, Request, Response } from "express";
import {
  ForbiddenError,
  UnauthorizedError,
} from "../core/errors/app-error.js";

/**
 * Route guard: ensures the authenticated user has ALL of the given permissions.
 * Use after `authenticate`. Example:
 *   router.post("/employees", authenticate, requirePermission("employee:create"), ...)
 *
 * This is the COARSE authorization layer. Fine-grained "own department only"
 * checks live in services (Phase 5+).
 */
export function requirePermission(...required: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth) throw new UnauthorizedError();
    const held = new Set(req.auth.permissions);
    const missing = required.filter((p) => !held.has(p));
    if (missing.length > 0) {
      throw new ForbiddenError("You do not have permission to do this.");
    }
    next();
  };
}
