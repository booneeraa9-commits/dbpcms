import type { NextFunction, Request, Response } from "express";

/**
 * Wraps an async route handler so any thrown error is forwarded to the central
 * error handler. Express 4 does not catch async rejections automatically.
 */
export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    handler(req, res, next).catch(next);
  };
}
