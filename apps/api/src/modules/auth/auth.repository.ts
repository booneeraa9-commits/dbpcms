import { prisma } from "../../core/db/prisma.js";

/**
 * The ONLY place that runs database queries for authentication. If we ever
 * change how data is stored, only this file changes — services stay the same.
 */
export const authRepository = {
  /** Find an active (non-deleted) user by email, with roles & permissions. */
  async findUserByEmail(email: string) {
    return prisma.user.findFirst({
      where: { email: email.toLowerCase().trim(), deletedAt: null },
      include: {
        roles: {
          include: {
            role: { include: { permissions: { include: { permission: true } } } },
          },
        },
      },
    });
  },

  /** Find a user by id, with roles & permissions (used by /auth/me). */
  async findUserById(id: string) {
    return prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: {
        roles: {
          include: {
            role: { include: { permissions: { include: { permission: true } } } },
          },
        },
      },
    });
  },

  async recordFailedLogin(userId: string, count: number, lockedUntil: Date | null) {
    return prisma.user.update({
      where: { id: userId },
      data: { failedLoginCount: count, lockedUntil },
    });
  },

  async recordSuccessfulLogin(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
    });
  },

  async createRefreshToken(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    ipAddress?: string | null;
    userAgent?: string | null;
  }) {
    return prisma.refreshToken.create({ data });
  },

  async findValidRefreshToken(tokenHash: string) {
    return prisma.refreshToken.findFirst({
      where: { tokenHash, revokedAt: null, expiresAt: { gt: new Date() } },
    });
  },

  async revokeRefreshToken(tokenHash: string) {
    return prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },

  async updatePassword(userId: string, passwordHash: string) {
    // Bump tokenVersion to invalidate all existing access tokens, and revoke
    // all refresh tokens — a password change logs out every session.
    return prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          passwordHash,
          mustChangePassword: false,
          tokenVersion: { increment: 1 },
        },
      });
      await tx.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });
  },

  async writeAuditLog(data: {
    userId?: string | null;
    action: string;
    entityType?: string | null;
    entityId?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
  }) {
    return prisma.auditLog.create({ data });
  },
};
