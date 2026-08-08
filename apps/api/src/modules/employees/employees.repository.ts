import type { Prisma } from "@prisma/client";
import { prisma } from "../../core/db/prisma.js";

const departmentSelect = { select: { id: true, name: true, code: true } };
const supervisorSelect = {
  select: { id: true, firstName: true, lastName: true, employeeNumber: true },
};

/** Data access for employees. Reads exclude soft-deleted rows. */
export const employeesRepository = {
  async list(params: {
    skip: number;
    take: number;
    search?: string;
    departmentId?: string;
    employmentStatus?: string;
    orderBy?: Record<string, "asc" | "desc">;
  }) {
    const where: Prisma.EmployeeWhereInput = {
      deletedAt: null,
      ...(params.departmentId ? { departmentId: params.departmentId } : {}),
      ...(params.employmentStatus
        ? { employmentStatus: params.employmentStatus }
        : {}),
      ...(params.search
        ? {
            OR: [
              { firstName: { contains: params.search, mode: "insensitive" } },
              { lastName: { contains: params.search, mode: "insensitive" } },
              { employeeNumber: { contains: params.search, mode: "insensitive" } },
              { email: { contains: params.search, mode: "insensitive" } },
              { position: { contains: params.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: params.orderBy ?? { createdAt: "desc" },
        include: { department: departmentSelect },
      }),
      prisma.employee.count({ where }),
    ]);
    return { items, total };
  },

  async findById(id: string) {
    return prisma.employee.findFirst({
      where: { id, deletedAt: null },
      include: { department: departmentSelect, supervisor: supervisorSelect },
    });
  },

  async findByNationalId(nationalId: string) {
    return prisma.employee.findFirst({
      where: { nationalId, deletedAt: null },
    });
  },

  async update(id: string, data: Prisma.EmployeeUpdateInput) {
    return prisma.employee.update({ where: { id }, data });
  },

  async softDelete(id: string, userId: string) {
    return prisma.employee.update({
      where: { id },
      data: { deletedAt: new Date(), updatedBy: userId },
    });
  },
};
