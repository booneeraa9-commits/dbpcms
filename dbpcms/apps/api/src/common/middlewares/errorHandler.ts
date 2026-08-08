/**
 * Global error handler.
 * This is the LAST middleware. If anything throws, it ends up here.
 *
 * Key principles:
 *   - Never leak stack traces in production
 *   - Always return a consistent JSON shape
 *   - Always log the error with context
 */

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { AppError, InternalServerError, NotFoundError } from '../errors/AppError';
import { logger } from '../../infra/logger';
import { config } from '../../config';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(new NotFoundError(`Route ${req.method} ${req.originalUrl}`));
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
) {
  // ─── Handle known errors ─────────────────────────────────
  if (err instanceof ZodError) {
    return res.status(422).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: err.flatten().fieldErrors,
      },
    });
  }

  if (err instanceof PrismaClientKnownRequestError) {
    // P2002 = unique constraint violation
    if (err.code === 'P2002') {
      const target = ((err.meta as Record<string, unknown> | undefined)?.target as string[]) ?? [];
      return res.status(409).json({
        success: false,
        error: {
          code: 'CONFLICT',
          message: `A record with this ${target.join(', ')} already exists`,
          details: { target },
        },
      });
    }
    // P2025 = record not found
    if (err.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Record not found',
        },
      });
    }
  }

  if (err instanceof AppError) {
    if (!err.isOperational) {
      logger.error({ err, req: { method: req.method, url: req.url } }, 'Non-operational error');
    }
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    });
  }

  // ─── Handle unknown errors ───────────────────────────────
  logger.error(
    { err, req: { method: req.method, url: req.url } },
    'Unhandled error',
  );

  const internalError = new InternalServerError();
  return res.status(internalError.statusCode).json({
    success: false,
    error: {
      code: internalError.code,
      message: config.isProduction
        ? 'An unexpected error occurred'
        : err.message,
      ...(config.isDevelopment ? { stack: err.stack } : {}),
    },
  });
}
