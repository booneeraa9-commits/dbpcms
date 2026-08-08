/**
 * Rate limiters.
 *
 * Two flavors:
 *   - globalRateLimiter: applied to ALL routes (default: 100 req / 15 min)
 *   - authRateLimiter: applied to auth routes (default: 5 req / 15 min)
 *
 * We use express-rate-limit with the in-memory store.
 * In production with multiple API instances, swap for redis store.
 */

import rateLimit from 'express-rate-limit';
import { config } from '../../config';
import { TooManyRequestsError } from '../errors/AppError';

export const globalRateLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(new TooManyRequestsError());
  },
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window per IP (we do additional checks at user level)
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // don't count successful logins
  handler: (_req, _res, next) => {
    next(new TooManyRequestsError('Too many authentication attempts. Please try again in 15 minutes.'));
  },
});
