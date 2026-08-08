import { Request, Response } from 'express';
import { questionsService } from './questions.service';
import { sendSuccess, sendNoContent } from '../../common/utils/response';
import { getCurrentUser } from '../../common/decorators/current-user.decorator';
import { UnauthorizedError } from '../../common/errors/AppError';
import { asyncHandler } from '../../common/utils/asyncHandler';
import {
  createQuestionSchema,
  updateQuestionSchema,
  listQuestionsQuerySchema,
  reviewActionSchema,
} from './questions.schema';

export const listQuestions = asyncHandler(async (req: Request, res: Response) => {
  const query = listQuestionsQuerySchema.parse(req.query);
  const result = await questionsService.list(req, query);
  sendSuccess(res, result.items, 200, result.meta);
});

export const getQuestion = asyncHandler(async (req: Request, res: Response) => {
  const question = await questionsService.getById(req.params.id);
  sendSuccess(res, question);
});

export const createQuestion = asyncHandler(async (req: Request, res: Response) => {
  const caller = getCurrentUser(req);
  if (!caller) throw new UnauthorizedError();
  const input = createQuestionSchema.parse(req.body);
  const question = await questionsService.create(req, input, caller.id);
  sendSuccess(res, question, 201);
});

export const updateQuestion = asyncHandler(async (req: Request, res: Response) => {
  const caller = getCurrentUser(req);
  if (!caller) throw new UnauthorizedError();
  const input = updateQuestionSchema.parse(req.body);
  const question = await questionsService.update(req, req.params.id, input, caller.id);
  sendSuccess(res, question);
});

export const submitForReview = asyncHandler(async (req: Request, res: Response) => {
  const caller = getCurrentUser(req);
  if (!caller) throw new UnauthorizedError();
  const question = await questionsService.submitForReview(req, req.params.id, caller.id);
  sendSuccess(res, question);
});

export const reviewQuestion = asyncHandler(async (req: Request, res: Response) => {
  const caller = getCurrentUser(req);
  if (!caller) throw new UnauthorizedError();
  const action = reviewActionSchema.parse(req.body);
  const question = await questionsService.review(req, req.params.id, action, caller.id);
  sendSuccess(res, question);
});

export const approveQuestion = asyncHandler(async (req: Request, res: Response) => {
  const caller = getCurrentUser(req);
  if (!caller) throw new UnauthorizedError();
  const question = await questionsService.approve(req, req.params.id, caller.id);
  sendSuccess(res, question);
});

export const retireQuestion = asyncHandler(async (req: Request, res: Response) => {
  const caller = getCurrentUser(req);
  if (!caller) throw new UnauthorizedError();
  const question = await questionsService.retire(req, req.params.id, caller.id);
  sendSuccess(res, question);
});

export const deleteQuestion = asyncHandler(async (req: Request, res: Response) => {
  const caller = getCurrentUser(req);
  if (!caller) throw new UnauthorizedError();
  await questionsService.delete(req, req.params.id, caller.id);
  sendNoContent(res);
});
