import {
  educationSchema,
  qualificationSchema,
  employmentHistorySchema,
  emergencyContactSchema,
} from "@dbpcms/shared";
import type { ZodSchema } from "zod";
import { NotFoundError } from "../../core/errors/app-error.js";
import { writeAudit } from "../../core/audit/audit.js";
import { prisma } from "../../core/db/prisma.js";

interface ActorMeta {
  userId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * The four employee sub-record types share the same CRUD shape, so we describe
 * each with a small config and reuse one generic service. This avoids four
 * near-identical files (DRY) while keeping behaviour explicit.
 */
type SubKind = "education" | "qualification" | "history" | "emergency";

interface SubConfig {
  schema: ZodSchema;
  auditEntity: string;
  // Maps validated input to the DB shape (handles dates/empty strings).
  toData: (input: Record<string, unknown>) => Record<string, unknown>;
  // The Prisma delegate name.
  model:
    | "employeeEducation"
    | "employeeQualification"
    | "employmentHistory"
    | "emergencyContact";
}

const emptyToNull = (v: unknown): string | null =>
  typeof v === "string" && v.length > 0 ? v : null;
const toDate = (v: unknown): Date | null =>
  typeof v === "string" && v.length > 0 ? new Date(v) : null;
const toIntOrNull = (v: unknown): number | null =>
  typeof v === "number" ? v : v === "" || v === undefined ? null : Number(v);

const CONFIGS: Record<SubKind, SubConfig> = {
  education: {
    schema: educationSchema,
    auditEntity: "EmployeeEducation",
    model: "employeeEducation",
    toData: (i) => ({
      institution: i.institution,
      qualification: i.qualification,
      fieldOfStudy: emptyToNull(i.fieldOfStudy),
      graduationYear: toIntOrNull(i.graduationYear),
      gpa: emptyToNull(i.gpa),
    }),
  },
  qualification: {
    schema: qualificationSchema,
    auditEntity: "EmployeeQualification",
    model: "employeeQualification",
    toData: (i) => ({
      type: i.type,
      title: i.title,
      issuer: emptyToNull(i.issuer),
      issueDate: toDate(i.issueDate),
      expiryDate: toDate(i.expiryDate),
      referenceNo: emptyToNull(i.referenceNo),
    }),
  },
  history: {
    schema: employmentHistorySchema,
    auditEntity: "EmploymentHistory",
    model: "employmentHistory",
    toData: (i) => ({
      employer: i.employer,
      position: i.position,
      startDate: toDate(i.startDate),
      endDate: toDate(i.endDate),
      responsibilities: emptyToNull(i.responsibilities),
    }),
  },
  emergency: {
    schema: emergencyContactSchema,
    auditEntity: "EmergencyContact",
    model: "emergencyContact",
    toData: (i) => ({
      name: i.name,
      relationship: emptyToNull(i.relationship),
      phoneNumber: i.phoneNumber,
      address: emptyToNull(i.address),
    }),
  },
};

async function ensureEmployeeExists(employeeId: string): Promise<void> {
  const emp = await prisma.employee.findFirst({
    where: { id: employeeId, deletedAt: null },
    select: { id: true },
  });
  if (!emp) throw new NotFoundError("Employee not found.");
}

// Typed accessor for the Prisma delegate.
function delegate(model: SubConfig["model"]) {
  return prisma[model] as unknown as {
    findMany: (args: unknown) => Promise<unknown[]>;
    findFirst: (args: unknown) => Promise<unknown>;
    create: (args: unknown) => Promise<{ id: string }>;
    update: (args: unknown) => Promise<{ id: string }>;
    delete: (args: unknown) => Promise<unknown>;
  };
}

export const subrecordsService = {
  async list(kind: SubKind, employeeId: string) {
    await ensureEmployeeExists(employeeId);
    const cfg = CONFIGS[kind];
    return delegate(cfg.model).findMany({
      where: { employeeId },
      orderBy: { createdAt: "desc" },
    });
  },

  async create(kind: SubKind, employeeId: string, rawInput: unknown, actor: ActorMeta) {
    await ensureEmployeeExists(employeeId);
    const cfg = CONFIGS[kind];
    const input = cfg.schema.parse(rawInput) as Record<string, unknown>;
    const created = await delegate(cfg.model).create({
      data: { employeeId, ...cfg.toData(input) },
    });
    await writeAudit({
      userId: actor.userId,
      action: `${kind}.create`,
      entityType: cfg.auditEntity,
      entityId: created.id,
      after: { employeeId },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });
    return created;
  },

  async update(
    kind: SubKind,
    employeeId: string,
    recordId: string,
    rawInput: unknown,
    actor: ActorMeta,
  ) {
    const cfg = CONFIGS[kind];
    const existing = await delegate(cfg.model).findFirst({
      where: { id: recordId, employeeId },
    });
    if (!existing) throw new NotFoundError("Record not found.");
    const input = cfg.schema.parse(rawInput) as Record<string, unknown>;
    const updated = await delegate(cfg.model).update({
      where: { id: recordId },
      data: cfg.toData(input),
    });
    await writeAudit({
      userId: actor.userId,
      action: `${kind}.update`,
      entityType: cfg.auditEntity,
      entityId: recordId,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });
    return updated;
  },

  async remove(
    kind: SubKind,
    employeeId: string,
    recordId: string,
    actor: ActorMeta,
  ) {
    const cfg = CONFIGS[kind];
    const existing = await delegate(cfg.model).findFirst({
      where: { id: recordId, employeeId },
    });
    if (!existing) throw new NotFoundError("Record not found.");
    await delegate(cfg.model).delete({ where: { id: recordId } });
    await writeAudit({
      userId: actor.userId,
      action: `${kind}.delete`,
      entityType: cfg.auditEntity,
      entityId: recordId,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });
  },
};

export type { SubKind };
