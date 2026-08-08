/**
 * Request logger middleware.
 * Logs every incoming request with method, URL, status, duration.
 * Uses morgan in dev for colorized output, raw morgan in prod.
 */

import { Request, Response, NextFunction } from 'express';
import morgan from 'morgan';
import { config } from '../../config';
import { logger } from '../../infra/logger';

const morganStream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

export const requestLogger = config.isDevelopment
  ? morgan('dev', { stream: morganStream })
  : morgan('combined', { stream: morganStream });

/**
 * Request ID middleware — every request gets a unique ID for tracing.
 */
export function requestId(req: Request, res: Response, next: NextFunction) {
  const id = req.headers['x-request-id']?.toString() ?? crypto.randomUUID();
  req.headers['x-request-id'] = id;
  res.setHeader('x-request-id', id);
  next();
}
