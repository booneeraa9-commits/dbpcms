import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import type { ApiError, ApiFieldError } from "@dbpcms/shared";
import { AppError } from "../core/errors/app-error.js";
import { logger } from "../core/logging/logger.js";

/**
 * THE central error handler. Every error in the app ends up here and is turned
 * into a safe, consistent JSON response. Internal details go to the logs only —
 * never to the client. This is our defense against information disclosure.
 */
export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  // Express requires the 4-argument signature to recognise this as an error handler.
  _next: NextFunction,
): void {
  const requestId: string = res.locals.requestId ?? "unknown";

  // 1) Zod validation errors -> 422 with field-level details.
  if (error instanceof ZodError) {
    const details: ApiFieldError[] = error.issues.map((issue) => ({
      field: issue.path.join(".") || "(root)",
      message: issue.message,
    }));
    const body: ApiError = {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Some fields are invalid.",
        details,
      },
      meta: { requestId },
    };
    res.status(422).json(body);
    return;
  }

  // 2) Our own expected errors -> their declared status + safe message.
  if (error instanceof AppError) {
    if (!error.isOperational) {
      logger.error({ err: error, requestId }, "Non-operational AppError");
    }
    const body: ApiError = {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
      },
      meta: { requestId },
    };
    res.status(error.statusCode).json(body);
    return;
  }

  // 3) Anything else is an unexpected bug: log the full detail, tell the user
  //    nothing internal.
  logger.error({ err: error, requestId }, "Unhandled error");
  const body: ApiError = {
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Something went wrong. Please try again later.",
    },
    meta: { requestId },
  };
  res.status(500).json(body);
}
