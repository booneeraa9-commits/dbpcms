import argon2 from "argon2";
import {
  userCreateSchema,
  userUpdateSchema,
  adminResetPasswordSchema,
  ROLES,
} from "@dbpcms/shared";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "../../core/errors/app-error.js";
import { writeAudit } from "../../core/audit/audit.js";
import { parseListQuery } from "../../core/http/query.js";
import { prisma } from "../../core/db/prisma.js";
import { usersRepository } from "./users.repository.js";

interface ActorMeta {
  userId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * User & role management with SELF-LOCKOUT PROTECTION:
 *  - you cannot deactivate or delete your own account,
 *  - you cannot remove the administrator role from yourself,
 *  - the last remaining administrator cannot be removed/deactivated.
 * These guards prevent an admin from locking everyone out of the system.
 */
export const usersService = {
  async list(rawQuery: Record<string, unknown>) {
    const q = parseListQuery(rawQuery, ["fullName", "email", "createdAt"], {
      createdAt: "desc",
    });
    const { items, total } = await usersRepository.list({
      skip: q.skip,
      take: q.take,
      search: q.search,
      orderBy: q.orderBy,
    });
    // Flatten roles for the client.
    const shaped = items.map((u) => ({
      ...u,
      roles: u.roles.map((r) => r.role),
    }));
    return { items: shaped, total, page: q.page, pageSize: q.pageSize };
  },

  async listRoles() {
    return usersRepository.listRoles();
  },

  async getById(id: string) {
    const user = await usersRepository.findById(id);
    if (!user) throw new NotFoundError("User not found.");
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      isActive: user.isActive,
      mustChangePassword: user.mustChangePassword,
      lastLoginAt: user.lastLoginAt,
      roles: user.roles.map((r) => ({ id: r.role.id, name: r.role.name })),
    };
  },

  async create(rawInput: unknown, actor: ActorMeta) {
    const input = userCreateSchema.parse(rawInput);

    const existing = await usersRepository.findByEmail(input.email);
    if (existing) {
      throw new ConflictError("A user with that email already exists.");
    }
    if (!(await usersRepository.rolesExist(input.roleIds))) {
      throw new NotFoundError("One or more selected roles do not exist.");
    }

    const passwordHash = await argon2.hash(input.temporaryPassword, {
      type: argon2.argon2id,
    });

    const created = await prisma.user.create({
      data: {
        fullName: input.fullName,
        email: input.email,
        passwordHash,
        isActive: input.isActive,
        mustChangePassword: true, // force change on first login
        roles: { create: input.roleIds.map((roleId) => ({ roleId })) },
      },
      include: { roles: { include: { role: true } } },
    });

    await writeAudit({
      userId: actor.userId,
      action: "user.create",
      entityType: "User",
      entityId: created.id,
      after: { email: created.email, roles: input.roleIds },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });
    return this.getById(created.id);
  },

  async update(id: string, rawInput: unknown, actor: ActorMeta) {
    const input = userUpdateSchema.parse(rawInput);
    const before = await usersRepository.findById(id);
    if (!before) throw new NotFoundError("User not found.");

    const isSelf = id === actor.userId;
    const beforeRoleNames = before.roles.map((r) => r.role.name);

    // Guard: cannot deactivate yourself.
    if (isSelf && input.isActive === false) {
      throw new ForbiddenError("You cannot deactivate your own account.");
    }

    // Guard: cannot remove your own administrator role.
    if (
      isSelf &&
      input.roleIds &&
      beforeRoleNames.includes(ROLES.SYSTEM_ADMINISTRATOR)
    ) {
      const willStillBeAdmin = await this.roleIdsIncludeAdmin(input.roleIds);
      if (!willStillBeAdmin) {
        throw new ForbiddenError(
          "You cannot remove your own administrator role.",
        );
      }
    }

    // Guard: protect the LAST administrator.
    if (
      beforeRoleNames.includes(ROLES.SYSTEM_ADMINISTRATOR) &&
      ((input.roleIds && !(await this.roleIdsIncludeAdmin(input.roleIds))) ||
        input.isActive === false)
    ) {
      const otherAdmins = await this.countOtherActiveAdmins(id);
      if (otherAdmins === 0) {
        throw new ForbiddenError(
          "This is the last active administrator and cannot be demoted or deactivated.",
        );
      }
    }

    if (input.roleIds && !(await usersRepository.rolesExist(input.roleIds))) {
      throw new NotFoundError("One or more selected roles do not exist.");
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: {
          ...(input.fullName !== undefined ? { fullName: input.fullName } : {}),
          ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
          version: { increment: 1 },
        },
      });
      if (input.roleIds) {
        await tx.userRole.deleteMany({ where: { userId: id } });
        await tx.userRole.createMany({
          data: input.roleIds.map((roleId) => ({ userId: id, roleId })),
        });
      }
    });

    await writeAudit({
      userId: actor.userId,
      action: "user.update",
      entityType: "User",
      entityId: id,
      before: { isActive: before.isActive, roles: beforeRoleNames },
      after: { isActive: input.isActive, roles: input.roleIds },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });
    return this.getById(id);
  },

  async resetPassword(id: string, rawInput: unknown, actor: ActorMeta) {
    const input = adminResetPasswordSchema.parse(rawInput);
    const user = await usersRepository.findById(id);
    if (!user) throw new NotFoundError("User not found.");

    const passwordHash = await argon2.hash(input.temporaryPassword, {
      type: argon2.argon2id,
    });
    // Reset password, force change, and invalidate all their sessions.
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: {
          passwordHash,
          mustChangePassword: true,
          tokenVersion: { increment: 1 },
        },
      });
      await tx.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });

    await writeAudit({
      userId: actor.userId,
      action: "user.reset-password",
      entityType: "User",
      entityId: id,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });
  },

  async remove(id: string, actor: ActorMeta) {
    if (id === actor.userId) {
      throw new ForbiddenError("You cannot delete your own account.");
    }
    const before = await usersRepository.findById(id);
    if (!before) throw new NotFoundError("User not found.");

    const beforeRoleNames = before.roles.map((r) => r.role.name);
    if (beforeRoleNames.includes(ROLES.SYSTEM_ADMINISTRATOR)) {
      const otherAdmins = await this.countOtherActiveAdmins(id);
      if (otherAdmins === 0) {
        throw new ForbiddenError(
          "This is the last active administrator and cannot be deleted.",
        );
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          isActive: false,
          tokenVersion: { increment: 1 },
        },
      });
      await tx.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });

    await writeAudit({
      userId: actor.userId,
      action: "user.delete",
      entityType: "User",
      entityId: id,
      before: { email: before.email, roles: beforeRoleNames },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });
  },

  // --- helpers -------------------------------------------------------------
  async roleIdsIncludeAdmin(roleIds: string[]): Promise<boolean> {
    const adminRole = await prisma.role.findUnique({
      where: { name: ROLES.SYSTEM_ADMINISTRATOR },
    });
    return adminRole ? roleIds.includes(adminRole.id) : false;
  },

  async countOtherActiveAdmins(excludeUserId: string): Promise<number> {
    return prisma.user.count({
      where: {
        id: { not: excludeUserId },
        deletedAt: null,
        isActive: true,
        roles: { some: { role: { name: ROLES.SYSTEM_ADMINISTRATOR } } },
      },
    });
  },
};
