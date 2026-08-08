import type { Response } from "express";
import type {
  ApiList,
  ApiSuccess,
  PaginationMeta,
  ResponseMeta,
} from "@dbpcms/shared";

/**
 * Helpers that guarantee EVERY endpoint replies in the same standard shape.
 * Controllers call these instead of building responses by hand.
 */

function baseMeta(res: Response): ResponseMeta {
  return { requestId: res.locals.requestId ?? "unknown" };
}

/** Send a single object/value. */
export function sendSuccess<T>(res: Response, data: T, statusCode = 200): void {
  const body: ApiSuccess<T> = {
    success: true,
    data,
    meta: baseMeta(res),
  };
  res.status(statusCode).json(body);
}

/** Send a paginated list. */
export function sendList<T>(
  res: Response,
  data: T[],
  pagination: { page: number; pageSize: number; totalItems: number },
  statusCode = 200,
): void {
  const meta: PaginationMeta = {
    ...baseMeta(res),
    page: pagination.page,
    pageSize: pagination.pageSize,
    totalItems: pagination.totalItems,
    totalPages: Math.max(1, Math.ceil(pagination.totalItems / pagination.pageSize)),
  };
  const body: ApiList<T> = { success: true, data, meta };
  res.status(statusCode).json(body);
}
