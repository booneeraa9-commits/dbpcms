import { z } from "zod";
import { calculateGrade, ROLES, type ComponentScore, type ScaleBand } from "@dbpcms/shared";
import { ForbiddenError, NotFoundError, ConflictError } from "../../core/errors/app-error.js";
import { writeAudit } from "../../core/audit/audit.js";
import { prisma } from "../../core/db/prisma.js";
import { assertCanEnterGrades } from "./grades.access.js";

interface ActorMeta {
  userId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

const returnSchema = z.object({ reason: z.string().trim().min(3, "Give a reason.").max(500) });

async function userRoleNames(userId: string): Promise<string[]> {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    include: { roles: { include: { role: true } } },
  });
  return user ? user.roles.map((r) => r.role.name) : [];
}

async function sectionDepartmentId(sectionId: string): Promise<string | null> {
  const section = await prisma.section.findFirst({
    where: { id: sectionId, deletedAt: null },
    include: { course: { include: { program: { select: { departmentId: true } } } } },
  });
  return section?.course.program?.departmentId ?? null;
}

/**
 * The grade approval workflow:
 *   draft --submit--> submitted --approve--> dept_approved --publish--> published (locked)
 *   submitted/dept_approved --return--> returned (back to instructor to edit)
 * Publishing freezes an immutable snapshot of the scale/weights with each result.
 */
