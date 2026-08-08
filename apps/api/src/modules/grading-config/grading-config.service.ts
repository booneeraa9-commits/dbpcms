import {
  gradeComponentSchema,
  gradingScaleSchema,
} from "@dbpcms/shared";
import { ConflictError, NotFoundError, ValidationError } from "../../core/errors/app-error.js";
import { writeAudit } from "../../core/audit/audit.js";
import { prisma } from "../../core/db/prisma.js";

interface ActorMeta {
  userId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Manages the editable grading configuration: grade components (with weights),
 * and grading scales (with letter bands + pass mark + rounding). Everything here
 * is admin/dept-head editable so grading rules change WITHOUT code edits.
 */
export const gradingConfigService = {
  // --- Grade components ---
  async listComponents() {
    return prisma.gradeComponent.findMany({
      where: { deletedAt: null },
      orderBy: [{ sequence: "asc" }, { createdAt: "asc" }],
    });
  },

  /** The sum of active component weights — the UI shows this so it can hit 100. */
  async componentsWeightTotal(): Promise<number> {
    const rows = await prisma.gradeComponent.findMany({
      where: { deletedAt: null, isActive: true },
      select: { weightPercent: true },
    });
    return rows.reduce((s, r) => s + r.weightPercent, 0);
  },

  async createComponent(rawInput: unknown, actor: ActorMeta) {
    const input = gradeComponentSchema.parse(rawInput);
    const created = await prisma.gradeComponent.create({
      data: {
        name: input.name,
        weightPercent: input.weightPercent,
        maxScore: input.maxScore,
        sequence: input.sequence,
        isActive: input.isActive,
        createdBy: actor.userId,
        updatedBy: actor.userId,
      },
    });
    await writeAudit({
      userId: actor.userId, action: "grade-component.create",
      entityType: "GradeComponent", entityId: created.id, after: created,
      ipAddress: actor.ipAddress, userAgent: actor.userAgent,
    });
    return created;
  },

  async updateComponent(id: string, rawInput: unknown, actor: ActorMeta) {
    const input = gradeComponentSchema.partial().parse(rawInput);
    const before = await prisma.gradeComponent.findFirst({ where: { id, deletedAt: null } });
    if (!before) throw new NotFoundError("Component not found.");
    const updated = await prisma.gradeComponent.update({
      where: { id },
      data: { ...input, updatedBy: actor.userId },
    });
    await writeAudit({
      userId: actor.userId, action: "grade-component.update",
      entityType: "GradeComponent", entityId: id, before, after: updated,
      ipAddress: actor.ipAddress, userAgent: actor.userAgent,
    });
    return updated;
  },

  async removeComponent(id: string, actor: ActorMeta) {
    const before = await prisma.gradeComponent.findFirst({ where: { id, deletedAt: null } });
    if (!before) throw new NotFoundError("Component not found.");
    await prisma.gradeComponent.update({ where: { id }, data: { deletedAt: new Date() } });
    await writeAudit({
      userId: actor.userId, action: "grade-component.delete",
      entityType: "GradeComponent", entityId: id, before,
      ipAddress: actor.ipAddress, userAgent: actor.userAgent,
    });
  },

  // --- Grading scales ---
  async listScales() {
    return prisma.gradingScale.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "asc" },
      include: { bands: { orderBy: { minPercent: "desc" } } },
    });
  },

  async getActiveScale() {
    const scale = await prisma.gradingScale.findFirst({
      where: { deletedAt: null, isActive: true, departmentId: null },
      include: { bands: { orderBy: { minPercent: "desc" } } },
    });
    return scale;
  },

  /** Creates or replaces the college-wide scale (single active scale for V1). */
  async saveScale(rawInput: unknown, actor: ActorMeta) {
    const input = gradingScaleSchema.parse(rawInput);

    // Guard: bands must not overlap and should cover sensibly. We at least reject
    // overlaps to avoid ambiguous grade matching.
    const sorted = [...input.bands].sort((a, b) => a.minPercent - b.minPercent);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i]!.minPercent <= sorted[i - 1]!.maxPercent) {
        throw new ValidationError([
          { field: "bands", message: "Grade bands must not overlap." },
        ]);
      }
    }

    // Deactivate previous college-wide scales, create the new active one.
    const created = await prisma.$transaction(async (tx) => {
      await tx.gradingScale.updateMany({
        where: { departmentId: null, isActive: true, deletedAt: null },
        data: { isActive: false },
      });
      return tx.gradingScale.create({
        data: {
          name: input.name,
          passMark: input.passMark,
          rounding: input.rounding,
          isActive: true,
          createdBy: actor.userId,
          updatedBy: actor.userId,
          bands: {
            create: input.bands.map((b) => ({
              minPercent: b.minPercent,
              maxPercent: b.maxPercent,
              letter: b.letter,
              gradePoint: b.gradePoint,
              isPass: b.isPass,
            })),
          },
        },
        include: { bands: { orderBy: { minPercent: "desc" } } },
      });
    });

    await writeAudit({
      userId: actor.userId, action: "grading-scale.save",
      entityType: "GradingScale", entityId: created.id,
      after: { name: created.name, passMark: created.passMark, bands: input.bands.length },
      ipAddress: actor.ipAddress, userAgent: actor.userAgent,
    });
    return created;
  },
};
