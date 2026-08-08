import type { Prisma } from "@prisma/client";
import {
  studentCreateSchema,
  studentUpdateSchema,
  SETTING_KEYS,
} from "@dbpcms/shared";
import { ConflictError, NotFoundError } from "../../core/errors/app-error.js";
import { writeAudit } from "../../core/audit/audit.js";
import { parseListQuery } from "../../core/http/query.js";
import { prisma } from "../../core/db/prisma.js";
import { settingsService } from "../settings/settings.service.js";

interface ActorMeta {
  userId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

const emptyToNull = (v?: string): string | null => (v && v.length > 0 ? v : null);

async function nextStudentNumber(
  tx: Prisma.TransactionClient,
  prefix: string,
  year = new Date().getFullYear(),
): Promise<string> {
  await tx.studentNumberSequence.upsert({
    where: { year },
    update: {},
    create: { year, lastValue: 0 },
  });
  const updated = await tx.studentNumberSequence.update({
    where: { year },
    data: { lastValue: { increment: 1 } },
  });
  return `${prefix}-${year}-${String(updated.lastValue).padStart(5, "0")}`;
}

const include = {
  department: { select: { id: true, name: true, code: true } },
  program: { select: { id: true, name: true, code: true } },
};

export const studentsService = {
  async list(rawQuery: Record<string, unknown>) {
    const q = parseListQuery(
      rawQuery,
      ["lastName", "firstName", "studentNumber", "createdAt"],
      { createdAt: "desc" },
    );
    const where: Prisma.StudentWhereInput = {
      deletedAt: null,
      ...(typeof rawQuery.department === "string" ? { departmentId: rawQuery.department } : {}),
      ...(typeof rawQuery.program === "string" ? { programId: rawQuery.program } : {}),
      ...(typeof rawQuery.status === "string" ? { status: rawQuery.status } : {}),
      ...(q.search
        ? {
            OR: [
              { firstName: { contains: q.search, mode: "insensitive" } },
              { lastName: { contains: q.search, mode: "insensitive" } },
              { studentNumber: { contains: q.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      prisma.student.findMany({ where, skip: q.skip, take: q.take, orderBy: q.orderBy, include }),
      prisma.student.count({ where }),
    ]);
    return { items, total, page: q.page, pageSize: q.pageSize };
  },

  async getById(id: string) {
    const student = await prisma.student.findFirst({ where: { id, deletedAt: null }, include });
    if (!student) throw new NotFoundError("Student not found.");
    return student;
  },

  async create(rawInput: unknown, actor: ActorMeta) {
    const input = studentCreateSchema.parse(rawInput);

    const dept = await prisma.department.findFirst({ where: { id: input.departmentId, deletedAt: null } });
    if (!dept) throw new NotFoundError("Selected department does not exist.");
    const program = await prisma.program.findFirst({ where: { id: input.programId, deletedAt: null } });
    if (!program) throw new NotFoundError("Selected program does not exist.");
    if (program.departmentId !== input.departmentId) {
      throw new ConflictError("The selected program does not belong to the selected department.");
    }

    const prefix = await settingsService.get(SETTING_KEYS.STUDENT_ID_PREFIX);

    const created = await prisma.$transaction(async (tx) => {
      const studentNumber = await nextStudentNumber(tx, prefix);
      return tx.student.create({
        data: {
          studentNumber,
          firstName: input.firstName,
          middleName: emptyToNull(input.middleName),
          lastName: input.lastName,
          gender: input.gender,
          dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
          email: emptyToNull(input.email),
          phoneNumber: emptyToNull(input.phoneNumber),
          departmentId: input.departmentId,
          programId: input.programId,
          batch: emptyToNull(input.batch),
          section: emptyToNull(input.section),
          status: input.status,
          createdBy: actor.userId,
          updatedBy: actor.userId,
        },
      });
    });

    await writeAudit({
      userId: actor.userId,
      action: "student.create",
      entityType: "Student",
      entityId: created.id,
      after: { studentNumber: created.studentNumber, name: `${created.firstName} ${created.lastName}` },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });
    return this.getById(created.id);
  },

  async update(id: string, rawInput: unknown, actor: ActorMeta) {
    const input = studentUpdateSchema.parse(rawInput);
    const before = await prisma.student.findFirst({ where: { id, deletedAt: null } });
    if (!before) throw new NotFoundError("Student not found.");

    const data: Record<string, unknown> = { updatedBy: actor.userId, version: { increment: 1 } };
    const setIf = (k: keyof typeof input, t?: (v: string) => unknown) => {
      const v = input[k];
      if (v !== undefined) data[k] = t ? t(v as string) : v;
    };
    setIf("firstName"); setIf("middleName", emptyToNull); setIf("lastName");
    setIf("gender"); setIf("dateOfBirth", (v) => (v ? new Date(v) : null));
    setIf("email", emptyToNull); setIf("phoneNumber", emptyToNull);
    setIf("departmentId"); setIf("programId");
    setIf("batch", emptyToNull); setIf("section", emptyToNull); setIf("status");

    await prisma.student.update({ where: { id }, data });
    await writeAudit({
      userId: actor.userId, action: "student.update", entityType: "Student", entityId: id,
      before: { status: before.status }, after: { status: input.status },
      ipAddress: actor.ipAddress, userAgent: actor.userAgent,
    });
    return this.getById(id);
  },

  async remove(id: string, actor: ActorMeta) {
    const before = await prisma.student.findFirst({ where: { id, deletedAt: null } });
    if (!before) throw new NotFoundError("Student not found.");
    await prisma.student.update({ where: { id }, data: { deletedAt: new Date(), updatedBy: actor.userId } });
    await writeAudit({
      userId: actor.userId, action: "student.delete", entityType: "Student", entityId: id,
      before: { studentNumber: before.studentNumber }, ipAddress: actor.ipAddress, userAgent: actor.userAgent,
    });
  },
};
