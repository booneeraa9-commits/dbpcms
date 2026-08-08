import { Request, Response } from 'express';
import { occupationsService } from './occupations.service';
import { sendSuccess, sendNoContent } from '../../../common/utils/response';
import { getCurrentUser } from '../../../common/decorators/current-user.decorator';
import { UnauthorizedError } from '../../../common/errors/AppError';
import { asyncHandler } from '../../../common/utils/asyncHandler';
import {
  createOccupationSchema,
  updateOccupationSchema,
  listOccupationsQuerySchema,
} from './occupations.schema';

export const listOccupations = asyncHandler(async (req: Request, res: Response) => {
  const query = listOccupationsQuerySchema.parse(req.query);
  const result = await occupationsService.list(req, query);
  sendSuccess(res, result.items, 200, result.meta);
});

export const getActiveOccupations = asyncHandler(async (_req: Request, res: Response) => {
  const items = await occupationsService.getActive();
  sendSuccess(res, items);
});

export const createOccupation = asyncHandler(async (req: Request, res: Response) => {
  const caller = getCurrentUser(req);
  if (!caller) throw new UnauthorizedError();
  const input = createOccupationSchema.parse(req.body);
  const occ = await occupationsService.create(req, input, caller.id);
  sendSuccess(res, occ, 201);
});

export const updateOccupation = asyncHandler(async (req: Request, res: Response) => {
  const caller = getCurrentUser(req);
  if (!caller) throw new UnauthorizedError();
  const input = updateOccupationSchema.parse(req.body);
  const occ = await occupationsService.update(req, req.params.id, input, caller.id);
  sendSuccess(res, occ);
});

export const deleteOccupation = asyncHandler(async (req: Request, res: Response) => {
  const caller = getCurrentUser(req);
  if (!caller) throw new UnauthorizedError();
  await occupationsService.delete(req, req.params.id, caller.id);
  sendNoContent(res);
});
