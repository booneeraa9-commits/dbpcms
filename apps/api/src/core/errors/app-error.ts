import type { ApiFieldError } from "@dbpcms/shared";

/**
 * Custom exception classes. Business code throws these; the central error
 * handler turns them into safe, consistent HTTP responses. Internal error
 * details are NEVER exposed to the client.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: ApiFieldError[];
  /** Expected errors (isOperational=true) are safe to show; bugs are not. */
  public readonly isOperational: boolean;

  constructor(
    message: string,
    options: {
      statusCode: number;
      code: string;
      details?: ApiFieldError[];
      isOperational?: boolean;
    },
  ) {
    super(message);
    this.name = new.target.name;
    this.statusCode = options.statusCode;
    this.code = options.code;
    this.details = options.details;
    this.isOperational = options.isOperational ?? true;
    Error.captureStackTrace?.(this, new.target);
  }
}

export class ValidationError extends AppError {
  constructor(details: ApiFieldError[], message = "Some fields are invalid.") {
    super(message, { statusCode: 422, code: "VALIDATION_ERROR", details });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication is required.") {
    super(message, { statusCode: 401, code: "UNAUTHORIZED" });
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You do not have permission to do this.") {
    super(message, { statusCode: 403, code: "FORBIDDEN" });
  }
}

export class NotFoundError extends AppError {
  constructor(message = "The requested resource was not found.") {
    super(message, { statusCode: 404, code: "NOT_FOUND" });
  }
}

export class ConflictError extends AppError {
  constructor(message = "The request conflicts with the current state.") {
    super(message, { statusCode: 409, code: "CONFLICT" });
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = "Too many requests. Please try again later.") {
    super(message, { statusCode: 429, code: "TOO_MANY_REQUESTS" });
  }
}
