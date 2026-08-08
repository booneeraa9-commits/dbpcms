import type { NextFunction, Request, Response } from "express";
import { NotFoundError } from "../core/errors/app-error.js";

/**
 * Runs when no route matched. Forwards a clean 404 to the central error handler
 * instead of Express's default HTML page.
 */
export function notFoundHandler(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  next(new NotFoundError(`Route not found: ${req.method} ${req.originalUrl}`));
}
