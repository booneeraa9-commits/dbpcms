/**
 * Custom param decorators for Express.
 * Lets controllers declare what they want from the request:
 *
 *   @Get('me')
 *   getMe(@CurrentUser() user: AuthenticatedUser) { ... }
 *
 *   @Get('me')
 *   getMyId(@CurrentUser('id') userId: string) { ... }
 */

import type { Request, Response, NextFunction } from 'express';

export interface AuthenticatedUser {
  id: string;
  email: string;
  roles: string[];
  permissions: string[];
}

// Augment Express types so `req.user` is always typed correctly
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      requestId?: string;
    }
  }
}

/**
 * Higher-order function that returns an Express middleware-style handler
 * which extracts the user from the request.
 *
 * Usage with a wrapper helper:
 *   const user = getCurrentUser(req, 'id');
 */
export function getCurrentUser<T = AuthenticatedUser>(
  req: Request,
  field?: keyof AuthenticatedUser,
): T | undefined {
  if (!req.user) return undefined;
  return field ? (req.user[field] as T) : (req.user as T);
}

// Re-export the type for convenience
export type { Request, Response, NextFunction };
