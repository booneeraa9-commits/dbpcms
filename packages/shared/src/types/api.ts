/**
 * The standard shapes of every API response. Both the backend (when sending)
 * and the frontend (when receiving) use these, so they can never disagree.
 */

/** Extra info attached to every response. */
export interface ResponseMeta {
  requestId: string;
}

/** Pagination info attached to list responses. */
export interface PaginationMeta extends ResponseMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

/** A successful response carrying a single object or value. */
export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta: ResponseMeta;
}

/** A successful response carrying a page of a list. */
export interface ApiList<T> {
  success: true;
  data: T[];
  meta: PaginationMeta;
}

/** One field-level validation problem. */
export interface ApiFieldError {
  field: string;
  message: string;
}

/** A failed response. Never contains internal/stack details. */
export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: ApiFieldError[];
  };
  meta: ResponseMeta;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;
