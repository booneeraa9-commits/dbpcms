import { Request, Response } from 'express';
import { resultsService } from './results.service';
import { sendSuccess, sendNoContent } from '../../common/utils/response';
import { getCurrentUser } from '../../common/decorators/current-user.decorator';
import { UnauthorizedError } from '../../common/errors/AppError';
import { asyncHandler } from '../../common/utils/asyncHandler';
import {
  createResultSchema,
  updateResultSchema,
  listResultsQuerySchema,
  bulkCreateResultsSchema,
  workflowActionSchema,
} from './results.schema';

export const listResults = asyncHandler(async (req: Request, res: Response) => {
  const query = listResultsQuerySchema.parse(req.query);
  const result = await resultsService.list(req, query);
  sendSuccess(res, result.items, 200, result.meta);
});

export const getResult = asyncHandler(async (req: Request, res: Response) => {
  const result = await resultsService.getById(req.params.id);
  sendSuccess(res, result);
});

export const createResult = asyncHandler(async (req: Request, res: Response) => {
  const caller = getCurrentUser(req);
  if (!caller) throw new UnauthorizedError();
  const input = createResultSchema.parse(req.body);
  const result = await resultsService.create(req, input, caller.id);
  sendSuccess(res, result, 201);
});

export const bulkCreateResults = asyncHandler(async (req: Request, res: Response) => {
  const caller = getCurrentUser(req);
  if (!caller) throw new UnauthorizedError();
  const { results } = bulkCreateResultsSchema.parse(req.body);
  const out = await resultsService.bulkCreate(req, results, caller.id);
  sendSuccess(res, out, 201);
});

export const updateResult = asyncHandler(async (req: Request, res: Response) => {
  const caller = getCurrentUser(req);
  if (!caller) throw new UnauthorizedError();
  const input = updateResultSchema.parse(req.body);
  const result = await resultsService.update(req, req.params.id, input, caller.id);
  sendSuccess(res, result);
});

export const deleteResult = asyncHandler(async (req: Request, res: Response) => {
  const caller = getCurrentUser(req);
  if (!caller) throw new UnauthorizedError();
  await resultsService.delete(req, req.params.id, caller.id);
  sendNoContent(res);
});

export const submitResult = asyncHandler(async (req: Request, res: Response) => {
  const caller = getCurrentUser(req);
  if (!caller) throw new UnauthorizedError();
  const result = await resultsService.submit(req, req.params.id, caller.id);
  sendSuccess(res, result);
});

export const verifyResult = asyncHandler(async (req: Request, res: Response) => {
  const caller = getCurrentUser(req);
  if (!caller) throw new UnauthorizedError();
  const result = await resultsService.verify(req, req.params.id, caller.id);
  sendSuccess(res, result);
});

export const approveResult = asyncHandler(async (req: Request, res: Response) => {
  const caller = getCurrentUser(req);
  if (!caller) throw new UnauthorizedError();
  const result = await resultsService.approve(req, req.params.id, caller.id);
  sendSuccess(res, result);
});

export const authorizeResult = asyncHandler(async (req: Request, res: Response) => {
  const caller = getCurrentUser(req);
  if (!caller) throw new UnauthorizedError();
  const result = await resultsService.authorize(req, req.params.id, caller.id);
  sendSuccess(res, result);
});

export const publishResult = asyncHandler(async (req: Request, res: Response) => {
  const caller = getCurrentUser(req);
  if (!caller) throw new UnauthorizedError();
  const result = await resultsService.publish(req, req.params.id, caller.id);
  sendSuccess(res, result);
});

export const rejectResult = asyncHandler(async (req: Request, res: Response) => {
  const caller = getCurrentUser(req);
  if (!caller) throw new UnauthorizedError();
  const { reason } = workflowActionSchema.parse(req.body);
  const result = await resultsService.reject(req, req.params.id, reason, caller.id);
  sendSuccess(res, result);
});

export const getTranscript = asyncHandler(async (req: Request, res: Response) => {
  const data = await resultsService.getTranscript(req.params.studentId);
  sendSuccess(res, data);
});

export const getMyTranscript = asyncHandler(async (req: Request, res: Response) => {
  const caller = getCurrentUser(req);
  if (!caller) throw new UnauthorizedError();
  // For students, look up their student record by email (simplified)
  const data = await resultsService.getTranscript(caller.id);
  sendSuccess(res, data);
});
