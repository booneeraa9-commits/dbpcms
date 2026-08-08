/**
 * Exams service.
 *
 * Manages exam creation, the auto/manual question selection, and publishing.
 *
 * Anti-repetition logic:
 *   - When a question is added to an exam, its `timesUsed` is incremented
 *   - The auto-generator prefers questions with lower `timesUsed`
 */

import { Prisma } from '@prisma/client';
import { prisma } from '../../infra/database/client';
import { NotFoundError, BadRequestError } from '../../common/errors/AppError';
import { normalizePagination, buildMeta } from '../../common/utils/pagination';
import { activityLog } from '../activity/activity.service';
import type { Request } from 'express';
import type { PaginatedResponse } from '@dbpcms/shared';
import type {
  CreateExamInput,
  UpdateExamInput,
  AutoGenerateInput,
  ListExamsQuery,
} from './exams.schema';

export interface ExamDTO {
  id: string;
  title: string;
  courseId: string;
  courseName?: string;
  courseCode?: string;
  semesterId: string;
  semesterName?: string;
  durationMinutes: number;
  totalMarks: number;
  instructions: string | null;
  difficultyDistribution: Record<string, number> | null;
  status: string;
  scheduledAt: string | null;
  publishedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  questionCount?: number;
  _count?: { examQuestions: number };
}

