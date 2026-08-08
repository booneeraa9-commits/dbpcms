import type { Prisma } from "@prisma/client";
import { prisma } from "../../core/db/prisma.js";

/**
 * The only place that runs database queries for departments.
 * Every read filters out soft-deleted rows (deletedAt: null) by default.
 */
export const departmentsRepository = {
  async list(params: {
    skip: number;
    take: number;
    search?: string;
    orderBy?: Record<string, "asc" | "desc">;
  }) {
    const where: Prisma.DepartmentWhereInput = {
      deletedAt: null,
      ...(params.search
        ? {
            OR: [
              { name: { contains: params.search, mode: "insensitive" } },
              { code: { contains: params.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.department.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: params.orderBy ?? { createdAt: "desc" },
      }),
      prisma.department.count({ where }),
    ]);
    return { items, total };
  },

  async findById(id: string) {
    return prisma.department.findFirst({ where: { id, deletedAt: null } });
  },

  async findByCode(code: string) {
    return prisma.department.findFirst({
      where: { code, deletedAt: null },
    });
  },

  async create(data: Prisma.DepartmentCreateInput) {
    return prisma.department.create({ data });
  },

  async update(id: string, data: Prisma.DepartmentUpdateInput) {
    return prisma.department.update({ where: { id }, data });
  },

  async softDelete(id: string, userId: string) {
    return prisma.department.update({
      where: { id },
      data: { deletedAt: new Date(), updatedBy: userId },
    });
  },

  async countActivePrograms(departmentId: string) {
    return prisma.program.count({
      where: { departmentId, deletedAt: null },
    });
  },
};
