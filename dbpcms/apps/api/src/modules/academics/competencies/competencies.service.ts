/**
 * Competencies — TVET-specific skills that courses develop.
 * Simpler than the others — no need for pagination usually.
 */

import { Prisma } from '@prisma/client';
import { prisma } from '../../../infra/database/client';
import { NotFoundError, ConflictError } from '../../../common/errors/AppError';
import { activityLog } from '../../activity/activity.service';
import type { Request } from 'express';

class CompetenciesService {
  async list() {
    return prisma.competency.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
      include: { _count: { select: { courses: true } } },
    });
  }

  async getById(id: string) {
    const comp = await prisma.competency.findFirst({
      where: { id, deletedAt: null },
      include: {
        courses: {
          include: { course: { select: { id: true, code: true, name: true } } },
        },
      },
    });
    if (!comp) throw new NotFoundError('Competency');
    return comp;
  }

  async create(req: Request, input: { code: string; name: string; description?: string }, createdBy: string) {
    const existing = await prisma.competency.findUnique({ where: { code: input.code } });
    if (existing && !existing.deletedAt) throw new ConflictError('A competency with this code already exists');
    const comp = await prisma.competency.create({
      data: { code: input.code, name: input.name, description: input.description || null },
    });
    await activityLog.log(req, {
      userId: createdBy,
      action: 'CREATE',
      resource: 'competency',
      resourceId: comp.id,
      description: `Created competency ${comp.code}`,
    });
    return comp;
  }

  async update(req: Request, id: string, input: { code?: string; name?: string; description?: string }, updatedBy: string) {
    const comp = await prisma.competency.findFirst({ where: { id, deletedAt: null } });
    if (!comp) throw new NotFoundError('Competency');
    const updated = await prisma.competency.update({
      where: { id },
      data: { ...input, description: input.description || undefined },
    });
    await activityLog.log(req, {
      userId: updatedBy,
      action: 'UPDATE',
      resource: 'competency',
      resourceId: id,
    });
    return updated;
  }

  async delete(req: Request, id: string, deletedBy: string) {
    const comp = await prisma.competency.findFirst({ where: { id, deletedAt: null } });
    if (!comp) throw new NotFoundError('Competency');
    await prisma.competency.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await activityLog.log(req, {
      userId: deletedBy,
      action: 'DELETE',
      resource: 'competency',
      resourceId: id,
    });
  }
}

export const competenciesService = new CompetenciesService();
