import { academicYearCreateSchema } from "@dbpcms/shared";
import { ConflictError, NotFoundError } from "../../core/errors/app-error.js";
import { writeAudit } from "../../core/audit/audit.js";
import { parseListQuery } from "../../core/http/query.js";
import { prisma } from "../../core/db/prisma.js";

interface ActorMeta {
  userId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Academic years. Business rule: exactly one year can be "current" — setting a
 * new current year clears the flag on all others, inside a transaction.
 */
export const academicYearsService = {
  async list(rawQuery: Record<string, unknown>) {
    const q = parseListQuery(rawQuery, ["name", "startDate", "createdAt"], {
      startDate: "desc",
    });
    const where = {
      deletedAt: null,
      ...(q.search
        ? { name: { contains: q.search, mode: "insensitive" as const } }
        : {}),
    };
    const [items, total] = await Promise.all([
      prisma.academicYear.findMany({
        where,
        skip: q.skip,
        take: q.take,
        orderBy: q.orderBy,
      }),
      prisma.academicYear.count({ where }),
    ]);
    return { items, total, page: q.page, pageSize: q.pageSize };
  },

  async create(rawInput: unknown, actor: ActorMeta) {
    const input = academicYearCreateSchema.parse(rawInput);
    const clash = await prisma.academicYear.findFirst({
      where: { name: input.name, deletedAt: null },
    });
    if (clash) throw new ConflictError(`Academic year "${input.name}" already exists.`);

    const created = await prisma.academicYear.create({
      data: {
        name: input.name,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        createdBy: actor.userId,
        updatedBy: actor.userId,
      },
    });
    await writeAudit({
      userId: actor.userId,
      action: "academic-year.create",
      entityType: "AcademicYear",
      entityId: created.id,
      after: created,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });
    return created;
  },

  async setCurrent(id: string, actor: ActorMeta) {
    const year = await prisma.academicYear.findFirst({
      where: { id, deletedAt: null },
    });
    if (!year) throw new NotFoundError("Academic year not found.");

    await prisma.$transaction([
      prisma.academicYear.updateMany({
        where: { isCurrent: true },
        data: { isCurrent: false },
      }),
      prisma.academicYear.update({
        where: { id },
        data: { isCurrent: true, updatedBy: actor.userId },
      }),
    ]);
    await writeAudit({
      userId: actor.userId,
      action: "academic-year.set-current",
      entityType: "AcademicYear",
      entityId: id,
      after: { isCurrent: true },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });
    return prisma.academicYear.findUnique({ where: { id } });
  },

  async remove(id: string, actor: ActorMeta) {
    const before = await prisma.academicYear.findFirst({
      where: { id, deletedAt: null },
    });
    if (!before) throw new NotFoundError("Academic year not found.");
    const semesterCount = await prisma.semester.count({
      where: { academicYearId: id, deletedAt: null },
    });
    if (semesterCount > 0) {
      throw new ConflictError(
        "Cannot delete an academic year that still has semesters.",
      );
    }
    await prisma.academicYear.update({
      where: { id },
      data: { deletedAt: new Date(), updatedBy: actor.userId },
    });
    await writeAudit({
      userId: actor.userId,
      action: "academic-year.delete",
      entityType: "AcademicYear",
      entityId: id,
      before,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });
  },
};
