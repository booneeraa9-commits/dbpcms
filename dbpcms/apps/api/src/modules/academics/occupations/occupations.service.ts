import { Prisma } from '@prisma/client';
import { prisma } from '../../../infra/database/client';
import { NotFoundError, ConflictError } from '../../../common/errors/AppError';
import { normalizePagination, buildMeta } from '../../../common/utils/pagination';
import { activityLog } from '../../activity/activity.service';
import type { Request } from 'express';
import type { PaginatedResponse } from '@dbpcms/shared';
import type {
  CreateOccupationInput,
  UpdateOccupationInput,
  ListOccupationsQuery,
} from './occupations.schema';

export interface OccupationDTO {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  _count?: { programs: number };
}

class OccupationsService {
  async list(req: Request, query: ListOccupationsQuery): Promise<PaginatedResponse<OccupationDTO>> {
    const pagination = normalizePagination(query);
    const where: Prisma.OccupationWhereInput = { deletedAt: null };
    if (query.isActive !== undefined) where.isActive = query.isActive;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await Promise.all([
      prisma.occupation.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { name: 'asc' },
        include: { _count: { select: { programs: true } } },
      }),
      prisma.occupation.count({ where }),
    ]);
    return {
      items: items.map((o) => this.serialize(o)),
      meta: buildMeta(total, pagination.page, pagination.pageSize),
    };
  }

  async getById(id: string): Promise<OccupationDTO> {
    const occ = await prisma.occupation.findFirst({
      where: { id, deletedAt: null },
      include: { _count: { select: { programs: true } } },
    });
    if (!occ) throw new NotFoundError('Occupation');
    return this.serialize(occ);
  }

  async create(req: Request, input: CreateOccupationInput, createdBy: string): Promise<OccupationDTO> {
    const existing = await prisma.occupation.findUnique({ where: { code: input.code } });
    if (existing && !existing.deletedAt) throw new ConflictError('An occupation with this code already exists');

    const occ = await prisma.occupation.create({
      data: {
        code: input.code,
        name: input.name,
        description: input.description || null,
      },
      include: { _count: { select: { programs: true } } },
    });
    await activityLog.log(req, {
      userId: createdBy,
      action: 'CREATE',
      resource: 'occupation',
      resourceId: occ.id,
      description: `Created occupation ${occ.code}`,
    });
    return this.serialize(occ);
  }

  async update(req: Request, id: string, input: UpdateOccupationInput, updatedBy: string): Promise<OccupationDTO> {
    const occ = await prisma.occupation.findFirst({ where: { id, deletedAt: null } });
    if (!occ) throw new NotFoundError('Occupation');
    const updated = await prisma.occupation.update({
      where: { id },
      data: { ...input, description: input.description || undefined },
      include: { _count: { select: { programs: true } } },
    });
    await activityLog.log(req, {
      userId: updatedBy,
      action: 'UPDATE',
      resource: 'occupation',
      resourceId: id,
      description: `Updated occupation ${updated.code}`,
    });
    return this.serialize(updated);
  }

  async delete(req: Request, id: string, deletedBy: string): Promise<void> {
    const occ = await prisma.occupation.findFirst({
      where: { id, deletedAt: null },
      include: { _count: { select: { programs: true } } },
    });
    if (!occ) throw new NotFoundError('Occupation');
    await prisma.occupation.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
    await activityLog.log(req, {
      userId: deletedBy,
      action: 'DELETE',
      resource: 'occupation',
      resourceId: id,
      description: `Deleted occupation ${occ.code}`,
    });
  }

  async getActive() {
    return prisma.occupation.findMany({
      where: { deletedAt: null, isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, code: true, name: true },
    });
  }

  private serialize(o: any): OccupationDTO {
    return {
      id: o.id,
      code: o.code,
      name: o.name,
      description: o.description,
      isActive: o.isActive,
      createdAt: o.createdAt.toISOString(),
      _count: o._count,
    };
  }
}

export const occupationsService = new OccupationsService();
