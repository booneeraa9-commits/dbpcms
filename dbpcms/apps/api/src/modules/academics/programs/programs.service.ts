import { Prisma } from '@prisma/client';
import { prisma } from '../../../infra/database/client';
import { NotFoundError, ConflictError, BadRequestError } from '../../../common/errors/AppError';
import { normalizePagination, buildMeta } from '../../../common/utils/pagination';
import { activityLog } from '../../activity/activity.service';
import type { Request } from 'express';
import type { PaginatedResponse } from '@dbpcms/shared';
import type {
  CreateProgramInput,
  UpdateProgramInput,
  ListProgramsQuery,
} from './programs.schema';

export interface ProgramDTO {
  id: string;
  code: string;
  name: string;
  description: string | null;
  departmentId: string;
  departmentName?: string;
  durationYears: number;
  totalCredits: number;
  levels: number[];
  occupations: { id: string; code: string; name: string }[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { students: number; courses: number };
}

class ProgramsService {
  async list(req: Request, query: ListProgramsQuery): Promise<PaginatedResponse<ProgramDTO>> {
    const pagination = normalizePagination(query);

    const where: Prisma.ProgramWhereInput = { deletedAt: null };
    if (query.departmentId) where.departmentId = query.departmentId;
    if (query.isActive !== undefined) where.isActive = query.isActive;
    if (query.level) where.levels = { some: { level: query.level } };
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const orderBy: Prisma.ProgramOrderByWithRelationInput = query.sortBy
      ? { [query.sortBy]: query.sortOrder ?? 'asc' }
      : { name: 'asc' };

    const [items, total] = await Promise.all([
      prisma.program.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy,
        include: {
          department: { select: { id: true, code: true, name: true } },
          levels: { select: { level: true }, orderBy: { level: 'asc' } },
          occupations: { include: { occupation: true } },
          _count: { select: { students: true, courses: true } },
        },
      }),
      prisma.program.count({ where }),
    ]);

    return {
      items: items.map((p) => this.serialize(p)),
      meta: buildMeta(total, pagination.page, pagination.pageSize),
    };
  }

  async getById(id: string): Promise<ProgramDTO> {
    const program = await prisma.program.findFirst({
      where: { id, deletedAt: null },
      include: {
        department: true,
        levels: { orderBy: { level: 'asc' } },
        occupations: { include: { occupation: true } },
        _count: { select: { students: true, courses: true } },
      },
    });
    if (!program) throw new NotFoundError('Program');
    return this.serialize(program);
  }

  async create(req: Request, input: CreateProgramInput, createdBy: string): Promise<ProgramDTO> {
    const dept = await prisma.department.findFirst({
      where: { id: input.departmentId, deletedAt: null },
    });
    if (!dept) throw new BadRequestError('Department not found');

    const existing = await prisma.program.findFirst({
      where: { departmentId: input.departmentId, code: input.code, deletedAt: null },
    });
    if (existing) throw new ConflictError('A program with this code already exists in this department');

    const program = await prisma.program.create({
      data: {
        departmentId: input.departmentId,
        code: input.code,
        name: input.name,
        description: input.description || null,
        durationYears: input.durationYears,
        totalCredits: input.totalCredits,
        isActive: input.isActive,
        levels: {
          create: input.levels.map((l) => ({ level: l })),
        },
        occupations: {
          create: input.occupationIds.map((occId) => ({ occupationId: occId })),
        },
      },
      include: {
        department: true,
        levels: { orderBy: { level: 'asc' } },
        occupations: { include: { occupation: true } },
        _count: { select: { students: true, courses: true } },
      },
    });

    await activityLog.log(req, {
      userId: createdBy,
      action: 'CREATE',
      resource: 'program',
      resourceId: program.id,
      description: `Created program ${program.code} in ${dept.name}`,
    });

    return this.serialize(program);
  }

  async update(req: Request, id: string, input: UpdateProgramInput, updatedBy: string): Promise<ProgramDTO> {
    const program = await prisma.program.findFirst({ where: { id, deletedAt: null } });
    if (!program) throw new NotFoundError('Program');

    if (input.code && input.code !== program.code) {
      const existing = await prisma.program.findFirst({
        where: { departmentId: program.departmentId, code: input.code, deletedAt: null },
      });
      if (existing) throw new ConflictError('A program with this code already exists in this department');
    }

    const { levels, occupationIds, ...programFields } = input;

    const updated = await prisma.$transaction(async (tx) => {
      if (levels) {
        await tx.programLevel.deleteMany({ where: { programId: id } });
        if (levels.length > 0) {
          await tx.programLevel.createMany({
            data: levels.map((l) => ({ programId: id, level: l })),
          });
        }
      }
      if (occupationIds) {
        await tx.programOccupation.deleteMany({ where: { programId: id } });
        if (occupationIds.length > 0) {
          await tx.programOccupation.createMany({
            data: occupationIds.map((occId) => ({ programId: id, occupationId: occId })),
          });
        }
      }
      return tx.program.update({
        where: { id },
        data: programFields,
        include: {
          department: true,
          levels: { orderBy: { level: 'asc' } },
          occupations: { include: { occupation: true } },
          _count: { select: { students: true, courses: true } },
        },
      });
    });

    await activityLog.log(req, {
      userId: updatedBy,
      action: 'UPDATE',
      resource: 'program',
      resourceId: id,
      description: `Updated program ${updated.code}`,
    });

    return this.serialize(updated);
  }

  async delete(req: Request, id: string, deletedBy: string): Promise<void> {
    const program = await prisma.program.findFirst({
      where: { id, deletedAt: null },
      include: { _count: { select: { students: true, courses: true } } },
    });
    if (!program) throw new NotFoundError('Program');

    if (program._count.students > 0) {
      throw new BadRequestError(
        `Cannot delete program with ${program._count.students} student(s). Reassign or remove them first.`,
      );
    }

    await prisma.program.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    await activityLog.log(req, {
      userId: deletedBy,
      action: 'DELETE',
      resource: 'program',
      resourceId: id,
      description: `Deleted program ${program.code}`,
    });
  }

  private serialize(p: any): ProgramDTO {
    return {
      id: p.id,
      code: p.code,
      name: p.name,
      description: p.description,
      departmentId: p.departmentId,
      departmentName: p.department?.name,
      durationYears: p.durationYears,
      totalCredits: p.totalCredits,
      levels: (p.levels ?? []).map((l: { level: number }) => l.level),
      occupations: (p.occupations ?? []).map((po: { occupation: { id: string; code: string; name: string } }) => po.occupation),
      isActive: p.isActive,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      _count: p._count,
    };
  }
}

export const programsService = new ProgramsService();
