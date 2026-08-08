import { z } from "zod";
import { calculateGrade, type ComponentScore, type ScaleBand } from "@dbpcms/shared";
import { ForbiddenError, NotFoundError, ValidationError } from "../../core/errors/app-error.js";
import { writeAudit } from "../../core/audit/audit.js";
import { prisma } from "../../core/db/prisma.js";
import { assertCanEnterGrades } from "./grades.access.js";

interface ActorMeta {
  userId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

// Instructors send only the raw score per (enrollment, component). The max
// comes from the component definition, so it can't be tampered with.
const saveGradesSchema = z.object({
  entries: z.array(
    z.object({
      enrollmentId: z.string().uuid(),
      componentId: z.string().uuid(),
      score: z.coerce.number().min(0),
    }),
  ),
});

/** Loads the active college-wide grading scale's bands + rules. */
async function loadScale(): Promise<{ bands: ScaleBand[]; rounding: string; passMark: number } | null> {
  const scale = await prisma.gradingScale.findFirst({
    where: { deletedAt: null, isActive: true, departmentId: null },
    include: { bands: true },
  });
  if (!scale) return null;
  return {
    bands: scale.bands.map((b) => ({
      minPercent: b.minPercent, maxPercent: b.maxPercent,
      letter: b.letter, gradePoint: b.gradePoint, isPass: b.isPass,
    })),
    rounding: scale.rounding,
    passMark: scale.passMark,
  };
}

export const gradesService = {
  /**
   * Lists the sections relevant to the current user for grade entry:
   *  - instructors: only sections assigned to them
   *  - dept heads: sections in their department
   *  - admin/registrar (section:manage): all sections
   * Gated by grade:enter, so instructors (who lack section:manage) can still see
   * their own sections to grade.
   */
  async listGradableSections(userId: string, filters: { semester?: string }) {
    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      include: { roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } },
    });
    const perms = new Set<string>();
    const roleNames: string[] = [];
    if (user) {
      for (const ur of user.roles) {
        roleNames.push(ur.role.name);
        for (const rp of ur.role.permissions) perms.add(rp.permission.key);
      }
    }

    const where: Record<string, unknown> = { deletedAt: null };
    if (filters.semester) where.semesterId = filters.semester;

    // If the user can manage sections (admin/registrar), show all.
    const canSeeAll = perms.has("section:manage");
    if (!canSeeAll) {
      // Otherwise limit to sections they're assigned to OR head their department.
      const headedDepts = await prisma.department.findMany({
        where: { headUserId: userId, deletedAt: null },
        select: { id: true },
      });
      const deptIds = headedDepts.map((d) => d.id);
      where.OR = [
        { instructors: { some: { instructorId: userId } } },
        ...(deptIds.length > 0
          ? [{ course: { program: { departmentId: { in: deptIds } } } }]
          : []),
      ];
    }

    const items = await prisma.section.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        course: { select: { id: true, code: true, title: true, creditHours: true } },
        semester: { select: { id: true, name: true } },
        instructors: { include: { instructor: { select: { id: true, fullName: true, email: true } } } },
        gradeSubmission: { select: { status: true } },
        _count: { select: { enrollments: true } },
      },
    });
    return items;
  },

  /**
   * Builds the gradesheet for a section: the active components, each enrolled
   * student, their saved scores, and a live-computed result per student.
   */
  async getGradesheet(sectionId: string) {
    const section = await prisma.section.findFirst({
      where: { id: sectionId, deletedAt: null },
      include: { course: { select: { code: true, title: true, creditHours: true } }, semester: { select: { name: true } } },
    });
    if (!section) throw new NotFoundError("Section not found.");

    const components = await prisma.gradeComponent.findMany({
      where: { deletedAt: null, isActive: true },
      orderBy: [{ sequence: "asc" }, { createdAt: "asc" }],
    });
    const enrollments = await prisma.enrollment.findMany({
      where: { sectionId, deletedAt: null },
      include: {
        student: { select: { id: true, studentNumber: true, firstName: true, lastName: true } },
        gradeEntries: true,
      },
      orderBy: { createdAt: "asc" },
    });
    const submission = await prisma.gradeSubmission.findUnique({ where: { sectionId } });
    const scale = await loadScale();

    const rows = enrollments.map((e) => {
      const scores: Record<string, { score: number }> = {};
      const compScores: ComponentScore[] = [];
      for (const comp of components) {
        const entry = e.gradeEntries.find((g) => g.componentId === comp.id);
        if (entry) {
          scores[comp.id] = { score: entry.score };
          // Max always comes from the component definition (source of truth).
          compScores.push({ weightPercent: comp.weightPercent, score: entry.score, maxScore: comp.maxScore });
        }
      }
      const result = scale && compScores.length > 0
        ? calculateGrade(compScores, scale.bands, { rounding: scale.rounding as "half_up", passMark: scale.passMark })
        : null;
      return {
        enrollmentId: e.id,
        student: e.student,
        scores,
        result,
      };
    });

    return {
      section: { id: section.id, sectionLabel: section.sectionLabel, course: section.course, semester: section.semester },
      components: components.map((c) => ({ id: c.id, name: c.name, weightPercent: c.weightPercent, maxScore: c.maxScore })),
      status: submission?.status ?? "draft",
      locked: submission?.status === "published",
      rows,
    };
  },

  /** Saves (upserts) the marks for a section. Blocked once published/locked. */
  async saveGrades(sectionId: string, rawInput: unknown, actor: ActorMeta) {
    await assertCanEnterGrades(sectionId, actor.userId);
    const input = saveGradesSchema.parse(rawInput);

    const submission = await prisma.gradeSubmission.findUnique({ where: { sectionId } });
    if (submission && submission.status === "published") {
      throw new ForbiddenError("Grades are published and locked. They must be unlocked to edit.");
    }
    if (submission && (submission.status === "submitted" || submission.status === "dept_approved")) {
      throw new ForbiddenError("Grades are awaiting approval and cannot be edited right now.");
    }

    // Validate the enrollments belong to this section, and load component maxes.
    const validEnrollmentIds = new Set(
      (await prisma.enrollment.findMany({ where: { sectionId, deletedAt: null }, select: { id: true } })).map((e) => e.id),
    );
    const components = await prisma.gradeComponent.findMany({
      where: { deletedAt: null, isActive: true },
      select: { id: true, maxScore: true },
    });
    const maxById = new Map(components.map((c) => [c.id, c.maxScore]));

    // Reject any score above its component's max — the component defines the ceiling.
    const invalid: { field: string; message: string }[] = [];
    for (const entry of input.entries) {
      const max = maxById.get(entry.componentId);
      if (max !== undefined && entry.score > max) {
        invalid.push({ field: "score", message: `A score of ${entry.score} exceeds the maximum of ${max} for this component.` });
      }
    }
    if (invalid.length > 0) throw new ValidationError(invalid);

    await prisma.$transaction(async (tx) => {
      for (const entry of input.entries) {
        const max = maxById.get(entry.componentId);
        if (!validEnrollmentIds.has(entry.enrollmentId) || max === undefined) continue;
        await tx.gradeEntry.upsert({
          where: { enrollmentId_componentId: { enrollmentId: entry.enrollmentId, componentId: entry.componentId } },
          update: { score: entry.score, maxScore: max, enteredBy: actor.userId },
          create: { enrollmentId: entry.enrollmentId, componentId: entry.componentId, score: entry.score, maxScore: max, enteredBy: actor.userId },
        });
      }
      // Ensure a draft submission row exists.
      await tx.gradeSubmission.upsert({
        where: { sectionId },
        update: {},
        create: { sectionId, status: "draft" },
      });
    });

    await writeAudit({
      userId: actor.userId, action: "grades.save-draft", entityType: "Section", entityId: sectionId,
      after: { entries: input.entries.length }, ipAddress: actor.ipAddress, userAgent: actor.userAgent,
    });
    return this.getGradesheet(sectionId);
  },
};
