/**
 * Users service — admin CRUD operations.
 *
 * Only users with `user:create`, `user:update`, `user:delete` permissions
 * can call these endpoints. The guards handle the checks; this service
 * assumes the caller is authorized.
 */

import { Prisma } from '@prisma/client';
import { prisma } from '../../infra/database/client';
import { hashPassword } from '../../common/utils/password';
import { normalizePagination, buildMeta } from '../../common/utils/pagination';
import { NotFoundError, ConflictError, BadRequestError } from '../../common/errors/AppError';
import { activityLog } from '../activity/activity.service';
import { sendSuccess as _ignored } from '../../common/utils/response';
import type { Request } from 'express';
import type { CreateUserInput, UpdateUserInput, ListUsersQuery } from './users.schema';
import type { PaginatedResponse, User } from '@dbpcms/shared';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _ = _ignored;

class UsersService {
  /**
   * List users with pagination, search, filters.
   */
  async list(req: Request, query: ListUsersQuery): Promise<PaginatedResponse<User>> {
    const pagination = normalizePagination(query);

    const where: Prisma.UserWhereInput = {
      deletedAt: null,
    };
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { email: { contains: query.search, mode: 'insensitive' } },
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.roleSlug) {
      where.userRoles = { some: { role: { slug: query.roleSlug } } };
    }

    const orderBy: Prisma.UserOrderByWithRelationInput = query.sortBy
      ? { [query.sortBy]: query.sortOrder ?? 'asc' }
      : { createdAt: 'desc' };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy,
        include: {
          userRoles: { include: { role: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    const items = users.map((u: unknown) => this.serialize(u as never));
    const meta = buildMeta(total, pagination.page, pagination.pageSize);
    return { items, meta };
  }

  /**
   * Get one user.
   */
  async getById(id: string): Promise<User> {
    const user = await prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: {
        userRoles: {
          include: {
            role: {
              include: { rolePermissions: { include: { permission: true } } },
            },
          },
        },
      },
    });
    if (!user) throw new NotFoundError('User');

    // Flatten roles and permissions
    const roles = user.userRoles.map((ur) => ur.role.slug);
    const permissions = Array.from(
      new Set(
        user.userRoles.flatMap((ur) =>
          ur.role.rolePermissions.map((rp) => rp.permission.slug),
        ),
      ),
    );

    return {
      ...this.serialize(user),
      roles: roles as User['roles'],
      permissions: permissions as User['permissions'],
    };
  }

  /**
   * Create a new user.
   */
  async create(req: Request, input: CreateUserInput, createdBy: string): Promise<User> {
    // Check email uniqueness
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw new ConflictError('A user with this email already exists');

    // Verify all role IDs exist
    const roles = await prisma.role.findMany({ where: { id: { in: input.roleIds } } });
    if (roles.length !== input.roleIds.length) {
      throw new BadRequestError('One or more role IDs are invalid');
    }

    // Prevent creating a user with super_admin role unless caller is super_admin
    const superAdminRole = roles.find((r) => r.slug === 'super_admin');
    if (superAdminRole) {
      const caller = await prisma.user.findUnique({
        where: { id: createdBy },
        include: { userRoles: { include: { role: true } } },
      });
      const callerIsSuperAdmin = caller?.userRoles.some((ur) => ur.role.slug === 'super_admin');
      if (!callerIsSuperAdmin) {
        throw new BadRequestError('Only super admins can create super admin users');
      }
    }

    const passwordHash = await hashPassword(input.password);

    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone || null,
        status: 'ACTIVE',
        emailVerified: true, // Admin-created users skip email verification
        passwordChangedAt: new Date(),
        userRoles: {
          create: input.roleIds.map((roleId) => ({ roleId })),
        },
      },
      include: {
        userRoles: { include: { role: true } },
      },
    });

    await activityLog.log(req, {
      userId: createdBy,
      action: 'CREATE',
      resource: 'user',
      resourceId: user.id,
      description: `Created user ${user.email}`,
    });

    return this.serialize(user) as User;
  }

  /**
   * Update a user.
   */
  async update(req: Request, id: string, input: UpdateUserInput, updatedBy: string): Promise<User> {
    const user = await prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!user) throw new NotFoundError('User');

    // Don't allow demoting yourself out of super_admin
    if (input.roleIds) {
      const roles = await prisma.role.findMany({ where: { id: { in: input.roleIds } } });
      if (roles.length !== input.roleIds.length) {
        throw new BadRequestError('One or more role IDs are invalid');
      }

      const caller = await prisma.user.findUnique({
        where: { id: updatedBy },
        include: { userRoles: { include: { role: true } } },
      });
      const callerIsSuperAdmin = caller?.userRoles.some((ur) => ur.role.slug === 'super_admin');
      const superAdminRole = roles.find((r) => r.slug === 'super_admin');
      if (superAdminRole && !callerIsSuperAdmin) {
        throw new BadRequestError('Only super admins can grant super admin role');
      }

      // If updating self and removing super_admin, prevent
      if (id === updatedBy) {
        const hadSuperAdmin = (await prisma.user.findUnique({
          where: { id: updatedBy },
          include: { userRoles: { include: { role: true } } },
        }))?.userRoles.some((ur) => ur.role.slug === 'super_admin');

        if (hadSuperAdmin && !superAdminRole) {
          throw new BadRequestError('You cannot remove your own super admin role');
        }
      }
    }

    // Email uniqueness check
    if (input.email && input.email !== user.email) {
      const existing = await prisma.user.findUnique({ where: { email: input.email } });
      if (existing) throw new ConflictError('A user with this email already exists');
    }

    const { roleIds, ...userFields } = input;

    const updated = await prisma.$transaction(async (tx) => {
      if (roleIds) {
        await tx.userRole.deleteMany({ where: { userId: id } });
        await tx.userRole.createMany({
          data: roleIds.map((roleId) => ({ userId: id, roleId })),
        });
      }
      return tx.user.update({
        where: { id },
        data: userFields,
        include: { userRoles: { include: { role: true } } },
      });
    });

    await activityLog.log(req, {
      userId: updatedBy,
      action: 'UPDATE',
      resource: 'user',
      resourceId: id,
      description: `Updated user ${updated.email}`,
    });

    return this.serialize(updated) as User;
  }

  /**
   * Soft delete a user.
   */
  async delete(req: Request, id: string, deletedBy: string): Promise<void> {
    const user = await prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!user) throw new NotFoundError('User');

    if (id === deletedBy) {
      throw new BadRequestError('You cannot delete your own account');
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id },
        data: { deletedAt: new Date(), status: 'INACTIVE' },
      }),
      prisma.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date(), revokedReason: 'User deleted' },
      }),
    ]);

    await activityLog.log(req, {
      userId: deletedBy,
      action: 'DELETE',
      resource: 'user',
      resourceId: id,
      description: `Deleted user ${user.email}`,
    });
  }

  /**
   * Get all roles (for the user form dropdown).
   */
  async getAllRoles() {
    return prisma.role.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, slug: true, name: true, description: true },
    });
  }

  // ─── Helpers ────────────────────────────────────────
  private serialize(user: any): User {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      isActive: user.status === 'ACTIVE',
      emailVerified: user.emailVerified,
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      roles: (user.userRoles ?? []).map((ur: any) => ur.role.slug),
      permissions: [],
    } as User;
  }
}

export const usersService = new UsersService();
