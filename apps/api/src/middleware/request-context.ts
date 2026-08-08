import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";

/**
 * Attaches a unique requestId to every request. It appears in logs and in every
 * response's meta, so when a user reports a problem you can find the exact log
 * lines for that one request.
 */
export function requestContext(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const requestId = randomUUID();
  res.locals.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);
  next();
}
