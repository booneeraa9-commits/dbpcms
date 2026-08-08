/**
 * Questions service.
 *
 * Implements the multi-step approval workflow:
 *   DRAFT  →(submit)→  PENDING_REVIEW  →(dept head approve)→  PENDING_APPROVAL  →(exam committee)→  ACTIVE
 *                  ↘(reject)↗                                  ↘(reject)↗
 *
 * Each transition is audited in activity_logs.
 */

import { Prisma } from '@prisma/client';
import { prisma } from '../../infra/database/client';
import { NotFoundError, BadRequestError, ForbiddenError } from '../../common/errors/AppError';
import { normalizePagination, buildMeta } from '../../common/utils/pagination';
import { activityLog } from '../activity/activity.service';
import type { Request } from 'express';
import type { PaginatedResponse } from '@dbpcms/shared';
import type {
  CreateQuestionInput,
  UpdateQuestionInput,
  ListQuestionsQuery,
  ReviewActionInput,
} from './questions.schema';

export interface QuestionDTO {
  id: string;
  courseId: string;
  courseName?: string;
  courseCode?: string;
  type: string;
  difficulty: string;
  bloomsLevel: string;
  marks: number;
  content: Record<string, unknown>;
  keywords: string[];
  attachments: any[] | null;
  status: string;
  rejectionReason: string | null;
  timesUsed: number;
  lastUsedAt: string | null;
  version: number;
  parentId: string | null;
  createdById: string;
  createdByName?: string;
  reviewedById: string | null;
  reviewedByName?: string;
  approvedById: string | null;
  approvedByName?: string;
  createdAt: string;
  updatedAt: string;
  _count?: { examQuestions: number };
}

