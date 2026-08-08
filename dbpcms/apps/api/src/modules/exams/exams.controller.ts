import { Request, Response } from 'express';
import { examsService } from './exams.service';
import { sendSuccess, sendNoContent } from '../../common/utils/response';
import { getCurrentUser } from '../../common/decorators/current-user.decorator';
import { UnauthorizedError } from '../../common/errors/AppError';
import { asyncHandler } from '../../common/utils/asyncHandler';
import {
  createExamSchema,
  updateExamSchema,
  listExamsQuerySchema,
  addQuestionsSchema,
  autoGenerateSchema,
  reorderSchema,
} from './exams.schema';

export const listExams = asyncHandler(async (req: Request, res: Response) => {
  const query = listExamsQuerySchema.parse(req.query);
  const result = await examsService.list(req, query);
  sendSuccess(res, result.items, 200, result.meta);
});

export const getExam = asyncHandler(async (req: Request, res: Response) => {
  const exam = await examsService.getById(req.params.id);
  sendSuccess(res, exam);
});

export const createExam = asyncHandler(async (req: Request, res: Response) => {
  const caller = getCurrentUser(req);
  if (!caller) throw new UnauthorizedError();
  const input = createExamSchema.parse(req.body);
  const exam = await examsService.create(req, input, caller.id);
  sendSuccess(res, exam, 201);
});

export const updateExam = asyncHandler(async (req: Request, res: Response) => {
  const caller = getCurrentUser(req);
  if (!caller) throw new UnauthorizedError();
  const input = updateExamSchema.parse(req.body);
  const exam = await examsService.update(req, req.params.id, input, caller.id);
  sendSuccess(res, exam);
});

export const autoGenerate = asyncHandler(async (req: Request, res: Response) => {
  const caller = getCurrentUser(req);
  if (!caller) throw new UnauthorizedError();
  const config = autoGenerateSchema.parse(req.body);
  const exam = await examsService.autoGenerate(req, req.params.id, config, caller.id);
  sendSuccess(res, exam);
});

export const addQuestions = asyncHandler(async (req: Request, res: Response) => {
  const caller = getCurrentUser(req);
  if (!caller) throw new UnauthorizedError();
  const { questions } = addQuestionsSchema.parse(req.body);
  const exam = await examsService.addQuestions(req, req.params.id, questions, caller.id);
  sendSuccess(res, exam);
});

export const removeQuestion = asyncHandler(async (req: Request, res: Response) => {
  const caller = getCurrentUser(req);
  if (!caller) throw new UnauthorizedError();
  const exam = await examsService.removeQuestion(req, req.params.id, req.params.questionId, caller.id);
  sendSuccess(res, exam);
});

export const reorder = asyncHandler(async (req: Request, res: Response) => {
  const caller = getCurrentUser(req);
  if (!caller) throw new UnauthorizedError();
  const { order } = reorderSchema.parse(req.body);
  const exam = await examsService.reorder(req, req.params.id, order, caller.id);
  sendSuccess(res, exam);
});

export const publish = asyncHandler(async (req: Request, res: Response) => {
  const caller = getCurrentUser(req);
  if (!caller) throw new UnauthorizedError();
  const exam = await examsService.publish(req, req.params.id, caller.id);
  sendSuccess(res, exam);
});

export const archive = asyncHandler(async (req: Request, res: Response) => {
  const caller = getCurrentUser(req);
  if (!caller) throw new UnauthorizedError();
  const exam = await examsService.archive(req, req.params.id, caller.id);
  sendSuccess(res, exam);
});

export const deleteExam = asyncHandler(async (req: Request, res: Response) => {
  const caller = getCurrentUser(req);
  if (!caller) throw new UnauthorizedError();
  await examsService.delete(req, req.params.id, caller.id);
  sendNoContent(res);
});
