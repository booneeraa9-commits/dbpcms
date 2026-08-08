import type { Prisma } from "@prisma/client";
import { prisma } from "../../core/db/prisma.js";

/** Data access for programs. All reads exclude soft-deleted rows. */
export const programsRepository = {
  async list(params: {
    skip: number;
    take: number;
    search?: string;
    departmentId?: string;
    orderBy?: Record<string, "asc" | "desc">;
  }) {
    const where: Prisma.ProgramWhereInput = {
      deletedAt: null,
      ...(params.departmentId ? { departmentId: params.departmentId } : {}),
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
      prisma.program.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: params.orderBy ?? { createdAt: "desc" },
        include: { department: { select: { id: true, name: true, code: true } } },
      }),
      prisma.program.count({ where }),
    ]);
    return { items, total };
  },

  async findById(id: string) {
    return prisma.program.findFirst({
      where: { id, deletedAt: null },
      include: { department: { select: { id: true, name: true, code: true } } },
    });
  },

  async findByCode(code: string) {
    return prisma.program.findFirst({ where: { code, deletedAt: null } });
  },

  async create(data: Prisma.ProgramCreateInput) {
    return prisma.program.create({ data });
  },

  async update(id: string, data: Prisma.ProgramUpdateInput) {
    return prisma.program.update({ where: { id }, data });
  },

  async softDelete(id: string, userId: string) {
    return prisma.program.update({
      where: { id },
      data: { deletedAt: new Date(), updatedBy: userId },
    });
  },
};
