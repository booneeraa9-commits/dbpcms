/**
 * Auth service — all the business logic.
 *
 * Why a service? It's the only place that knows the rules:
 *   - How login works (check password, check lockout, create tokens)
 *   - How refresh works (rotate tokens, revoke old ones)
 *   - How password reset works (email token, single use)
 *
 * Controllers just receive the request, call the service, send the response.
 */

import { Prisma } from '@prisma/client';
import crypto from 'crypto';
import { prisma } from '../../infra/database/client';
import { hashPassword, verifyPassword } from '../../common/utils/password';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
  parseExpiryToDate,
} from '../../common/utils/tokens';
import {
  UnauthorizedError,
  BadRequestError,
  NotFoundError,
  ConflictError,
} from '../../common/errors/AppError';
import { activityLog } from '../activity/activity.service';
import { config } from '../../config';
import type { Request } from 'express';
import type { Role, Permission } from '@dbpcms/shared';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export interface AuthResult {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
    roles: Role[];
    permissions: Permission[];
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

class AuthService {
  /**
   * Login: email + password → tokens
   */
  async login(req: Request, email: string, password: string): Promise<AuthResult> {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: { include: { permission: true } },
              },
            },
          },
        },
      },
    });

    if (!user || user.deletedAt) {
      // Generic error to prevent email enumeration
      throw new UnauthorizedError('Invalid email or password');
    }

    // Check if locked out
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedError(
        `Account is temporarily locked. Try again after ${user.lockedUntil.toISOString()}`,
      );
    }

    if (user.status === 'SUSPENDED') {
      throw new UnauthorizedError('Account has been suspended. Contact your administrator.');
    }

    if (user.status === 'INACTIVE') {
      throw new UnauthorizedError('Account is inactive. Contact your administrator.');
    }

    // Verify password
    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      await this.recordFailedLogin(user.id, user.failedLoginCount);
      await activityLog.log(req, {
        userId: user.id,
        action: 'LOGIN_FAILED',
        description: 'Invalid password',
      });
      throw new UnauthorizedError('Invalid email or password');
    }

    // Success — reset failed count, update last login
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        lastLoginIp: req.ip ?? null,
      },
    });

    const tokens = await this.issueTokens(req, user.id, user.email);

    await activityLog.log(req, {
      userId: user.id,
      action: 'LOGIN',
      description: 'Successful login',
    });

    return {
      user: this.serializeUser(user),
      tokens,
    };
  }

  /**
   * Refresh: rotate tokens.
   * Old refresh token is revoked; new pair is issued.
   * This prevents stolen tokens from being reused.
   */
  async refresh(req: Request, refreshToken: string): Promise<AuthResult> {
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch (err) {
      if (err instanceof Error && err.name === 'TokenExpiredError') {
        throw new UnauthorizedError('Refresh token expired. Please log in again.');
      }
      throw new UnauthorizedError('Invalid refresh token');
    }

    // Check token is in DB and not revoked
    const tokenHash = hashToken(refreshToken);
    const stored = await prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!stored || stored.revokedAt) {
      // Token reuse detected! Revoke ALL tokens for this user as a precaution
      // (someone may have stolen a valid refresh token)
      await prisma.refreshToken.updateMany({
        where: { userId: payload.sub, revokedAt: null },
        data: { revokedAt: new Date(), revokedReason: 'Reuse detected' },
      });
      await activityLog.log(req, {
        userId: payload.sub,
        action: 'OTHER',
        description: 'Refresh token reuse detected — all sessions revoked',
      });
      throw new UnauthorizedError('Token reuse detected. Please log in again.');
    }

    if (stored.expiresAt < new Date()) {
      throw new UnauthorizedError('Refresh token expired');
    }

    // Load user
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: { include: { permission: true } },
              },
            },
          },
        },
      },
    });

    if (!user || user.deletedAt || user.status !== 'ACTIVE') {
      throw new UnauthorizedError('User not available');
    }

    // Revoke old token, issue new pair
    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date(), revokedReason: 'Rotated' },
    });

    const tokens = await this.issueTokens(req, user.id, user.email);

    return {
      user: this.serializeUser(user),
      tokens,
    };
  }

  /**
   * Logout: revoke the current refresh token.
   */
  async logout(req: Request, userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      const tokenHash = hashToken(refreshToken);
      await prisma.refreshToken.updateMany({
        where: { userId, tokenHash, revokedAt: null },
        data: { revokedAt: new Date(), revokedReason: 'Logout' },
      });
    } else {
      // No specific token — revoke all (logout-everywhere)
      await prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date(), revokedReason: 'Logout all' },
      });
    }

    await activityLog.log(req, {
      userId,
      action: 'LOGOUT',
    });
  }

  /**
   * Logout from all devices: revoke all refresh tokens.
   */
  async logoutAll(req: Request, userId: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: 'Logout all devices' },
    });
    await activityLog.log(req, {
      userId,
      action: 'LOGOUT',
      description: 'Logged out from all devices',
    });
  }

  /**
   * Forgot password: generate a one-time reset token.
   * In production, this would email the token. For now, we return it in
   * the response in dev (NEVER do this in prod).
   */
  async forgotPassword(req: Request, email: string): Promise<{ resetToken?: string }> {
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

    // Always return success even if user doesn't exist (prevents email enumeration)
    if (!user || user.deletedAt) {
      return {};
    }

    // Generate a secure random token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(resetToken);

    await prisma.passwordReset.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        ipAddress: req.ip ?? null,
      },
    });

    await activityLog.log(req, {
      userId: user.id,
      action: 'PASSWORD_RESET_REQUEST',
    });

    // TODO: Send email in production. For now, return token in dev only.
    if (config.isDevelopment) {
      return { resetToken };
    }
    return {};
  }

  /**
   * Reset password: consume the one-time token and update password.
   */
  async resetPassword(
    req: Request,
    token: string,
    newPassword: string,
  ): Promise<void> {
    const tokenHash = hashToken(token);
    const reset = await prisma.passwordReset.findUnique({ where: { tokenHash } });

    if (!reset || reset.usedAt || reset.expiresAt < new Date()) {
      throw new BadRequestError('Invalid or expired reset token');
    }

    const passwordHash = await hashPassword(newPassword);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: reset.userId },
        data: {
          passwordHash,
          passwordChangedAt: new Date(),
          mustChangePassword: false,
          failedLoginCount: 0,
          lockedUntil: null,
        },
      }),
      prisma.passwordReset.update({
        where: { id: reset.id },
        data: { usedAt: new Date() },
      }),
      // Revoke all refresh tokens (force re-login everywhere)
      prisma.refreshToken.updateMany({
        where: { userId: reset.userId, revokedAt: null },
        data: { revokedAt: new Date(), revokedReason: 'Password reset' },
      }),
    ]);

    await activityLog.log(req, {
      userId: reset.userId,
      action: 'PASSWORD_RESET_COMPLETE',
    });
  }

  /**
   * Change password: while logged in, knowing the current password.
   */
  async changePassword(
    req: Request,
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) throw new NotFoundError('User');

    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) throw new UnauthorizedError('Current password is incorrect');

    const passwordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        passwordChangedAt: new Date(),
        mustChangePassword: false,
      },
    });

    await activityLog.log(req, {
      userId,
      action: 'PASSWORD_CHANGE',
    });
  }

  /**
   * Get current user — used by /auth/me.
   */
  async me(userId: string): Promise<AuthResult['user']> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: { include: { permission: true } },
              },
            },
          },
        },
      },
    });

    if (!user || user.deletedAt) throw new UnauthorizedError();
    return this.serializeUser(user);
  }

  // ─── Private helpers ────────────────────────────────

  private async issueTokens(req: Request, userId: string, email: string) {
    // Load roles for the access token
    const userRoles = await prisma.userRole.findMany({
      where: { userId },
      include: { role: true },
    });
    const roles = userRoles.map((ur) => ur.role.slug);

    const accessToken = signAccessToken({ sub: userId, email, roles });

    const jti = crypto.randomUUID();
    const refreshToken = signRefreshToken({ sub: userId, jti });
    const tokenHash = hashToken(refreshToken);

    await prisma.refreshToken.create({
      data: {
        id: jti,
        userId,
        tokenHash,
        userAgent: req.headers['user-agent'] ?? null,
        ipAddress: req.ip ?? null,
        expiresAt: parseExpiryToDate(config.JWT_REFRESH_EXPIRES_IN),
      },
    });

    return { accessToken, refreshToken };
  }

  private async recordFailedLogin(userId: string, currentCount: number): Promise<void> {
    const newCount = currentCount + 1;
    const updateData: Prisma.UserUpdateInput = {
      failedLoginCount: newCount,
    };
    if (newCount >= MAX_FAILED_ATTEMPTS) {
      updateData.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
      updateData.status = 'LOCKED';
    }
    await prisma.user.update({ where: { id: userId }, data: updateData });
  }

  private serializeUser(user: any) {
    const roles: Role[] = user.userRoles.map((ur: { role: { slug: Role } }) => ur.role.slug);
    const permissions: Permission[] = Array.from(
      new Set(
        user.userRoles.flatMap((ur: {
          role: { rolePermissions: { permission: { slug: Permission } }[] };
        }) =>
          ur.role.rolePermissions.map((rp) => rp.permission.slug),
        ),
      ),
    ) as Permission[];

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      roles,
      permissions,
    };
  }
}

export const authService = new AuthService();