class QuestionsService {
  // ─── LIST ─────────────────────────────────────────
  async list(req: Request, query: ListQuestionsQuery): Promise<PaginatedResponse<QuestionDTO>> {
    const pagination = normalizePagination(query);

    const where: Prisma.QuestionWhereInput = { deletedAt: null };
    if (query.courseId) where.courseId = query.courseId;
    if (query.type) where.type = query.type;
    if (query.difficulty) where.difficulty = query.difficulty;
    if (query.bloomsLevel) where.bloomsLevel = query.bloomsLevel;
    if (query.status) where.status = query.status;
    if (query.createdById) where.createdById = query.createdById;
    if (query.search) {
      where.OR = [
        { keywords: { has: query.search } },
        // Note: full-text on JSON content would need raw SQL; we approximate with keywords
      ];
    }

    const orderBy: Prisma.QuestionOrderByWithRelationInput = query.sortBy
      ? { [query.sortBy]: query.sortOrder ?? 'desc' }
      : { createdAt: 'desc' };

    const [items, total] = await Promise.all([
      prisma.question.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy,
        include: {
          course: { select: { id: true, code: true, name: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true } },
          reviewedBy: { select: { id: true, firstName: true, lastName: true } },
          approvedBy: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { examQuestions: true } },
        },
      }),
      prisma.question.count({ where }),
    ]);

    return {
      items: items.map((q) => this.serialize(q)),
      meta: buildMeta(total, pagination.page, pagination.pageSize),
    };
  }

  // ─── GET BY ID ────────────────────────────────────
  async getById(id: string): Promise<QuestionDTO> {
    const question = await prisma.question.findFirst({
      where: { id, deletedAt: null },
      include: {
        course: true,
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        reviewedBy: { select: { id: true, firstName: true, lastName: true } },
        approvedBy: { select: { id: true, firstName: true, lastName: true } },
        versions: {
          orderBy: { version: 'desc' },
          include: { createdBy: { select: { firstName: true, lastName: true } } },
        },
        _count: { select: { examQuestions: true } },
      },
    });
    if (!question) throw new NotFoundError('Question');
    return this.serialize(question);
  }

  // ─── CREATE ───────────────────────────────────────
  async create(req: Request, input: CreateQuestionInput, createdBy: string): Promise<QuestionDTO> {
    // Verify course exists
    const course = await prisma.course.findFirst({ where: { id: input.courseId, deletedAt: null } });
    if (!course) throw new BadRequestError('Course not found');

    // Duplicate detection — same keywords + course
    if (input.keywords.length > 0) {
      const similar = await prisma.question.findFirst({
        where: {
          courseId: input.courseId,
          keywords: { hasSome: input.keywords },
          deletedAt: null,
        },
        include: { course: { select: { code: true, name: true } } },
      });
      if (similar) {
        // Don't block, just log
        await activityLog.log(req, {
          userId: createdBy,
          action: 'CREATE',
          resource: 'question',
          description: `Possible duplicate detected with question ${similar.id} in ${similar.course.code}`,
          metadata: { duplicateOf: similar.id, commonKeywords: input.keywords.filter(k => similar.keywords.includes(k)) },
        });
      }
    }

    const question = await prisma.question.create({
      data: {
        courseId: input.courseId,
        type: input.type,
        difficulty: input.difficulty,
        bloomsLevel: input.bloomsLevel,
        marks: new Prisma.Decimal(input.marks),
        content: input.content as Prisma.InputJsonValue,
        keywords: input.keywords,
        attachments: input.attachments as Prisma.InputJsonValue,
        status: 'DRAFT',
        createdById: createdBy,
        version: 1,
      },
      include: this.defaultInclude,
    });

    await activityLog.log(req, {
      userId: createdBy,
      action: 'CREATE',
      resource: 'question',
      resourceId: question.id,
      description: `Created ${input.type} question for ${course.code} (DRAFT)`,
    });

    return this.serialize(question);
  }

  // ─── UPDATE ───────────────────────────────────────
  async update(req: Request, id: string, input: UpdateQuestionInput, updatedBy: string): Promise<QuestionDTO> {
    const question = await prisma.question.findFirst({ where: { id, deletedAt: null } });
    if (!question) throw new NotFoundError('Question');

    // Only creator can edit
    if (question.createdById !== updatedBy) {
      throw new ForbiddenError('Only the original author can edit a question');
    }
    // Only DRAFT or REJECTED can be edited
    if (!['DRAFT', 'REJECTED'].includes(question.status)) {
      throw new BadRequestError(`Cannot edit a question in ${question.status} status`);
    }

    // If status was REJECTED, reset to DRAFT
    const newStatus = question.status === 'REJECTED' ? 'DRAFT' : question.status;

    const updated = await prisma.question.update({
      where: { id },
      data: {
        courseId: input.courseId,
        type: input.type,
        difficulty: input.difficulty,
        bloomsLevel: input.bloomsLevel,
        marks: input.marks !== undefined ? new Prisma.Decimal(input.marks) : undefined,
        content: input.content as Prisma.InputJsonValue,
        keywords: input.keywords,
        attachments: input.attachments as Prisma.InputJsonValue,
        status: newStatus,
        rejectionReason: newStatus === 'DRAFT' ? null : question.rejectionReason,
        // Bump version if content changed
        version: input.content ? question.version + 1 : question.version,
        // Keep parentId pointing to original (for version history)
        parentId: question.parentId ?? question.id,
      },
      include: this.defaultInclude,
    });

    await activityLog.log(req, {
      userId: updatedBy,
      action: 'UPDATE',
      resource: 'question',
      resourceId: id,
      description: `Updated question (v${updated.version})`,
    });

    return this.serialize(updated);
  }

  // ─── SUBMIT FOR REVIEW ────────────────────────────
  async submitForReview(req: Request, id: string, userId: string): Promise<QuestionDTO> {
    const question = await prisma.question.findFirst({ where: { id, deletedAt: null } });
    if (!question) throw new NotFoundError('Question');
    if (question.createdById !== userId) {
      throw new ForbiddenError('Only the author can submit a question for review');
    }
    if (question.status !== 'DRAFT' && question.status !== 'REJECTED') {
      throw new BadRequestError(`Question must be DRAFT or REJECTED to submit (currently ${question.status})`);
    }

    const updated = await prisma.question.update({
      where: { id },
      data: { status: 'PENDING_REVIEW', rejectionReason: null },
      include: this.defaultInclude,
    });

    await activityLog.log(req, {
      userId,
      action: 'UPDATE',
      resource: 'question',
      resourceId: id,
      description: 'Submitted question for department head review',
    });

    return this.serialize(updated);
  }

  // ─── REVIEW (Department Head action) ─────────────
  async review(req: Request, id: string, action: ReviewActionInput, reviewerId: string): Promise<QuestionDTO> {
    const question = await prisma.question.findFirst({ where: { id, deletedAt: null } });
    if (!question) throw new NotFoundError('Question');
    if (question.status !== 'PENDING_REVIEW') {
      throw new BadRequestError(`Question must be PENDING_REVIEW to review (currently ${question.status})`);
    }

    let newStatus: 'PENDING_APPROVAL' | 'REJECTED' | 'DRAFT';
    let rejectionReason: string | null = null;

    switch (action.action) {
      case 'approve':
        newStatus = 'PENDING_APPROVAL';
        break;
      case 'reject':
        if (!action.reason) throw new BadRequestError('Rejection reason is required');
        newStatus = 'REJECTED';
        rejectionReason = action.reason;
        break;
      case 'request_changes':
        if (!action.reason) throw new BadRequestError('Reason is required when requesting changes');
        newStatus = 'DRAFT';
        rejectionReason = action.reason;
        break;
    }

    const updated = await prisma.question.update({
      where: { id },
      data: {
        status: newStatus,
        rejectionReason,
        reviewedById: reviewerId,
        // Reset approved state if previously approved
        approvedById: newStatus === 'PENDING_APPROVAL' ? question.approvedById : null,
      },
      include: this.defaultInclude,
    });

    await activityLog.log(req, {
      userId: reviewerId,
      action: action.action === 'approve' ? 'APPROVE' : action.action === 'reject' ? 'REJECT' : 'UPDATE',
      resource: 'question',
      resourceId: id,
      description: `Department head ${action.action}: ${action.reason ?? ''}`,
    });

    return this.serialize(updated);
  }

  // ─── APPROVE (Exam Committee action) ─────────────
  async approve(req: Request, id: string, approverId: string): Promise<QuestionDTO> {
    const question = await prisma.question.findFirst({ where: { id, deletedAt: null } });
    if (!question) throw new NotFoundError('Question');
    if (question.status !== 'PENDING_APPROVAL') {
      throw new BadRequestError(`Question must be PENDING_APPROVAL to approve (currently ${question.status})`);
    }

    const updated = await prisma.question.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        approvedById: approverId,
      },
      include: this.defaultInclude,
    });

    await activityLog.log(req, {
      userId: approverId,
      action: 'APPROVE',
      resource: 'question',
      resourceId: id,
      description: 'Exam committee approved question — now ACTIVE',
    });

    return this.serialize(updated);
  }

  // ─── RETIRE ───────────────────────────────────────
  async retire(req: Request, id: string, userId: string): Promise<QuestionDTO> {
    const question = await prisma.question.findFirst({ where: { id, deletedAt: null } });
    if (!question) throw new NotFoundError('Question');
    if (question.status !== 'ACTIVE') {
      throw new BadRequestError('Only ACTIVE questions can be retired');
    }

    const updated = await prisma.question.update({
      where: { id },
      data: { status: 'RETIRED' },
      include: this.defaultInclude,
    });

    await activityLog.log(req, {
      userId,
      action: 'UPDATE',
      resource: 'question',
      resourceId: id,
      description: 'Retired question',
    });

    return this.serialize(updated);
  }

  // ─── DELETE (soft) ───────────────────────────────
  async delete(req: Request, id: string, userId: string): Promise<void> {
    const question = await prisma.question.findFirst({ where: { id, deletedAt: null } });
    if (!question) throw new NotFoundError('Question');
    if (question.status === 'ACTIVE' && question.timesUsed > 0) {
      throw new BadRequestError('Cannot delete an active question that has been used. Retire it instead.');
    }
    await prisma.question.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await activityLog.log(req, {
      userId,
      action: 'DELETE',
      resource: 'question',
      resourceId: id,
    });
  }

  // ─── HELPERS ──────────────────────────────────────
  private defaultInclude = {
    course: { select: { id: true, code: true, name: true } },
    createdBy: { select: { id: true, firstName: true, lastName: true } },
    reviewedBy: { select: { id: true, firstName: true, lastName: true } },
    approvedBy: { select: { id: true, firstName: true, lastName: true } },
    _count: { select: { examQuestions: true } },
  } as const;

  private serialize(q: any): QuestionDTO {
    return {
      id: q.id,
      courseId: q.courseId,
      courseName: q.course?.name,
      courseCode: q.course?.code,
      type: q.type,
      difficulty: q.difficulty,
      bloomsLevel: q.bloomsLevel,
      marks: Number(q.marks),
      content: q.content,
      keywords: q.keywords,
      attachments: q.attachments,
      status: q.status,
      rejectionReason: q.rejectionReason,
      timesUsed: q.timesUsed,
      lastUsedAt: q.lastUsedAt?.toISOString() ?? null,
      version: q.version,
      parentId: q.parentId,
      createdById: q.createdById,
      createdByName: q.createdBy ? `${q.createdBy.firstName} ${q.createdBy.lastName}` : undefined,
      reviewedById: q.reviewedById,
      reviewedByName: q.reviewedBy ? `${q.reviewedBy.firstName} ${q.reviewedBy.lastName}` : undefined,
      approvedById: q.approvedById,
      approvedByName: q.approvedBy ? `${q.approvedBy.firstName} ${q.approvedBy.lastName}` : undefined,
      createdAt: q.createdAt.toISOString(),
      updatedAt: q.updatedAt.toISOString(),
      _count: q._count,
    };
  }
}

export const questionsService = new QuestionsService();
