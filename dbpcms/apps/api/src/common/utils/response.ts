/**
 * Standardized response helpers.
 * Every successful controller uses these so the response shape is consistent.
 */

import { Response } from 'express';
import { ApiSuccess, PaginationMeta } from '@dbpcms/shared';

export function sendSuccess<T>(res: Response, data: T, statusCode = 200, meta?: PaginationMeta): Response {
  const body: ApiSuccess<T> = { success: true, data };
  if (meta) body.meta = meta;
  return res.status(statusCode).json(body);
}

export function sendCreated<T>(res: Response, data: T): Response {
  return sendSuccess(res, data, 201);
}

export function sendNoContent(res: Response): Response {
  return res.status(204).send();
}
