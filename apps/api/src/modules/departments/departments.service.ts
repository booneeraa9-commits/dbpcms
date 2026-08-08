import {
  departmentCreateSchema,
  departmentUpdateSchema,
} from "@dbpcms/shared";
import {
  ConflictError,
  NotFoundError,
} from "../../core/errors/app-error.js";
import { writeAudit } from "../../core/audit/audit.js";
import { departmentsRepository } from "./departments.repository.js";

interface ActorMeta {
  userId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Business rules for departments:
 *  - code must be unique (among non-deleted),
 *  - deleting is a SOFT delete and is blocked if programs still reference it,
 *  - every mutation writes an audit log entry.
 */
export const departmentsService = {
  async list(rawQuery: unknown) {
    const { parseListQuery } = await import("../../core/http/query.js");
    const q = parseListQuery(rawQuery, ["name", "code", "createdAt"], {
      createdAt: "desc",
    });
    const { items, total } = await departmentsRepository.list({
      skip: q.skip,
      take: q.take,
      search: q.search,
      orderBy: q.orderBy,
    });
    return { items, total, page: q.page, pageSize: q.pageSize };
  },

  async getById(id: string) {
    const department = await departmentsRepository.findById(id);
    if (!department) throw new NotFoundError("Department not found.");
    return department;
  },

  async create(rawInput: unknown, actor: ActorMeta) {
    const input = departmentCreateSchema.parse(rawInput);

    const existing = await departmentsRepository.findByCode(input.code);
    if (existing) {
      throw new ConflictError(`A department with code "${input.code}" already exists.`);
    }

    const created = await departmentsRepository.create({
      name: input.name,
      code: input.code,
      description: input.description || null,
      isActive: input.isActive,
      createdBy: actor.userId,
      updatedBy: actor.userId,
    });

    await writeAudit({
      userId: actor.userId,
      action: "department.create",
      entityType: "Department",
      entityId: created.id,
      after: created,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });
    return created;
  },

  async update(id: string, rawInput: unknown, actor: ActorMeta) {
    const input = departmentUpdateSchema.parse(rawInput);
    const before = await departmentsRepository.findById(id);
    if (!before) throw new NotFoundError("Department not found.");

    if (input.code && input.code !== before.code) {
      const clash = await departmentsRepository.findByCode(input.code);
      if (clash) {
        throw new ConflictError(`A department with code "${input.code}" already exists.`);
      }
    }

    const updated = await departmentsRepository.update(id, {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.code !== undefined ? { code: input.code } : {}),
      ...(input.description !== undefined
        ? { description: input.description || null }
        : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      updatedBy: actor.userId,
      version: { increment: 1 },
    });

    await writeAudit({
      userId: actor.userId,
      action: "department.update",
      entityType: "Department",
      entityId: id,
      before,
      after: updated,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });
    return updated;
  },

  async remove(id: string, actor: ActorMeta) {
    const before = await departmentsRepository.findById(id);
    if (!before) throw new NotFoundError("Department not found.");

    const programCount = await departmentsRepository.countActivePrograms(id);
    if (programCount > 0) {
      throw new ConflictError(
        "Cannot delete a department that still has programs. Remove or reassign its programs first.",
      );
    }

    await departmentsRepository.softDelete(id, actor.userId);
    await writeAudit({
      userId: actor.userId,
      action: "department.delete",
      entityType: "Department",
      entityId: id,
      before,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });
  },
};
