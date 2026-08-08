/**
 * Authentication & authorization guards (middleware).
 *
 * Usage in routes:
 *   router.get('/me', requireAuth, getMe);
 *   router.post('/users', requireAuth, requireRole('super_admin'), createUser);
 *   router.delete('/audit', requireAuth, requirePermission('audit:view'), getAudit);
 *
 * Order matters! requireAuth MUST come first because it populates req.user.
 * The others read from req.user.
 */

import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/tokens';
import { prisma } from '../../infra/database/client';
import { UnauthorizedError, ForbiddenError } from '../errors/AppError';
import type { Role, Permission } from '@dbpcms/shared';

// ──────────────────────────────────────────────────────
// requireAuth — verifies JWT and loads user into req
// ──────────────────────────────────────────────────────

export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid Authorization header');
    }

    const token = authHeader.slice(7);
    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch (err) {
      if (err instanceof Error && err.name === 'TokenExpiredError') {
        throw new UnauthorizedError('Access token expired');
      }
      throw new UnauthorizedError('Invalid access token');
    }

    // Load fresh user data (so role/permission changes take effect immediately)
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
    });

    if (!user) throw new UnauthorizedError('User not found');
    if (user.deletedAt) throw new UnauthorizedError('Account has been deleted');
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedError(`Account is ${user.status.toLowerCase()}`);
    }

    // Flatten roles and permissions
    const roles: string[] = user.userRoles.map((ur: { role: { slug: string } }) => ur.role.slug);
    const permissions: string[] = Array.from(
      new Set(
        user.userRoles.flatMap((ur: { role: { rolePermissions: { permission: { slug: string } }[] } }) =>
          ur.role.rolePermissions.map((rp) => rp.permission.slug),
        ),
      ),
    );

    req.user = {
      id: user.id,
      email: user.email,
      roles,
      permissions,
    };

    next();
  } catch (error) {
    next(error);
  }
}

// ──────────────────────────────────────────────────────
// requireRole — checks if user has at least one of the listed roles
// ──────────────────────────────────────────────────────

export function requireRole(...allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }

    const hasRole = req.user.roles.some((r) => allowedRoles.includes(r as Role));
    if (!hasRole) {
      return next(
        new ForbiddenError(
          `This action requires one of these roles: ${allowedRoles.join(', ')}`,
        ),
      );
    }
    next();
  };
}

// ──────────────────────────────────────────────────────
// requirePermission — checks if user has at least one of the listed perms
// ──────────────────────────────────────────────────────

export function requirePermission(...requiredPermissions: Permission[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }

    const hasPermission = req.user.permissions.some((p) =>
      requiredPermissions.includes(p as Permission),
    );
    if (!hasPermission) {
      return next(
        new ForbiddenError(
          `Missing required permission: ${requiredPermissions.join(', ')}`,
        ),
      );
    }
    next();
  };
}

/**
 * Optional auth — attaches user if token is valid, but doesn't fail if missing.
 * Useful for endpoints that have different behavior for authed vs anonymous users.
 */
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return next();

  // Reuse requireAuth logic but swallow errors
  try {
    await requireAuth(req, _res, () => {});
  } catch {
    // Ignore — treat as anonymous
  }
  next();
}
