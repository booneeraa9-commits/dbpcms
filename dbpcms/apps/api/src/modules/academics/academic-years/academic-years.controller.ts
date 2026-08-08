import { Request, Response } from 'express';
import { z } from 'zod';
import { academicYearsService } from './academic-years.service';
import { sendSuccess } from '../../../common/utils/response';
import { getCurrentUser } from '../../../common/decorators/current-user.decorator';
import { UnauthorizedError } from '../../../common/errors/AppError';
import { asyncHandler } from '../../../common/utils/asyncHandler';

const yearSchema = z.object({
  name: z.string().min(4).max(50),
  startDate: z.string(),
  endDate: z.string(),
  isCurrent: z.boolean().optional(),
});

const semesterSchema = z.object({
  academicYearId: z.string().uuid(),
  name: z.string().min(1).max(50),
  number: z.coerce.number().int().min(1).max(3),
  startDate: z.string(),
  endDate: z.string(),
  isCurrent: z.boolean().optional(),
});

export const listYears = asyncHandler(async (_req: Request, res: Response) => {
  const items = await academicYearsService.listYears();
  sendSuccess(res, items);
});

export const getYear = asyncHandler(async (req: Request, res: Response) => {
  const year = await academicYearsService.getYear(req.params.id);
  sendSuccess(res, year);
});

export const createYear = asyncHandler(async (req: Request, res: Response) => {
  const caller = getCurrentUser(req);
  if (!caller) throw new UnauthorizedError();
  const input = yearSchema.parse(req.body);
  const year = await academicYearsService.createYear(req, input, caller.id);
  sendSuccess(res, year, 201);
});

export const setCurrentYear = asyncHandler(async (req: Request, res: Response) => {
  const caller = getCurrentUser(req);
  if (!caller) throw new UnauthorizedError();
  const year = await academicYearsService.setCurrentYear(req, req.params.id, caller.id);
  sendSuccess(res, year);
});

export const createSemester = asyncHandler(async (req: Request, res: Response) => {
  const caller = getCurrentUser(req);
  if (!caller) throw new UnauthorizedError();
  const input = semesterSchema.parse(req.body);
  const sem = await academicYearsService.createSemester(req, input, caller.id);
  sendSuccess(res, sem, 201);
});

export const getCurrent = asyncHandler(async (_req: Request, res: Response) => {
  const data = await academicYearsService.getCurrent();
  sendSuccess(res, data);
});
