import type { Prisma } from "@prisma/client";
import { courseCreateSchema, courseUpdateSchema } from "@dbpcms/shared";
import { ConflictError, NotFoundError } from "../../core/errors/app-error.js";
import { writeAudit } from "../../core/audit/audit.js";
import { parseListQuery } from "../../core/http/query.js";
import { prisma } from "../../core/db/prisma.js";

interface ActorMeta {
  userId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}
const emptyToNull = (v?: string): string | null => (v && v.length > 0 ? v : null);

export const coursesService = {
  async list(rawQuery: Record<string, unknown>) {
    const q = parseListQuery(rawQuery, ["code", "title", "createdAt"], { createdAt: "desc" });
    const where: Prisma.CourseWhereInput = {
      deletedAt: null,
      ...(typeof rawQuery.program === "string" ? { programId: rawQuery.program } : {}),
      ...(q.search
        ? {
            OR: [
              { code: { contains: q.search, mode: "insensitive" } },
              { title: { contains: q.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      prisma.course.findMany({
        where, skip: q.skip, take: q.take, orderBy: q.orderBy,
        include: { program: { select: { id: true, name: true, code: true } } },
      }),
      prisma.course.count({ where }),
    ]);
    return { items, total, page: q.page, pageSize: q.pageSize };
  },

  async create(rawInput: unknown, actor: ActorMeta) {
    const input = courseCreateSchema.parse(rawInput);
    const clash = await prisma.course.findFirst({ where: { code: input.code, deletedAt: null } });
    if (clash) throw new ConflictError(`A course with code "${input.code}" already exists.`);
    if (input.programId) {
      const p = await prisma.program.findFirst({ where: { id: input.programId, deletedAt: null } });
      if (!p) throw new NotFoundError("Selected program does not exist.");
    }
    const created = await prisma.course.create({
      data: {
        code: input.code, title: input.title, creditHours: input.creditHours,
        category: emptyToNull(input.category), programId: input.programId || null,
        isActive: input.isActive, createdBy: actor.userId, updatedBy: actor.userId,
      },
    });
    await writeAudit({
      userId: actor.userId, action: "course.create", entityType: "Course", entityId: created.id,
      after: { code: created.code }, ipAddress: actor.ipAddress, userAgent: actor.userAgent,
    });
    return created;
  },

  async update(id: string, rawInput: unknown, actor: ActorMeta) {
    const input = courseUpdateSchema.parse(rawInput);
    const before = await prisma.course.findFirst({ where: { id, deletedAt: null } });
    if (!before) throw new NotFoundError("Course not found.");
    if (input.code && input.code !== before.code) {
      const clash = await prisma.course.findFirst({ where: { code: input.code, deletedAt: null } });
      if (clash) throw new ConflictError(`A course with code "${input.code}" already exists.`);
    }
    const data: Record<string, unknown> = { updatedBy: actor.userId, version: { increment: 1 } };
    if (input.code !== undefined) data.code = input.code;
    if (input.title !== undefined) data.title = input.title;
    if (input.creditHours !== undefined) data.creditHours = input.creditHours;
    if (input.category !== undefined) data.category = emptyToNull(input.category);
    if (input.isActive !== undefined) data.isActive = input.isActive;
    if (input.programId !== undefined) data.programId = input.programId || null;
    const updated = await prisma.course.update({ where: { id }, data });
    await writeAudit({
      userId: actor.userId, action: "course.update", entityType: "Course", entityId: id,
      ipAddress: actor.ipAddress, userAgent: actor.userAgent,
    });
    return updated;
  },

  async remove(id: string, actor: ActorMeta) {
    const before = await prisma.course.findFirst({ where: { id, deletedAt: null } });
    if (!before) throw new NotFoundError("Course not found.");
    const sectionCount = await prisma.section.count({ where: { courseId: id, deletedAt: null } });
    if (sectionCount > 0) {
      throw new ConflictError("Cannot delete a course that has sections. Remove its sections first.");
    }
    await prisma.course.update({ where: { id }, data: { deletedAt: new Date(), updatedBy: actor.userId } });
    await writeAudit({
      userId: actor.userId, action: "course.delete", entityType: "Course", entityId: id,
      before: { code: before.code }, ipAddress: actor.ipAddress, userAgent: actor.userAgent,
    });
  },
};
