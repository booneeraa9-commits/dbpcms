import type { Prisma } from "@prisma/client";
import { prisma } from "../../core/db/prisma.js";

/** Data access for user & role management. Reads exclude soft-deleted users. */
export const usersRepository = {
  async list(params: {
    skip: number;
    take: number;
    search?: string;
    orderBy?: Record<string, "asc" | "desc">;
  }) {
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(params.search
        ? {
            OR: [
              { fullName: { contains: params.search, mode: "insensitive" } },
              { email: { contains: params.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: params.orderBy ?? { createdAt: "desc" },
        select: {
          id: true,
          fullName: true,
          email: true,
          isActive: true,
          mustChangePassword: true,
          lastLoginAt: true,
          createdAt: true,
          roles: { select: { role: { select: { id: true, name: true } } } },
        },
      }),
      prisma.user.count({ where }),
    ]);
    return { items, total };
  },

  async findById(id: string) {
    return prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: { roles: { include: { role: true } } },
    });
  },

  async findByEmail(email: string) {
    return prisma.user.findFirst({ where: { email, deletedAt: null } });
  },

  async listRoles() {
    return prisma.role.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, description: true },
    });
  },

  async rolesExist(roleIds: string[]): Promise<boolean> {
    const count = await prisma.role.count({ where: { id: { in: roleIds } } });
    return count === roleIds.length;
  },
};
