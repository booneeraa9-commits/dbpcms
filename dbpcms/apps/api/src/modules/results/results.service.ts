/**
 * Results service.
 *
 * Implements the 4-stage approval workflow:
 *   DRAFT → PENDING_VERIFICATION → PENDING_APPROVAL → PENDING_AUTHORIZATION → PUBLISHED
 *
 * Each transition is audited. Calculations are performed automatically:
 *   - percentage = (marksObtained / marksTotal) * 100
 *   - isPass = percentage >= 50
 *   - gpa: A (90+), B (80-89), C (70-79), D (60-69), F (<60)
 *   - competency: passed → COMPETENT, failed → NOT_YET_COMPETENT
 */

import { Prisma } from '@prisma/client';
import { prisma } from '../../infra/database/client';
import { NotFoundError, BadRequestError, ForbiddenError } from '../../common/errors/AppError';
import { normalizePagination, buildMeta } from '../../common/utils/pagination';
import { activityLog } from '../activity/activity.service';
import { notificationsService } from '../notifications/notifications.service';
import type { Request } from 'express';
import type { PaginatedResponse } from '@dbpcms/shared';
import type {
  CreateResultInput,
  UpdateResultInput,
  ListResultsQuery,
  WorkflowActionInput,
} from './results.schema';

export interface ResultDTO {
  id: string;
  studentId: string;
  studentName?: string;
  studentIdNumber?: string;
  semesterId: string;
  semesterName?: string;
  courseId: string;
  courseName?: string;
  courseCode?: string;
  assessmentType: string;
  marksObtained: number;
  marksTotal: number;
  percentage: number;
  grade: string;
  isPass: boolean;
  competencyLevel: string | null;
  remarks: string | null;
  status: string;
  enteredById: string | null;
  enteredByName?: string;
  enteredAt: string | null;
  verifiedById: string | null;
  verifiedByName?: string;
  verifiedAt: string | null;
  approvedById: string | null;
  approvedByName?: string;
  approvedAt: string | null;
  authorizedById: string | null;
  authorizedByName?: string;
  authorizedAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

class ResultsService {
  // ─── LIST ─────────────────────────────────────────
  async list(req: Request, query: ListResultsQuery): Promise<PaginatedResponse<ResultDTO>> {
    const pagination = normalizePagination(query);
    const where: Prisma.ResultWhereInput = {};
    if (query.studentId) where.studentId = query.studentId;
    if (query.semesterId) where.semesterId = query.semesterId;
    if (query.courseId) where.courseId = query.courseId;
    if (query.status) where.status = query.status;

    const orderBy: Prisma.ResultOrderByWithRelationInput = query.sortBy
      ? { [query.sortBy]: query.sortOrder ?? 'desc' }
      : { createdAt: 'desc' };

    const [results, total] = await Promise.all([
      prisma.result.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy,
        include: this.defaultInclude,
      }),
      prisma.result.count({ where }),
    ]);

