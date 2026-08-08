import { programCreateSchema, programUpdateSchema } from "@dbpcms/shared";
import { ConflictError, NotFoundError } from "../../core/errors/app-error.js";
import { writeAudit } from "../../core/audit/audit.js";
import { parseListQuery } from "../../core/http/query.js";
import { prisma } from "../../core/db/prisma.js";
import { programsRepository } from "./programs.repository.js";

interface ActorMeta {
  userId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export const programsService = {
  async list(rawQuery: Record<string, unknown>) {
    const q = parseListQuery(rawQuery, ["name", "code", "createdAt"], {
      createdAt: "desc",
    });
    const departmentId =
      typeof rawQuery.department === "string" ? rawQuery.department : undefined;
    const { items, total } = await programsRepository.list({
      skip: q.skip,
      take: q.take,
      search: q.search,
      departmentId,
      orderBy: q.orderBy,
    });
    return { items, total, page: q.page, pageSize: q.pageSize };
  },

  async getById(id: string) {
    const program = await programsRepository.findById(id);
    if (!program) throw new NotFoundError("Program not found.");
    return program;
  },

  async create(rawInput: unknown, actor: ActorMeta) {
    const input = programCreateSchema.parse(rawInput);

    // The referenced department must exist.
    const dept = await prisma.department.findFirst({
      where: { id: input.departmentId, deletedAt: null },
    });
    if (!dept) throw new NotFoundError("Selected department does not exist.");

    const clash = await programsRepository.findByCode(input.code);
    if (clash) {
      throw new ConflictError(`A program with code "${input.code}" already exists.`);
    }

    const created = await programsRepository.create({
      name: input.name,
      code: input.code,
      degreeLevel: input.degreeLevel,
      durationYears: input.durationYears,
      isActive: input.isActive,
      department: { connect: { id: input.departmentId } },
      createdBy: actor.userId,
      updatedBy: actor.userId,
    });
    await writeAudit({
      userId: actor.userId,
      action: "program.create",
      entityType: "Program",
      entityId: created.id,
      after: created,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });
    return created;
  },

  async update(id: string, rawInput: unknown, actor: ActorMeta) {
    const input = programUpdateSchema.parse(rawInput);
    const before = await programsRepository.findById(id);
    if (!before) throw new NotFoundError("Program not found.");

    if (input.code && input.code !== before.code) {
      const clash = await programsRepository.findByCode(input.code);
      if (clash) {
        throw new ConflictError(`A program with code "${input.code}" already exists.`);
      }
    }
    if (input.departmentId && input.departmentId !== before.departmentId) {
      const dept = await prisma.department.findFirst({
        where: { id: input.departmentId, deletedAt: null },
      });
      if (!dept) throw new NotFoundError("Selected department does not exist.");
    }

    const updated = await programsRepository.update(id, {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.code !== undefined ? { code: input.code } : {}),
      ...(input.degreeLevel !== undefined ? { degreeLevel: input.degreeLevel } : {}),
      ...(input.durationYears !== undefined
        ? { durationYears: input.durationYears }
        : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.departmentId !== undefined
        ? { department: { connect: { id: input.departmentId } } }
        : {}),
      updatedBy: actor.userId,
      version: { increment: 1 },
    });
    await writeAudit({
      userId: actor.userId,
      action: "program.update",
      entityType: "Program",
      entityId: id,
      before,
      after: updated,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });
    return updated;
  },

  async remove(id: string, actor: ActorMeta) {
    const before = await programsRepository.findById(id);
    if (!before) throw new NotFoundError("Program not found.");
    await programsRepository.softDelete(id, actor.userId);
    await writeAudit({
      userId: actor.userId,
      action: "program.delete",
      entityType: "Program",
      entityId: id,
      before,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });
  },
};
