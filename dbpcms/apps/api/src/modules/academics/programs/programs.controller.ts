import { Request, Response } from 'express';
import { programsService } from './programs.service';
import { sendSuccess, sendNoContent } from '../../../common/utils/response';
import { getCurrentUser } from '../../../common/decorators/current-user.decorator';
import { UnauthorizedError } from '../../../common/errors/AppError';
import { asyncHandler } from '../../../common/utils/asyncHandler';
import {
  createProgramSchema,
  updateProgramSchema,
  listProgramsQuerySchema,
} from './programs.schema';

export const listPrograms = asyncHandler(async (req: Request, res: Response) => {
  const query = listProgramsQuerySchema.parse(req.query);
  const result = await programsService.list(req, query);
  sendSuccess(res, result.items, 200, result.meta);
});

export const getProgram = asyncHandler(async (req: Request, res: Response) => {
  const program = await programsService.getById(req.params.id);
  sendSuccess(res, program);
});

export const createProgram = asyncHandler(async (req: Request, res: Response) => {
  const caller = getCurrentUser(req);
  if (!caller) throw new UnauthorizedError();
  const input = createProgramSchema.parse(req.body);
  const program = await programsService.create(req, input, caller.id);
  sendSuccess(res, program, 201);
});

export const updateProgram = asyncHandler(async (req: Request, res: Response) => {
  const caller = getCurrentUser(req);
  if (!caller) throw new UnauthorizedError();
  const input = updateProgramSchema.parse(req.body);
  const program = await programsService.update(req, req.params.id, input, caller.id);
  sendSuccess(res, program);
});

export const deleteProgram = asyncHandler(async (req: Request, res: Response) => {
  const caller = getCurrentUser(req);
  if (!caller) throw new UnauthorizedError();
  await programsService.delete(req, req.params.id, caller.id);
  sendNoContent(res);
});