export const gradeWorkflowService = {
  async getSubmission(sectionId: string) {
    return prisma.gradeSubmission.findUnique({ where: { sectionId } });
  },

  /** Instructor (or dept head/admin) submits the section for approval. */
  async submit(sectionId: string, actor: ActorMeta) {
    await assertCanEnterGrades(sectionId, actor.userId);
    const submission = await prisma.gradeSubmission.findUnique({ where: { sectionId } });
    if (submission && ["submitted", "dept_approved", "published"].includes(submission.status)) {
      throw new ConflictError(`Grades are already ${submission.status}.`);
    }
    // Require at least one grade entry to submit.
    const count = await prisma.gradeEntry.count({
      where: { enrollment: { sectionId, deletedAt: null } },
    });
    if (count === 0) throw new ConflictError("Enter some grades before submitting.");

    const updated = await prisma.gradeSubmission.upsert({
      where: { sectionId },
      update: { status: "submitted", submittedBy: actor.userId, submittedAt: new Date(), returnReason: null },
      create: { sectionId, status: "submitted", submittedBy: actor.userId, submittedAt: new Date() },
    });
    await writeAudit({ userId: actor.userId, action: "grades.submit", entityType: "Section", entityId: sectionId, ...meta(actor) });
    return updated;
  },

  /** Department Head approves submitted grades (scope: own department). */
  async approve(sectionId: string, actor: ActorMeta) {
    const roles = await userRoleNames(actor.userId);
    const isAdmin = roles.includes(ROLES.SYSTEM_ADMINISTRATOR);
    if (!isAdmin) {
      if (!roles.includes(ROLES.DEPARTMENT_HEAD)) throw new ForbiddenError("Only a department head can approve grades.");
      const deptId = await sectionDepartmentId(sectionId);
      const dept = deptId
        ? await prisma.department.findFirst({ where: { id: deptId, headUserId: actor.userId, deletedAt: null } })
        : null;
      if (!dept) throw new ForbiddenError("You can only approve grades for your own department.");
    }
    const submission = await prisma.gradeSubmission.findUnique({ where: { sectionId } });
    if (!submission || submission.status !== "submitted") {
      throw new ConflictError("Grades must be submitted before they can be approved.");
    }
    const updated = await prisma.gradeSubmission.update({
      where: { sectionId },
      data: { status: "dept_approved", approvedBy: actor.userId, approvedAt: new Date() },
    });
    await writeAudit({ userId: actor.userId, action: "grades.approve", entityType: "Section", entityId: sectionId, ...meta(actor) });
    return updated;
  },

  /** Registrar publishes approved grades — computes + FREEZES results, then locks. */
  async publish(sectionId: string, actor: ActorMeta) {
    const roles = await userRoleNames(actor.userId);
    if (!roles.includes(ROLES.REGISTRAR) && !roles.includes(ROLES.SYSTEM_ADMINISTRATOR)) {
      throw new ForbiddenError("Only the registrar can publish grades.");
    }
    const submission = await prisma.gradeSubmission.findUnique({ where: { sectionId } });
    if (!submission || submission.status !== "dept_approved") {
      throw new ConflictError("Grades must be department-approved before publishing.");
    }

    // Load the active scale + components to compute and snapshot.
    const scale = await prisma.gradingScale.findFirst({
      where: { deletedAt: null, isActive: true, departmentId: null },
      include: { bands: true },
    });
    if (!scale) throw new ConflictError("No active grading scale is configured.");
    const bands: ScaleBand[] = scale.bands.map((b) => ({
      minPercent: b.minPercent, maxPercent: b.maxPercent, letter: b.letter, gradePoint: b.gradePoint, isPass: b.isPass,
    }));
    const components = await prisma.gradeComponent.findMany({ where: { deletedAt: null, isActive: true } });

    const enrollments = await prisma.enrollment.findMany({
      where: { sectionId, deletedAt: null },
      include: { gradeEntries: true },
    });

    const snapshot = {
      scaleName: scale.name,
      passMark: scale.passMark,
      rounding: scale.rounding,
      bands,
      components: components.map((c) => ({ id: c.id, name: c.name, weightPercent: c.weightPercent, maxScore: c.maxScore })),
      publishedAt: new Date().toISOString(),
    };

    await prisma.$transaction(async (tx) => {
      for (const e of enrollments) {
        const compScores: ComponentScore[] = [];
        for (const comp of components) {
          const entry = e.gradeEntries.find((g) => g.componentId === comp.id);
          if (entry) compScores.push({ weightPercent: comp.weightPercent, score: entry.score, maxScore: comp.maxScore });
        }
        const result = compScores.length > 0
          ? calculateGrade(compScores, bands, { rounding: scale.rounding as "half_up", passMark: scale.passMark })
          : null;

        await tx.gradeResult.upsert({
          where: { enrollmentId: e.id },
          update: {
            percentage: result?.percentage ?? null,
            letter: result?.letter ?? null,
            gradePoint: result?.gradePoint ?? null,
            isPass: result?.isPass ?? null,
            appliedSnapshot: snapshot as never,
            publishedAt: new Date(),
          },
          create: {
            enrollmentId: e.id,
            percentage: result?.percentage ?? null,
            letter: result?.letter ?? null,
            gradePoint: result?.gradePoint ?? null,
            isPass: result?.isPass ?? null,
            appliedSnapshot: snapshot as never,
            publishedAt: new Date(),
          },
        });
        // Mark enrollment completed.
        await tx.enrollment.update({ where: { id: e.id }, data: { status: "completed" } });
      }
      await tx.gradeSubmission.update({
        where: { sectionId },
        data: { status: "published", publishedBy: actor.userId, publishedAt: new Date(), lockedAt: new Date() },
      });
    });

    await writeAudit({ userId: actor.userId, action: "grades.publish", entityType: "Section", entityId: sectionId, after: { published: enrollments.length }, ...meta(actor) });
    return prisma.gradeSubmission.findUnique({ where: { sectionId } });
  },

  /** Approver returns grades to the instructor for correction (with a reason). */
  async returnForCorrection(sectionId: string, rawInput: unknown, actor: ActorMeta) {
    const { reason } = returnSchema.parse(rawInput);
    const roles = await userRoleNames(actor.userId);
    const canReturn =
      roles.includes(ROLES.SYSTEM_ADMINISTRATOR) ||
      roles.includes(ROLES.DEPARTMENT_HEAD) ||
      roles.includes(ROLES.REGISTRAR);
    if (!canReturn) throw new ForbiddenError("You cannot return grades.");

    const submission = await prisma.gradeSubmission.findUnique({ where: { sectionId } });
    if (!submission || !["submitted", "dept_approved"].includes(submission.status)) {
      throw new ConflictError("Only submitted or approved grades can be returned.");
    }
    const updated = await prisma.gradeSubmission.update({
      where: { sectionId },
      data: { status: "returned", returnedBy: actor.userId, returnReason: reason },
    });
    await writeAudit({ userId: actor.userId, action: "grades.return", entityType: "Section", entityId: sectionId, after: { reason }, ...meta(actor) });
    return updated;
  },

  /** Registrar/Admin unlocks published grades so they can be edited again. */
  async unlock(sectionId: string, actor: ActorMeta) {
    const roles = await userRoleNames(actor.userId);
    if (!roles.includes(ROLES.REGISTRAR) && !roles.includes(ROLES.SYSTEM_ADMINISTRATOR)) {
      throw new ForbiddenError("Only the registrar can unlock published grades.");
    }
    const submission = await prisma.gradeSubmission.findUnique({ where: { sectionId } });
    if (!submission || submission.status !== "published") {
      throw new ConflictError("Only published grades can be unlocked.");
    }
    const updated = await prisma.gradeSubmission.update({
      where: { sectionId },
      data: { status: "draft", lockedAt: null },
    });
    await writeAudit({ userId: actor.userId, action: "grades.unlock", entityType: "Section", entityId: sectionId, ...meta(actor) });
    return updated;
  },
};

function meta(actor: ActorMeta) {
  return { ipAddress: actor.ipAddress, userAgent: actor.userAgent };
}
