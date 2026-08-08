/**
 * Departments service.
 * CRUD operations with audit logging and role-based authorization helpers.
 */

import { Prisma } from '@prisma/client';
import { prisma } from '../../../infra/database/client';
import { NotFoundError, ConflictError, BadRequestError } from '../../../common/errors/AppError';
import { normalizePagination, buildMeta } from '../../../common/utils/pagination';
import { activityLog } from '../../activity/activity.service';
import type { Request } from 'express';
import type { PaginatedResponse } from '@dbpcms/shared';
import type {
  CreateDepartmentInput,
  UpdateDepartmentInput,
  ListDepartmentsQuery,
} from './departments.schema';

export interface DepartmentDTO {
  id: string;
  code: string;
  name: string;
  description: string | null;
  headId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { programs: number; courses: number };
}

class DepartmentsService {
  /**
   * List departments with pagination & search.
   */
  async list(req: Request, query: ListDepartmentsQuery): Promise<PaginatedResponse<DepartmentDTO>> {
    const pagination = normalizePagination(query);

    const where: Prisma.DepartmentWhereInput = { deletedAt: null };
    if (query.isActive !== undefined) where.isActive = query.isActive;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const orderBy: Prisma.DepartmentOrderByWithRelationInput = query.sortBy
      ? { [query.sortBy]: query.sortOrder ?? 'asc' }
      : { name: 'asc' };

    const [items, total] = await Promise.all([
      prisma.department.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy,
        include: { _count: { select: { programs: true, courses: true } } },
      }),
      prisma.department.count({ where }),
    ]);

    return {
      items: items.map((d) => this.serialize(d)),
      meta: buildMeta(total, pagination.page, pagination.pageSize),
    };
  }

  /**
   * Get one department by id.
   */
  async getById(id: string): Promise<DepartmentDTO> {
    const dept = await prisma.department.findFirst({
      where: { id, deletedAt: null },
      include: {
        programs: { where: { deletedAt: null } },
        _count: { select: { programs: true, courses: true } },
      },
    });
    if (!dept) throw new NotFoundError('Department');
    return this.serialize(dept);
  }

  /**
   * Create a department.
   */
  async create(req: Request, input: CreateDepartmentInput, createdBy: string): Promise<DepartmentDTO> {
    const existing = await prisma.department.findUnique({ where: { code: input.code } });
    if (existing && !existing.deletedAt) {
      throw new ConflictError('A department with this code already exists');
    }
    if (existing && existing.deletedAt) {
      // Restore the soft-deleted one
      const restored = await prisma.department.update({
        where: { id: existing.id },
        data: {
          name: input.name,
          description: input.description || null,
          headId: input.headId || null,
          isActive: true,
          deletedAt: null,
        },
        include: { _count: { select: { programs: true, courses: true } } },
      });
      await activityLog.log(req, {
        userId: createdBy,
        action: 'CREATE',
        resource: 'department',
        resourceId: restored.id,
        description: `Restored department ${restored.code}`,
      });
      return this.serialize(restored);
    }

    const dept = await prisma.department.create({
      data: {
        code: input.code,
        name: input.name,
        description: input.description || null,
        headId: input.headId || null,
        isActive: true,
      },
      include: { _count: { select: { programs: true, courses: true } } },
    });

    await activityLog.log(req, {
      userId: createdBy,
      action: 'CREATE',
      resource: 'department',
      resourceId: dept.id,
      description: `Created department ${dept.code}`,
    });

    return this.serialize(dept);
  }

  /**
   * Update a department.
   */
  async update(req: Request, id: string, input: UpdateDepartmentInput, updatedBy: string): Promise<DepartmentDTO> {
    const dept = await prisma.department.findFirst({ where: { id, deletedAt: null } });
    if (!dept) throw new NotFoundError('Department');

    if (input.code && input.code !== dept.code) {
      const existing = await prisma.department.findUnique({ where: { code: input.code } });
      if (existing) throw new ConflictError('A department with this code already exists');
    }

    const updated = await prisma.department.update({
      where: { id },
      data: {
        code: input.code,
        name: input.name,
        description: input.description || undefined,
        headId: input.headId || undefined,
        isActive: input.isActive,
      },
      include: { _count: { select: { programs: true, courses: true } } },
    });

    await activityLog.log(req, {
      userId: updatedBy,
      action: 'UPDATE',
      resource: 'department',
      resourceId: id,
      description: `Updated department ${updated.code}`,
    });

    return this.serialize(updated);
  }

  /**
   * Soft delete a department.
   * Refuses if it has active programs or courses.
   */
  async delete(req: Request, id: string, deletedBy: string): Promise<void> {
    const dept = await prisma.department.findFirst({
      where: { id, deletedAt: null },
      include: { _count: { select: { programs: true, courses: true } } },
    });
    if (!dept) throw new NotFoundError('Department');

    if (dept._count.programs > 0 || dept._count.courses > 0) {
      throw new BadRequestError(
        `Cannot delete department with ${dept._count.programs} program(s) and ${dept._count.courses} course(s). Remove them first or deactivate the department.`,
      );
    }

    await prisma.department.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    await activityLog.log(req, {
      userId: deletedBy,
      action: 'DELETE',
      resource: 'department',
      resourceId: id,
      description: `Deleted department ${dept.code}`,
    });
  }

  /**
   * Get all active departments (for dropdowns).
   */
  async getActive() {
    return prisma.department.findMany({
      where: { deletedAt: null, isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, code: true, name: true },
    });
  }

  private serialize(d: any): DepartmentDTO {
    return {
      id: d.id,
      code: d.code,
      name: d.name,
      description: d.description,
      headId: d.headId,
      isActive: d.isActive,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
      _count: d._count,
    };
  }
}

export const departmentsService = new DepartmentsService();
