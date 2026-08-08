import type { Prisma } from "@prisma/client";
import {
  sectionCreateSchema,
  assignInstructorSchema,
  enrollSchema,
  ROLES,
} from "@dbpcms/shared";
import { ConflictError, NotFoundError } from "../../core/errors/app-error.js";
import { writeAudit } from "../../core/audit/audit.js";
import { parseListQuery } from "../../core/http/query.js";
import { prisma } from "../../core/db/prisma.js";

interface ActorMeta {
  userId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

const sectionInclude = {
  course: { select: { id: true, code: true, title: true, creditHours: true } },
  semester: { select: { id: true, name: true } },
  instructors: {
    include: { instructor: { select: { id: true, fullName: true, email: true } } },
  },
  _count: { select: { enrollments: true } },
};

export const sectionsService = {
  async list(rawQuery: Record<string, unknown>) {
    const q = parseListQuery(rawQuery, ["createdAt"], { createdAt: "desc" });
    const where: Prisma.SectionWhereInput = {
      deletedAt: null,
      ...(typeof rawQuery.semester === "string" ? { semesterId: rawQuery.semester } : {}),
      ...(typeof rawQuery.course === "string" ? { courseId: rawQuery.course } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.section.findMany({ where, skip: q.skip, take: q.take, orderBy: q.orderBy, include: sectionInclude }),
      prisma.section.count({ where }),
    ]);
    return { items, total, page: q.page, pageSize: q.pageSize };
  },

  async getById(id: string) {
    const section = await prisma.section.findFirst({ where: { id, deletedAt: null }, include: sectionInclude });
    if (!section) throw new NotFoundError("Section not found.");
    return section;
  },

  async create(rawInput: unknown, actor: ActorMeta) {
    const input = sectionCreateSchema.parse(rawInput);
    const course = await prisma.course.findFirst({ where: { id: input.courseId, deletedAt: null } });
    if (!course) throw new NotFoundError("Selected course does not exist.");
    const semester = await prisma.semester.findFirst({ where: { id: input.semesterId, deletedAt: null } });
    if (!semester) throw new NotFoundError("Selected semester does not exist.");

    const clash = await prisma.section.findFirst({
      where: { courseId: input.courseId, semesterId: input.semesterId, sectionLabel: input.sectionLabel, deletedAt: null },
    });
    if (clash) throw new ConflictError("That section already exists for this course and semester.");

    const created = await prisma.section.create({
      data: {
        courseId: input.courseId, semesterId: input.semesterId,
        sectionLabel: input.sectionLabel.toUpperCase(), capacity: input.capacity ?? null,
        createdBy: actor.userId, updatedBy: actor.userId,
      },
    });
    await writeAudit({
      userId: actor.userId, action: "section.create", entityType: "Section", entityId: created.id,
      ipAddress: actor.ipAddress, userAgent: actor.userAgent,
    });
    return this.getById(created.id);
  },

  async remove(id: string, actor: ActorMeta) {
    const before = await prisma.section.findFirst({ where: { id, deletedAt: null } });
    if (!before) throw new NotFoundError("Section not found.");
    await prisma.section.update({ where: { id }, data: { deletedAt: new Date(), updatedBy: actor.userId } });
    await writeAudit({
      userId: actor.userId, action: "section.delete", entityType: "Section", entityId: id,
      ipAddress: actor.ipAddress, userAgent: actor.userAgent,
    });
  },

  async assignInstructor(sectionId: string, rawInput: unknown, actor: ActorMeta) {
    const input = assignInstructorSchema.parse(rawInput);
    await this.getById(sectionId);
    // The instructor must be a user with the instructor role.
    const user = await prisma.user.findFirst({
      where: {
        id: input.instructorId, deletedAt: null,
        roles: { some: { role: { name: ROLES.INSTRUCTOR } } },
      },
    });
    if (!user) throw new NotFoundError("Selected user is not an instructor.");
    const exists = await prisma.instructorAssignment.findUnique({
      where: { sectionId_instructorId: { sectionId, instructorId: input.instructorId } },
    });
    if (exists) throw new ConflictError("That instructor is already assigned to this section.");
    await prisma.instructorAssignment.create({
      data: { sectionId, instructorId: input.instructorId, assignedBy: actor.userId },
    });
    await writeAudit({
      userId: actor.userId, action: "section.assign-instructor", entityType: "Section", entityId: sectionId,
      after: { instructorId: input.instructorId }, ipAddress: actor.ipAddress, userAgent: actor.userAgent,
    });
    return this.getById(sectionId);
  },

  async unassignInstructor(sectionId: string, instructorId: string, actor: ActorMeta) {
    await prisma.instructorAssignment.deleteMany({ where: { sectionId, instructorId } });
    await writeAudit({
      userId: actor.userId, action: "section.unassign-instructor", entityType: "Section", entityId: sectionId,
      before: { instructorId }, ipAddress: actor.ipAddress, userAgent: actor.userAgent,
    });
    return this.getById(sectionId);
  },

  // --- Enrollment ---
  async listEnrollments(sectionId: string) {
    await this.getById(sectionId);
    return prisma.enrollment.findMany({
      where: { sectionId, deletedAt: null },
      orderBy: { createdAt: "asc" },
      include: { student: { select: { id: true, studentNumber: true, firstName: true, lastName: true } } },
    });
  },

  async enroll(sectionId: string, rawInput: unknown, actor: ActorMeta) {
    const input = enrollSchema.parse(rawInput);
    await this.getById(sectionId);
    const student = await prisma.student.findFirst({ where: { id: input.studentId, deletedAt: null } });
    if (!student) throw new NotFoundError("Selected student does not exist.");

    const existing = await prisma.enrollment.findFirst({
      where: { sectionId, studentId: input.studentId, deletedAt: null },
    });
    if (existing) throw new ConflictError("That student is already enrolled in this section.");

    const created = await prisma.enrollment.create({
      data: { sectionId, studentId: input.studentId, createdBy: actor.userId },
    });
    await writeAudit({
      userId: actor.userId, action: "enrollment.create", entityType: "Enrollment", entityId: created.id,
      after: { sectionId, studentId: input.studentId }, ipAddress: actor.ipAddress, userAgent: actor.userAgent,
    });
    return created;
  },

  async unenroll(sectionId: string, enrollmentId: string, actor: ActorMeta) {
    const e = await prisma.enrollment.findFirst({ where: { id: enrollmentId, sectionId, deletedAt: null } });
    if (!e) throw new NotFoundError("Enrollment not found.");
    await prisma.enrollment.update({ where: { id: enrollmentId }, data: { deletedAt: new Date() } });
    await writeAudit({
      userId: actor.userId, action: "enrollment.delete", entityType: "Enrollment", entityId: enrollmentId,
      ipAddress: actor.ipAddress, userAgent: actor.userAgent,
    });
  },
};
