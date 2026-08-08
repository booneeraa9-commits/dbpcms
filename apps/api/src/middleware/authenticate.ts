import type { NextFunction, Request, Response } from "express";
import { UnauthorizedError } from "../core/errors/app-error.js";
import { verifyAccessToken } from "../modules/auth/token.util.js";

/**
 * Adds the authenticated user's info to the request. It reads the access token
 * from the "Authorization: Bearer <token>" header, verifies it, and attaches
 * the user id and permissions for later checks.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        permissions: string[];
      };
    }
  }
}

export function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    throw new UnauthorizedError("Authentication is required.");
  }
  const token = header.slice("Bearer ".length).trim();
  try {
    const payload = verifyAccessToken(token);
    req.auth = { userId: payload.sub, permissions: payload.permissions ?? [] };
    next();
  } catch {
    throw new UnauthorizedError("Your session is invalid or has expired.");
  }
}
