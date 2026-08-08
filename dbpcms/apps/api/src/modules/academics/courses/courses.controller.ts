import { Request, Response } from 'express';
import { coursesService } from './courses.service';
import { sendSuccess, sendNoContent } from '../../../common/utils/response';
import { getCurrentUser } from '../../../common/decorators/current-user.decorator';
import { UnauthorizedError } from '../../../common/errors/AppError';
import { asyncHandler } from '../../../common/utils/asyncHandler';
import {
  createCourseSchema,
  updateCourseSchema,
  listCoursesQuerySchema,
} from './courses.schema';

export const listCourses = asyncHandler(async (req: Request, res: Response) => {
  const query = listCoursesQuerySchema.parse(req.query);
  const result = await coursesService.list(req, query);
  sendSuccess(res, result.items, 200, result.meta);
});

export const getCourse = asyncHandler(async (req: Request, res: Response) => {
  const course = await coursesService.getById(req.params.id);
  sendSuccess(res, course);
});

export const createCourse = asyncHandler(async (req: Request, res: Response) => {
  const caller = getCurrentUser(req);
  if (!caller) throw new UnauthorizedError();
  const input = createCourseSchema.parse(req.body);
  const course = await coursesService.create(req, input, caller.id);
  sendSuccess(res, course, 201);
});

export const updateCourse = asyncHandler(async (req: Request, res: Response) => {
  const caller = getCurrentUser(req);
  if (!caller) throw new UnauthorizedError();
  const input = updateCourseSchema.parse(req.body);
  const course = await coursesService.update(req, req.params.id, input, caller.id);
  sendSuccess(res, course);
});

export const deleteCourse = asyncHandler(async (req: Request, res: Response) => {
  const caller = getCurrentUser(req);
  if (!caller) throw new UnauthorizedError();
  await coursesService.delete(req, req.params.id, caller.id);
  sendNoContent(res);
});
