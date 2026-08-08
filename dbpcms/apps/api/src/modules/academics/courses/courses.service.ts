import { Prisma } from '@prisma/client';
import { prisma } from '../../../infra/database/client';
import { NotFoundError, ConflictError, BadRequestError } from '../../../common/errors/AppError';
import { normalizePagination, buildMeta } from '../../../common/utils/pagination';
import { activityLog } from '../../activity/activity.service';
import type { Request } from 'express';
import type { PaginatedResponse } from '@dbpcms/shared';
import type {
  CreateCourseInput,
  UpdateCourseInput,
  ListCoursesQuery,
} from './courses.schema';

export interface CourseDTO {
  id: string;
  code: string;
  name: string;
  description: string | null;
  departmentId: string;
  departmentName?: string;
  programId: string | null;
  programName?: string | null;
  level: number;
  credits: number;
  theoryHours: number;
  practicalHours: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  competencies: { id: string; code: string; name: string }[];
  _count?: { questions: number; assignments: number };
}

class CoursesService {
  async list(req: Request, query: ListCoursesQuery): Promise<PaginatedResponse<CourseDTO>> {
    const pagination = normalizePagination(query);

    const where: Prisma.CourseWhereInput = { deletedAt: null };
    if (query.departmentId) where.departmentId = query.departmentId;
    if (query.programId) where.programId = query.programId;
    if (query.level) where.level = query.level;
    if (query.isActive !== undefined) where.isActive = query.isActive;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const orderBy: Prisma.CourseOrderByWithRelationInput = query.sortBy
      ? { [query.sortBy]: query.sortOrder ?? 'asc' }
      : { name: 'asc' };

    const [items, total] = await Promise.all([
      prisma.course.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy,
        include: {
          department: { select: { id: true, name: true, code: true } },
          program: { select: { id: true, name: true, code: true } },
          competencies: { include: { competency: true } },
          _count: { select: { questions: true, assignments: true } },
        },
      }),
      prisma.course.count({ where }),
    ]);

    return {
      items: items.map((c) => this.serialize(c)),
      meta: buildMeta(total, pagination.page, pagination.pageSize),
    };
  }

  async getById(id: string): Promise<CourseDTO> {
    const course = await prisma.course.findFirst({
      where: { id, deletedAt: null },
      include: {
        department: true,
        program: true,
        competencies: { include: { competency: true } },
        _count: { select: { questions: true, assignments: true } },
      },
    });
    if (!course) throw new NotFoundError('Course');
    return this.serialize(course);
  }

  async create(req: Request, input: CreateCourseInput, createdBy: string): Promise<CourseDTO> {
    const dept = await prisma.department.findFirst({
      where: { id: input.departmentId, deletedAt: null },
    });
    if (!dept) throw new BadRequestError('Department not found');

    if (input.programId) {
      const program = await prisma.program.findFirst({
        where: { id: input.programId, deletedAt: null },
      });
      if (!program) throw new BadRequestError('Program not found');
      // Ensure the program's levels include this course's level
      const programLevel = await prisma.programLevel.findUnique({
        where: { programId_level: { programId: input.programId, level: input.level } },
      });
      if (!programLevel) {
        throw new BadRequestError(`This program doesn't include level ${input.level}`);
      }
    }

    const existing = await prisma.course.findFirst({
      where: { departmentId: input.departmentId, code: input.code, deletedAt: null },
    });
    if (existing) throw new ConflictError('A course with this code already exists in this department');

    const { competencyIds, ...courseFields } = input;

    const course = await prisma.course.create({
      data: {
        ...courseFields,
        programId: input.programId || null,
        description: input.description || null,
        competencies: competencyIds.length > 0
          ? { create: competencyIds.map((cid) => ({ competencyId: cid })) }
          : undefined,
      },
      include: {
        department: true,
        program: true,
        competencies: { include: { competency: true } },
        _count: { select: { questions: true, assignments: true } },
      },
    });

    await activityLog.log(req, {
      userId: createdBy,
      action: 'CREATE',
      resource: 'course',
      resourceId: course.id,
      description: `Created course ${course.code}`,
    });

    return this.serialize(course);
  }

  async update(req: Request, id: string, input: UpdateCourseInput, updatedBy: string): Promise<CourseDTO> {
    const course = await prisma.course.findFirst({ where: { id, deletedAt: null } });
    if (!course) throw new NotFoundError('Course');

    if (input.code && input.code !== course.code) {
      const existing = await prisma.course.findFirst({
        where: { departmentId: course.departmentId, code: input.code, deletedAt: null },
      });
      if (existing) throw new ConflictError('A course with this code already exists in this department');
    }

    const { competencyIds, ...courseFields } = input;

    const updated = await prisma.$transaction(async (tx) => {
      if (competencyIds !== undefined) {
        await tx.courseCompetency.deleteMany({ where: { courseId: id } });
        if (competencyIds.length > 0) {
          await tx.courseCompetency.createMany({
            data: competencyIds.map((cid) => ({ courseId: id, competencyId: cid })),
          });
        }
      }
      return tx.course.update({
        where: { id },
        data: { ...courseFields, description: input.description || undefined },
        include: {
          department: true,
          program: true,
          competencies: { include: { competency: true } },
          _count: { select: { questions: true, assignments: true } },
        },
      });
    });

    await activityLog.log(req, {
      userId: updatedBy,
      action: 'UPDATE',
      resource: 'course',
      resourceId: id,
      description: `Updated course ${updated.code}`,
    });

    return this.serialize(updated);
  }

  async delete(req: Request, id: string, deletedBy: string): Promise<void> {
    const course = await prisma.course.findFirst({
      where: { id, deletedAt: null },
      include: { _count: { select: { questions: true, assignments: true } } },
    });
    if (!course) throw new NotFoundError('Course');

    if (course._count.questions > 0) {
      throw new BadRequestError(
        `Cannot delete course with ${course._count.questions} question(s). Archive them first.`,
      );
    }

    await prisma.course.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    await activityLog.log(req, {
      userId: deletedBy,
      action: 'DELETE',
      resource: 'course',
      resourceId: id,
      description: `Deleted course ${course.code}`,
    });
  }

  private serialize(c: any): CourseDTO {
    return {
      id: c.id,
      code: c.code,
      name: c.name,
      description: c.description,
      departmentId: c.departmentId,
      departmentName: c.department?.name,
      programId: c.programId,
      programName: c.program?.name,
      level: c.level,
      credits: c.credits,
      theoryHours: c.theoryHours,
      practicalHours: c.practicalHours,
      isActive: c.isActive,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      competencies: (c.competencies ?? []).map((cc: { competency: { id: string; code: string; name: string } }) => cc.competency),
      _count: c._count,
    };
  }
}

export const coursesService = new CoursesService();