class ExamsService {
  // ─── LIST ─────────────────────────────────────────
  async list(req: Request, query: ListExamsQuery): Promise<PaginatedResponse<ExamDTO>> {
    const pagination = normalizePagination(query);

    const where: Prisma.ExamWhereInput = {};
    if (query.courseId) where.courseId = query.courseId;
    if (query.semesterId) where.semesterId = query.semesterId;
    if (query.status) where.status = query.status;
    if (query.search) {
      where.title = { contains: query.search, mode: 'insensitive' };
    }

    const orderBy: Prisma.ExamOrderByWithRelationInput = query.sortBy
      ? { [query.sortBy]: query.sortOrder ?? 'desc' }
      : { createdAt: 'desc' };

    const [exams, total] = await Promise.all([
      prisma.exam.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy,
        include: {
          course: { select: { code: true, name: true } },
          semester: { select: { name: true } },
          _count: { select: { examQuestions: true } },
        },
      }),
      prisma.exam.count({ where }),
    ]);

    return {
      items: exams.map((e) => this.serialize(e)),
      meta: buildMeta(total, pagination.page, pagination.pageSize),
    };
  }

  // ─── GET BY ID ────────────────────────────────────
  async getById(id: string): Promise<ExamDTO> {
    const exam = await prisma.exam.findUnique({
      where: { id },
      include: {
        course: { select: { code: true, name: true } },
        semester: true,
        examQuestions: {
          orderBy: { order: 'asc' },
          include: {
            question: {
              include: {
                course: { select: { code: true, name: true } },
              },
            },
          },
        },
      },
    });
    if (!exam) throw new NotFoundError('Exam');
    return this.serialize(exam);
  }

  // ─── CREATE ───────────────────────────────────────
  async create(req: Request, input: CreateExamInput, userId: string): Promise<ExamDTO> {
    const [course, semester] = await Promise.all([
      prisma.course.findFirst({ where: { id: input.courseId, deletedAt: null } }),
      prisma.semester.findUnique({ where: { id: input.semesterId } }),
    ]);
    if (!course) throw new BadRequestError('Course not found');
    if (!semester) throw new BadRequestError('Semester not found');

    const exam = await prisma.exam.create({
      data: {
        title: input.title,
        courseId: input.courseId,
        semesterId: input.semesterId,
        durationMinutes: input.durationMinutes,
        totalMarks: input.totalMarks,
        instructions: input.instructions || null,
        difficultyDistribution: (input.difficultyDistribution ?? null) as Prisma.InputJsonValue,
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
        status: 'DRAFT',
        createdById: userId,
      },
      include: this.defaultInclude,
    });

    await activityLog.log(req, {
      userId,
      action: 'CREATE',
      resource: 'exam',
      resourceId: exam.id,
      description: `Created exam "${exam.title}"`,
    });

    return this.serialize(exam);
  }

  // ─── UPDATE ───────────────────────────────────────
  async update(req: Request, id: string, input: UpdateExamInput, userId: string): Promise<ExamDTO> {
    const exam = await prisma.exam.findUnique({ where: { id } });
    if (!exam) throw new NotFoundError('Exam');
    if (exam.status === 'PUBLISHED') {
      throw new BadRequestError('Cannot edit a published exam. Archive it first.');
    }

    const updated = await prisma.exam.update({
      where: { id },
      data: {
        title: input.title,
        courseId: input.courseId,
        semesterId: input.semesterId,
        durationMinutes: input.durationMinutes,
        totalMarks: input.totalMarks,
        instructions: input.instructions || undefined,
        difficultyDistribution: input.difficultyDistribution as Prisma.InputJsonValue,
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
      },
      include: this.defaultInclude,
    });

    await activityLog.log(req, {
      userId,
      action: 'UPDATE',
      resource: 'exam',
      resourceId: id,
    });

    return this.serialize(updated);
  }

  // ─── AUTO-GENERATE QUESTIONS ──────────────────────
  async autoGenerate(req: Request, id: string, config: AutoGenerateInput, userId: string): Promise<ExamDTO> {
    const exam = await prisma.exam.findUnique({
      where: { id },
      include: { examQuestions: true },
    });
    if (!exam) throw new NotFoundError('Exam');
    if (exam.status === 'PUBLISHED') {
      throw new BadRequestError('Cannot modify a published exam');
    }

    // Already-picked question IDs (to avoid re-picking)
    const exclude = new Set(exam.examQuestions.map((eq) => eq.questionId));

    // Build the filter
    const distribution = config.difficultyDistribution ?? { EASY: 30, MEDIUM: 50, HARD: 20 };
    const totalDistribution = (distribution.EASY ?? 0) + (distribution.MEDIUM ?? 0) + (distribution.HARD ?? 0);

    // Count per difficulty based on distribution percentages
    const pickCount = {
      EASY: Math.round(((distribution.EASY ?? 0) / totalDistribution) * config.totalQuestions),
      MEDIUM: Math.round(((distribution.MEDIUM ?? 0) / totalDistribution) * config.totalQuestions),
      HARD: Math.round(((distribution.HARD ?? 0) / totalDistribution) * config.totalQuestions),
    };

    // Fetch questions per type + difficulty, prefer less-used ones
    const picked: { questionId: string; marks: number }[] = [];
    const totalMarks = Number(exam.totalMarks);
    const marksPerQuestion = Math.round((totalMarks / config.totalQuestions) * 10) / 10;

    for (const type of config.types) {
      for (const [difficulty, count] of Object.entries(pickCount) as Array<[keyof typeof pickCount, number]>) {
        if (count === 0) continue;

        const candidates = await prisma.question.findMany({
          where: {
            courseId: exam.courseId,
            type,
            difficulty,
            status: 'ACTIVE',
            deletedAt: null,
            id: { notIn: Array.from(exclude) },
          },
          orderBy: [{ timesUsed: 'asc' }, { createdAt: 'asc' }],
          take: count,
        });

        for (const q of candidates) {
          picked.push({ questionId: q.id, marks: Number(q.marks) });
          exclude.add(q.id);
        }
      }
    }

    if (picked.length === 0) {
      throw new BadRequestError(
        'No questions matched the criteria. Try widening the type/difficulty filters or add more questions to the bank.',
      );
    }

    // Add them to the exam
    await prisma.examQuestion.createMany({
      data: picked.map((p, i) => ({
        examId: id,
        questionId: p.questionId,
        order: exam.examQuestions.length + i,
        marks: p.marks,
      })),
    });

    // Increment timesUsed on each picked question
    for (const p of picked) {
      await prisma.question.update({
        where: { id: p.questionId },
        data: { timesUsed: { increment: 1 }, lastUsedAt: new Date() },
      });
    }

    await activityLog.log(req, {
      userId,
      action: 'CREATE',
      resource: 'exam_questions',
      description: `Auto-generated ${picked.length} questions for exam "${exam.title}"`,
    });

    return this.getById(id);
  }

  // ─── ADD QUESTIONS MANUALLY ──────────────────────
  async addQuestions(req: Request, id: string, questionIds: { questionId: string; marks: number }[], userId: string): Promise<ExamDTO> {
    const exam = await prisma.exam.findUnique({
      where: { id },
      include: { examQuestions: true },
    });
    if (!exam) throw new NotFoundError('Exam');
    if (exam.status === 'PUBLISHED') throw new BadRequestError('Cannot modify a published exam');

    // Filter out already-added
    const existing = new Set(exam.examQuestions.map((eq) => eq.questionId));
    const toAdd = questionIds.filter((q) => !existing.has(q.questionId));

    if (toAdd.length === 0) {
      throw new BadRequestError('All selected questions are already in the exam');
    }

    await prisma.examQuestion.createMany({
      data: toAdd.map((q, i) => ({
        examId: id,
        questionId: q.questionId,
        order: exam.examQuestions.length + i,
        marks: q.marks,
      })),
    });

    for (const q of toAdd) {
      await prisma.question.update({
        where: { id: q.questionId },
        data: { timesUsed: { increment: 1 }, lastUsedAt: new Date() },
      });
    }

    await activityLog.log(req, {
      userId,
      action: 'CREATE',
      resource: 'exam_questions',
      description: `Added ${toAdd.length} questions to exam`,
    });

    return this.getById(id);
  }

  // ─── REMOVE QUESTION ──────────────────────────────
  async removeQuestion(req: Request, id: string, questionId: string, userId: string): Promise<ExamDTO> {
    const exam = await prisma.exam.findUnique({ where: { id } });
    if (!exam) throw new NotFoundError('Exam');
    if (exam.status === 'PUBLISHED') throw new BadRequestError('Cannot modify a published exam');

    const deleted = await prisma.examQuestion.deleteMany({
      where: { examId: id, questionId },
    });
    if (deleted.count === 0) {
      throw new NotFoundError('Question in this exam');
    }

    // Decrement timesUsed
    await prisma.question.update({
      where: { id: questionId },
      data: { timesUsed: { decrement: 1 } },
    });

    await activityLog.log(req, {
      userId,
      action: 'DELETE',
      resource: 'exam_questions',
      description: `Removed question from exam`,
    });

    return this.getById(id);
  }

  // ─── REORDER ──────────────────────────────────────
  async reorder(req: Request, id: string, order: { questionId: string; order: number }[], userId: string): Promise<ExamDTO> {
    const exam = await prisma.exam.findUnique({ where: { id } });
    if (!exam) throw new NotFoundError('Exam');
    if (exam.status === 'PUBLISHED') throw new BadRequestError('Cannot reorder a published exam');

    await prisma.$transaction(
      order.map((item) =>
        prisma.examQuestion.updateMany({
          where: { examId: id, questionId: item.questionId },
          data: { order: item.order },
        }),
      ),
    );

    await activityLog.log(req, { userId, action: 'UPDATE', resource: 'exam' });

    return this.getById(id);
  }

  // ─── PUBLISH ──────────────────────────────────────
  async publish(req: Request, id: string, userId: string): Promise<ExamDTO> {
    const exam = await prisma.exam.findUnique({
      where: { id },
      include: { _count: { select: { examQuestions: true } } },
    });
    if (!exam) throw new NotFoundError('Exam');
    if (exam._count.examQuestions === 0) {
      throw new BadRequestError('Cannot publish an exam with no questions');
    }
    if (exam.status === 'PUBLISHED') return this.serialize(exam);

    const updated = await prisma.exam.update({
      where: { id },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
      include: this.defaultInclude,
    });

    await activityLog.log(req, {
      userId,
      action: 'PUBLISH',
      resource: 'exam',
      resourceId: id,
      description: `Published exam "${exam.title}"`,
    });

    return this.serialize(updated);
  }

  // ─── ARCHIVE ──────────────────────────────────────
  async archive(req: Request, id: string, userId: string): Promise<ExamDTO> {
    const exam = await prisma.exam.findUnique({ where: { id } });
    if (!exam) throw new NotFoundError('Exam');

    const updated = await prisma.exam.update({
      where: { id },
      data: { status: 'ARCHIVED', archivedAt: new Date() },
      include: this.defaultInclude,
    });

    await activityLog.log(req, { userId, action: 'UPDATE', resource: 'exam' });
    return this.serialize(updated);
  }

  // ─── DELETE ──────────────────────────────────────
  async delete(req: Request, id: string, userId: string): Promise<void> {
    const exam = await prisma.exam.findUnique({ where: { id } });
    if (!exam) throw new NotFoundError('Exam');
    if (exam.status === 'PUBLISHED') throw new BadRequestError('Cannot delete a published exam. Archive it instead.');

    await prisma.exam.delete({ where: { id } });
    await activityLog.log(req, {
      userId,
      action: 'DELETE',
      resource: 'exam',
      resourceId: id,
    });
  }

  // ─── HELPERS ──────────────────────────────────────
  private defaultInclude = {
    course: { select: { id: true, code: true, name: true } },
    semester: true,
    _count: { select: { examQuestions: true } },
  } as const;

  private serialize(e: any): ExamDTO {
    return {
      id: e.id,
      title: e.title,
      courseId: e.courseId,
      courseName: e.course?.name,
      courseCode: e.course?.code,
      semesterId: e.semesterId,
      semesterName: e.semester?.name,
      durationMinutes: e.durationMinutes,
      totalMarks: Number(e.totalMarks),
      instructions: e.instructions,
      difficultyDistribution: e.difficultyDistribution,
      status: e.status,
      scheduledAt: e.scheduledAt?.toISOString() ?? null,
      publishedAt: e.publishedAt?.toISOString() ?? null,
      archivedAt: e.archivedAt?.toISOString() ?? null,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
      questionCount: e._count?.examQuestions ?? e.examQuestions?.length ?? 0,
      _count: e._count,
    };
  }
}

export const examsService = new ExamsService();
