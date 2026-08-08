/**
 * Academic years and semesters.
 * Manages the academic calendar.
 */

import { Prisma } from '@prisma/client';
import { prisma } from '../../../infra/database/client';
import { NotFoundError, ConflictError, BadRequestError } from '../../../common/errors/AppError';
import { activityLog } from '../../activity/activity.service';
import type { Request } from 'express';

interface AcademicYearInput {
  name: string;
  startDate: string;
  endDate: string;
  isCurrent?: boolean;
}

interface SemesterInput {
  academicYearId: string;
  name: string;
  number: number;
  startDate: string;
  endDate: string;
  isCurrent?: boolean;
}

class AcademicYearsService {
  // ─── Academic Years ─────────────────────────────────
  async listYears() {
    return prisma.academicYear.findMany({
      orderBy: { startDate: 'desc' },
      include: { semesters: { orderBy: { number: 'asc' } } },
    });
  }

  async getYear(id: string) {
    const year = await prisma.academicYear.findUnique({
      where: { id },
      include: { semesters: { orderBy: { number: 'asc' } } },
    });
    if (!year) throw new NotFoundError('Academic year');
    return year;
  }

  async createYear(req: Request, input: AcademicYearInput, createdBy: string) {
    const existing = await prisma.academicYear.findUnique({ where: { name: input.name } });
    if (existing) throw new ConflictError('Academic year with this name already exists');

    const start = new Date(input.startDate);
    const end = new Date(input.endDate);
    if (end <= start) throw new BadRequestError('End date must be after start date');

    // If marking as current, unmark others
    if (input.isCurrent) {
      await prisma.academicYear.updateMany({
        where: { isCurrent: true },
        data: { isCurrent: false },
      });
    }

    const year = await prisma.academicYear.create({
      data: {
        name: input.name,
        startDate: start,
        endDate: end,
        isCurrent: input.isCurrent ?? false,
      },
    });
    await activityLog.log(req, {
      userId: createdBy,
      action: 'CREATE',
      resource: 'academic_year',
      resourceId: year.id,
      description: `Created academic year ${year.name}`,
    });
    return year;
  }

  async setCurrentYear(req: Request, id: string, updatedBy: string) {
    const year = await prisma.academicYear.findUnique({ where: { id } });
    if (!year) throw new NotFoundError('Academic year');

    await prisma.$transaction([
      prisma.academicYear.updateMany({ where: { isCurrent: true }, data: { isCurrent: false } }),
      prisma.academicYear.update({ where: { id }, data: { isCurrent: true } }),
    ]);
    await activityLog.log(req, {
      userId: updatedBy,
      action: 'UPDATE',
      resource: 'academic_year',
      resourceId: id,
      description: `Set ${year.name} as current academic year`,
    });
    return this.getYear(id);
  }

  // ─── Semesters ──────────────────────────────────────
  async createSemester(req: Request, input: SemesterInput, createdBy: string) {
    const year = await prisma.academicYear.findUnique({ where: { id: input.academicYearId } });
    if (!year) throw new BadRequestError('Academic year not found');

    const existing = await prisma.semester.findUnique({
      where: { academicYearId_number: { academicYearId: input.academicYearId, number: input.number } },
    });
    if (existing) throw new ConflictError(`Semester ${input.number} already exists for this academic year`);

    const start = new Date(input.startDate);
    const end = new Date(input.endDate);
    if (end <= start) throw new BadRequestError('End date must be after start date');

    if (input.isCurrent) {
      await prisma.semester.updateMany({ where: { isCurrent: true }, data: { isCurrent: false } });
    }

    const sem = await prisma.semester.create({
      data: {
        academicYearId: input.academicYearId,
        name: input.name,
        number: input.number,
        startDate: start,
        endDate: end,
        isCurrent: input.isCurrent ?? false,
      },
    });
    await activityLog.log(req, {
      userId: createdBy,
      action: 'CREATE',
      resource: 'semester',
      resourceId: sem.id,
      description: `Created semester ${sem.name}`,
    });
    return sem;
  }

  async getCurrent() {
    const year = await prisma.academicYear.findFirst({ where: { isCurrent: true } });
    const semester = await prisma.semester.findFirst({ where: { isCurrent: true } });
    return { year, semester };
  }
}

export const academicYearsService = new AcademicYearsService();
