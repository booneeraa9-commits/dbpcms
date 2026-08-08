import { Request, Response } from 'express';
import { departmentsService } from './departments.service';
import { sendSuccess, sendNoContent } from '../../../common/utils/response';
import { getCurrentUser } from '../../../common/decorators/current-user.decorator';
import { UnauthorizedError } from '../../../common/errors/AppError';
import { asyncHandler } from '../../../common/utils/asyncHandler';
import {
  createDepartmentSchema,
  updateDepartmentSchema,
  listDepartmentsQuerySchema,
} from './departments.schema';

export const listDepartments = asyncHandler(async (req: Request, res: Response) => {
  const query = listDepartmentsQuerySchema.parse(req.query);
  const result = await departmentsService.list(req, query);
  sendSuccess(res, result.items, 200, result.meta);
});

export const getDepartment = asyncHandler(async (req: Request, res: Response) => {
  const dept = await departmentsService.getById(req.params.id);
  sendSuccess(res, dept);
});

export const getActiveDepartments = asyncHandler(async (_req: Request, res: Response) => {
  const depts = await departmentsService.getActive();
  sendSuccess(res, depts);
});

export const createDepartment = asyncHandler(async (req: Request, res: Response) => {
  const caller = getCurrentUser(req);
  if (!caller) throw new UnauthorizedError();
  const input = createDepartmentSchema.parse(req.body);
  const dept = await departmentsService.create(req, input, caller.id);
  sendSuccess(res, dept, 201);
});

export const updateDepartment = asyncHandler(async (req: Request, res: Response) => {
  const caller = getCurrentUser(req);
  if (!caller) throw new UnauthorizedError();
  const input = updateDepartmentSchema.parse(req.body);
  const dept = await departmentsService.update(req, req.params.id, input, caller.id);
  sendSuccess(res, dept);
});

export const deleteDepartment = asyncHandler(async (req: Request, res: Response) => {
  const caller = getCurrentUser(req);
  if (!caller) throw new UnauthorizedError();
  await departmentsService.delete(req, req.params.id, caller.id);
  sendNoContent(res);
});
