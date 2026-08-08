/**
 * Async handler wrapper.
 * Wraps async route handlers so we don't have to write try/catch in every one.
 *
 * Usage:
 *   router.get('/users', asyncHandler(async (req, res) => {
 *     const users = await service.list();
 *     res.json(users);
 *   }));
 *
 * The async errors are automatically passed to next() (the error middleware).
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';

export function asyncHandler<P = unknown, ResBody = unknown, ReqBody = unknown, ReqQuery = unknown>(
  fn: (req: Request<P, ResBody, ReqBody, ReqQuery>, res: Response<ResBody>, next: NextFunction) => Promise<unknown>,
): RequestHandler<P, ResBody, ReqBody, ReqQuery> {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