    return {
      items: results.map((r) => this.serialize(r)),
      meta: buildMeta(total, pagination.page, pagination.pageSize),
    };
  }

  // ─── GET BY ID ────────────────────────────────────
  async getById(id: string): Promise<ResultDTO> {
    const result = await prisma.result.findUnique({
      where: { id },
      include: this.defaultInclude,
    });
    if (!result) throw new NotFoundError('Result');
    return this.serialize(result);
  }

  // ─── CREATE (single) ──────────────────────────────
  async create(req: Request, input: CreateResultInput, userId: string): Promise<ResultDTO> {
    if (input.marksObtained > input.marksTotal) {
      throw new BadRequestError('Marks obtained cannot exceed total marks');
    }

    // Verify student/course/semester exist
    const [student, course, semester] = await Promise.all([
      prisma.student.findFirst({ where: { id: input.studentId, deletedAt: null } }),
      prisma.course.findFirst({ where: { id: input.courseId, deletedAt: null } }),
      prisma.semester.findUnique({ where: { id: input.semesterId } }),
    ]);
    if (!student) throw new BadRequestError('Student not found');
    if (!course) throw new BadRequestError('Course not found');
    if (!semester) throw new BadRequestError('Semester not found');

    // Check for existing result (unique constraint)
    const existing = await prisma.result.findFirst({
      where: {
        studentId: input.studentId,
        semesterId: input.semesterId,
        courseId: input.courseId,
        assessmentType: input.assessmentType,
      },
    });
    if (existing) throw new BadRequestError('A result already exists for this student, semester, course, and assessment type');

    const competencyLevel = input.competencyLevel ?? this.computeCompetency(input.marksObtained, input.marksTotal);

    const result = await prisma.result.create({
      data: {
        studentId: input.studentId,
        semesterId: input.semesterId,
        courseId: input.courseId,
        assessmentType: input.assessmentType,
        marksObtained: new Prisma.Decimal(input.marksObtained),
        marksTotal: new Prisma.Decimal(input.marksTotal),
        competencyLevel,
        remarks: input.remarks || null,
        status: 'DRAFT',
        enteredById: userId,
        enteredAt: new Date(),
      },
      include: this.defaultInclude,
    });

    await activityLog.log(req, {
      userId,
      action: 'CREATE',
      resource: 'result',
      resourceId: result.id,
      description: `Entered result for ${student.studentIdNumber} in ${course.code}`,
    });

    return this.serialize(result);
  }

  // ─── BULK CREATE ──────────────────────────────────
  async bulkCreate(req: Request, inputs: CreateResultInput[], userId: string): Promise<{ created: number; failed: any[] }> {
    const created: ResultDTO[] = [];
    const failed: any[] = [];

    for (const input of inputs) {
      try {
        const r = await this.create(req, input, userId);
        created.push(r);
      } catch (err) {
        failed.push({ data: input, reason: err instanceof Error ? err.message : 'Unknown error' });
      }
    }

    return { created: created.length, failed };
  }

  // ─── UPDATE (only DRAFT) ──────────────────────────
  async update(req: Request, id: string, input: UpdateResultInput, userId: string): Promise<ResultDTO> {
    const result = await prisma.result.findUnique({ where: { id } });
    if (!result) throw new NotFoundError('Result');
    if (result.status !== 'DRAFT') {
      throw new BadRequestError(`Cannot edit a result in ${result.status} status. Only DRAFT is editable.`);
    }
    if (result.enteredById !== userId) {
      throw new ForbiddenError('Only the original entrant can edit the result');
    }

    const newMarksObtained = input.marksObtained ?? Number(result.marksObtained);
    const newMarksTotal = input.marksTotal ?? Number(result.marksTotal);
    if (newMarksObtained > newMarksTotal) {
      throw new BadRequestError('Marks obtained cannot exceed total marks');
    }

    const updated = await prisma.result.update({
      where: { id },
      data: {
        assessmentType: input.assessmentType,
        marksObtained: input.marksObtained !== undefined ? new Prisma.Decimal(input.marksObtained) : undefined,
        marksTotal: input.marksTotal !== undefined ? new Prisma.Decimal(input.marksTotal) : undefined,
        competencyLevel: input.competencyLevel ?? this.computeCompetency(newMarksObtained, newMarksTotal),
        remarks: input.remarks || undefined,
      },
      include: this.defaultInclude,
    });

    await activityLog.log(req, { userId, action: 'UPDATE', resource: 'result', resourceId: id });
    return this.serialize(updated);
  }

  // ─── WORKFLOW ACTIONS ─────────────────────────────
  /**
   * Teacher submits a DRAFT for verification. This is the missing link
   * in the workflow chain: DRAFT → PENDING_VERIFICATION → PENDING_APPROVAL → ...
   */
  async submit(req: Request, id: string, userId: string): Promise<ResultDTO> {
    return this.transition(req, id, 'DRAFT', 'PENDING_VERIFICATION', null, 'VERIFY', userId);
  }

  async verify(req: Request, id: string, userId: string): Promise<ResultDTO> {
    return this.transition(req, id, 'PENDING_VERIFICATION', 'PENDING_APPROVAL', 'verifiedBy', 'VERIFY', userId);
  }

  async approve(req: Request, id: string, userId: string): Promise<ResultDTO> {
    return this.transition(req, id, 'PENDING_APPROVAL', 'PENDING_AUTHORIZATION', 'approvedBy', 'APPROVE', userId);
  }

  async authorize(req: Request, id: string, userId: string): Promise<ResultDTO> {
    return this.transition(req, id, 'PENDING_AUTHORIZATION', 'PUBLISHED', 'authorizedBy', 'AUTHORIZE', userId);
  }

  async publish(req: Request, id: string, userId: string): Promise<ResultDTO> {
    // Direct publish from any non-published state — for the registrar's final step
    return this.transition(req, id, null, 'PUBLISHED', null, 'PUBLISH', userId);
  }

  async reject(req: Request, id: string, reason: string | undefined, userId: string): Promise<ResultDTO> {
    const result = await prisma.result.findUnique({ where: { id } });
    if (!result) throw new NotFoundError('Result');
    if (result.status === 'PUBLISHED') throw new BadRequestError('Cannot reject a published result');

    const updated = await prisma.result.update({
      where: { id },
      data: {
        status: 'DRAFT',
        // Clear approval chain
        verifiedById: null,
        verifiedAt: null,
        approvedById: null,
        approvedAt: null,
        authorizedById: null,
        authorizedAt: null,
        remarks: reason ? `Rejected: ${reason}` : result.remarks,
      },
      include: this.defaultInclude,
    });

    await activityLog.log(req, {
      userId,
      action: 'REJECT',
      resource: 'result',
      resourceId: id,
      description: `Rejected: ${reason ?? 'no reason given'}`,
    });

    return this.serialize(updated);
  }

  // ─── STUDENT VIEW (own published results) ─────────
  async listForStudent(studentId: string): Promise<ResultDTO[]> {
    const results = await prisma.result.findMany({
      where: { studentId, status: 'PUBLISHED' },
      include: this.defaultInclude,
      orderBy: { createdAt: 'desc' },
    });
    return results.map((r) => this.serialize(r));
  }

  // ─── TRANSCRIPT (all published results for a student) ─
  async getTranscript(studentId: string) {
    const results = await this.listForStudent(studentId);
    if (results.length === 0) {
      return {
        student: null,
        results: [],
        summary: {
          totalCourses: 0,
          average: 0,
          gpa: 'N/A',
          passed: 0,
          failed: 0,
          competent: 0,
        },
      };
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { program: { include: { department: true } } },
    });

    const percentages = results.map((r) => r.percentage);
    const average = percentages.reduce((s, p) => s + p, 0) / percentages.length;
    const gpa = this.percentageToGpa(average);
    const passed = results.filter((r) => r.isPass).length;
    const failed = results.length - passed;
    const competent = results.filter((r) => r.competencyLevel === 'COMPETENT').length;

    return {
      student,
      results,
      summary: {
        totalCourses: results.length,
        average: Math.round(average * 100) / 100,
        gpa,
        passed,
        failed,
        competent,
      },
    };
  }

  // ─── DELETE (only DRAFT) ──────────────────────────
  async delete(req: Request, id: string, userId: string): Promise<void> {
    const result = await prisma.result.findUnique({ where: { id } });
    if (!result) throw new NotFoundError('Result');
    if (result.status !== 'DRAFT') {
      throw new BadRequestError('Only DRAFT results can be deleted');
    }
    if (result.enteredById !== userId) {
      throw new ForbiddenError('Only the original entrant can delete the result');
    }
    await prisma.result.delete({ where: { id } });
    await activityLog.log(req, { userId, action: 'DELETE', resource: 'result', resourceId: id });
  }

  // ─── HELPERS ──────────────────────────────────────
  private defaultInclude = {
    student: { select: { id: true, firstName: true, middleName: true, lastName: true, studentIdNumber: true } },
    course: { select: { id: true, code: true, name: true } },
    semester: { select: { id: true, name: true } },
    enteredBy: { select: { id: true, firstName: true, lastName: true } },
    verifiedBy: { select: { id: true, firstName: true, lastName: true } },
    approvedBy: { select: { id: true, firstName: true, lastName: true } },
    authorizedBy: { select: { id: true, firstName: true, lastName: true } },
  } as const;

  private percentageToGpa(pct: number): string {
    if (pct >= 90) return 'A';
    if (pct >= 80) return 'B';
    if (pct >= 70) return 'C';
    if (pct >= 60) return 'D';
    if (pct >= 50) return 'E';
    return 'F';
  }

  private computeCompetency(obtained: number, total: number): 'COMPETENT' | 'NOT_YET_COMPETENT' {
    const pct = (obtained / total) * 100;
    return pct >= 50 ? 'COMPETENT' : 'NOT_YET_COMPETENT';
  }

  private async transition(
    req: Request,
    id: string,
    fromStatus: string | null,
    toStatus: 'PENDING_VERIFICATION' | 'PENDING_APPROVAL' | 'PENDING_AUTHORIZATION' | 'PUBLISHED' | 'DRAFT',
    actorField: 'verifiedBy' | 'approvedBy' | 'authorizedBy' | null,
    action: 'VERIFY' | 'APPROVE' | 'AUTHORIZE' | 'PUBLISH',
    userId: string,
  ): Promise<ResultDTO> {
    const result = await prisma.result.findUnique({
      where: { id },
      include: {
        student: { select: { firstName: true, lastName: true, studentIdNumber: true } },
      },
    });
    const course = await prisma.course.findUnique({
      where: { id: result?.courseId },
      select: { code: true, name: true },
    });
    if (!result) throw new NotFoundError('Result');
    if (fromStatus && result.status !== fromStatus) {
      throw new BadRequestError(`Cannot ${action} a result in ${result.status} status. Expected ${fromStatus}.`);
    }

    const updateData: Prisma.ResultUpdateInput = { status: toStatus };
    if (actorField === 'verifiedBy') {
      (updateData as any).verifiedById = userId;
      (updateData as any).verifiedAt = new Date();
    } else if (actorField === 'approvedBy') {
      (updateData as any).approvedById = userId;
      (updateData as any).approvedAt = new Date();
    } else if (actorField === 'authorizedBy') {
      (updateData as any).authorizedById = userId;
      (updateData as any).authorizedAt = new Date();
    }
    if (toStatus === 'PUBLISHED') {
      (updateData as any).publishedAt = new Date();
    }

    const updated = await prisma.result.update({
      where: { id },
      data: updateData,
      include: this.defaultInclude,
    });

    await activityLog.log(req, {
      userId,
      action,
      resource: 'result',
      resourceId: id,
      description: `${action}: status now ${toStatus}`,
    });

    // Best-effort notification to the next person in the chain
    await this.fireTransitionNotification(updated, toStatus, result, course).catch(() => {
      /* notifications never break a workflow */
    });

    return this.serialize(updated);
  }

  /**
   * Send a notification to whoever needs to act next on this result.
   * Best-effort: failures here are swallowed.
   */
  private async fireTransitionNotification(result: any, toStatus: string, original: any, course: any) {
    const studentLabel = original.student
      ? `${original.student.firstName} ${original.student.lastName} (${original.student.studentIdNumber})`
      : 'a student';
    const courseLabel = course?.code || 'a course';

    if (toStatus === 'PENDING_VERIFICATION') {
      // Notify all department heads
      const heads = await prisma.userRole.findMany({
        where: { role: { slug: 'department_head' } },
        include: { user: true },
      });
      await notificationsService.notifyMany(
        heads.map((h) => h.userId),
        {
          type: 'RESULT_SUBMITTED',
          title: '📝 Result awaiting verification',
          message: `${studentLabel} — ${courseLabel} is ready for verification.`,
          data: { resultId: result.id, action: 'verify' },
        },
      );
    } else if (toStatus === 'PENDING_APPROVAL') {
      const deans = await prisma.userRole.findMany({
        where: { role: { slug: 'academic_dean' } },
        include: { user: true },
      });
      await notificationsService.notifyMany(
        deans.map((d) => d.userId),
        {
          type: 'RESULT_VERIFIED',
          title: '✅ Result awaiting approval',
          message: `${studentLabel} — ${courseLabel} was verified and needs your approval.`,
          data: { resultId: result.id, action: 'approve' },
        },
      );
    } else if (toStatus === 'PENDING_AUTHORIZATION') {
      const regs = await prisma.userRole.findMany({
        where: { role: { slug: 'registrar' } },
        include: { user: true },
      });
      await notificationsService.notifyMany(
        regs.map((r) => r.userId),
        {
          type: 'RESULT_APPROVED',
          title: '🎓 Result awaiting authorization',
          message: `${studentLabel} — ${courseLabel} is approved and ready to authorize.`,
          data: { resultId: result.id, action: 'authorize' },
        },
      );
    } else if (toStatus === 'PUBLISHED') {
      // Notify the student — for now, skip since we don't have a UserId on Student
      // In a fuller build we'd add student.userId, then notify them via email/in-app
    }
  }

  private serialize(r: any): ResultDTO {
    const obtained = Number(r.marksObtained);
    const total = Number(r.marksTotal);
    const percentage = total > 0 ? Math.round((obtained / total) * 10000) / 100 : 0;
    const grade = this.percentageToGpa(percentage);
    const isPass = percentage >= 50;

    return {
      id: r.id,
      studentId: r.studentId,
      studentName: r.student ? `${r.student.firstName} ${r.student.lastName}` : undefined,
      studentIdNumber: r.student?.studentIdNumber,
      semesterId: r.semesterId,
      semesterName: r.semester?.name,
      courseId: r.courseId,
      courseName: r.course?.name,
      courseCode: r.course?.code,
      assessmentType: r.assessmentType,
      marksObtained: obtained,
      marksTotal: total,
      percentage,
      grade,
      isPass,
      competencyLevel: r.competencyLevel,
      remarks: r.remarks,
      status: r.status,
      enteredById: r.enteredById,
      enteredByName: r.enteredBy ? `${r.enteredBy.firstName} ${r.enteredBy.lastName}` : undefined,
      enteredAt: r.enteredAt?.toISOString() ?? null,
      verifiedById: r.verifiedById,
      verifiedByName: r.verifiedBy ? `${r.verifiedBy.firstName} ${r.verifiedBy.lastName}` : undefined,
      verifiedAt: r.verifiedAt?.toISOString() ?? null,
      approvedById: r.approvedById,
      approvedByName: r.approvedBy ? `${r.approvedBy.firstName} ${r.approvedBy.lastName}` : undefined,
      approvedAt: r.approvedAt?.toISOString() ?? null,
      authorizedById: r.authorizedById,
      authorizedByName: r.authorizedBy ? `${r.authorizedBy.firstName} ${r.authorizedBy.lastName}` : undefined,
      authorizedAt: r.authorizedAt?.toISOString() ?? null,
      publishedAt: r.publishedAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }
}

export const resultsService = new ResultsService();
