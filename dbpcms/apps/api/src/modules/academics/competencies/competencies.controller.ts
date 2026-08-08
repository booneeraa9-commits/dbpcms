import { Request, Response } from 'express';
import { z } from 'zod';
import { competenciesService } from './competencies.service';
import { sendSuccess, sendNoContent } from '../../../common/utils/response';
import { getCurrentUser } from '../../../common/decorators/current-user.decorator';
import { UnauthorizedError } from '../../../common/errors/AppError';
import { asyncHandler } from '../../../common/utils/asyncHandler';

const competencySchema = z.object({
  code: z.string().min(2).max(30).regex(/^[A-Z0-9-]+$/),
  name: z.string().min(2).max(200),
  description: z.string().max(2000).optional().or(z.literal('')),
});

export const listCompetencies = asyncHandler(async (_req: Request, res: Response) => {
  const items = await competenciesService.list();
  sendSuccess(res, items);
});

export const getCompetency = asyncHandler(async (req: Request, res: Response) => {
  const comp = await competenciesService.getById(req.params.id);
  sendSuccess(res, comp);
});

export const createCompetency = asyncHandler(async (req: Request, res: Response) => {
  const caller = getCurrentUser(req);
  if (!caller) throw new UnauthorizedError();
  const input = competencySchema.parse(req.body);
  const comp = await competenciesService.create(req, input, caller.id);
  sendSuccess(res, comp, 201);
});

export const updateCompetency = asyncHandler(async (req: Request, res: Response) => {
  const caller = getCurrentUser(req);
  if (!caller) throw new UnauthorizedError();
  const input = competencySchema.partial().parse(req.body);
  const comp = await competenciesService.update(req, req.params.id, input, caller.id);
  sendSuccess(res, comp);
});

export const deleteCompetency = asyncHandler(async (req: Request, res: Response) => {
  const caller = getCurrentUser(req);
  if (!caller) throw new UnauthorizedError();
  await competenciesService.delete(req, req.params.id, caller.id);
  sendNoContent(res);
});
