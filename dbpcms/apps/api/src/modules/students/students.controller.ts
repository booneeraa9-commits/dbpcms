import { Request, Response } from 'express';
import { studentsService } from './students.service';
import { sendSuccess, sendNoContent } from '../../common/utils/response';
import { getCurrentUser } from '../../common/decorators/current-user.decorator';
import { UnauthorizedError } from '../../common/errors/AppError';
import { asyncHandler } from '../../common/utils/asyncHandler';
import {
  createStudentSchema,
  updateStudentSchema,
  listStudentsQuerySchema,
  createRegistrationSchema,
  bulkImportSchema,
} from './students.schema';

export const listStudents = asyncHandler(async (req: Request, res: Response) => {
  const query = listStudentsQuerySchema.parse(req.query);
  const result = await studentsService.list(req, query);
  sendSuccess(res, result.items, 200, result.meta);
});

export const getStudent = asyncHandler(async (req: Request, res: Response) => {
  const student = await studentsService.getById(req.params.id);
  sendSuccess(res, student);
});

export const createStudent = asyncHandler(async (req: Request, res: Response) => {
  const caller = getCurrentUser(req);
  if (!caller) throw new UnauthorizedError();
  const input = createStudentSchema.parse(req.body);
  const student = await studentsService.create(req, input, caller.id);
  sendSuccess(res, student, 201);
});

export const updateStudent = asyncHandler(async (req: Request, res: Response) => {
  const caller = getCurrentUser(req);
  if (!caller) throw new UnauthorizedError();
  const input = updateStudentSchema.parse(req.body);
  const student = await studentsService.update(req, req.params.id, input, caller.id);
  sendSuccess(res, student);
});

export const deleteStudent = asyncHandler(async (req: Request, res: Response) => {
  const caller = getCurrentUser(req);
  if (!caller) throw new UnauthorizedError();
  await studentsService.softDelete(req, req.params.id, caller.id);
  sendNoContent(res);
});

export const registerStudent = asyncHandler(async (req: Request, res: Response) => {
  const caller = getCurrentUser(req);
  if (!caller) throw new UnauthorizedError();
  const input = createRegistrationSchema.parse(req.body);
  const reg = await studentsService.createRegistration(req, input, caller.id);
  sendSuccess(res, reg, 201);
});

export const bulkImportStudents = asyncHandler(async (req: Request, res: Response) => {
  const caller = getCurrentUser(req);
  if (!caller) throw new UnauthorizedError();
  const { students } = bulkImportSchema.parse(req.body);
  const result = await studentsService.bulkImport(req, students, caller.id);
  sendSuccess(res, result, 201);
});
