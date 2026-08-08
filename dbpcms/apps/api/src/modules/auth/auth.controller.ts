/**
 * Auth controller — HTTP layer.
 * Just translates HTTP requests to service calls.
 * No business logic here.
 */

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { authService } from './auth.service';
import { sendSuccess } from '../../common/utils/response';
import { UnauthorizedError } from '../../common/errors/AppError';
import { getCurrentUser } from '../../common/decorators/current-user.decorator';
import {
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from './auth.schema';

// ─── POST /auth/login ────────────────────────────────
export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const result = await authService.login(req, email, password);
    return sendSuccess(res, result);
  } catch (err) {
    if (err instanceof ZodError) return next(err);
    return next(err);
  }
}

// ─── POST /auth/refresh ──────────────────────────────
export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken } = refreshSchema.parse(req.body);
    const result = await authService.refresh(req, refreshToken);
    return sendSuccess(res, result);
  } catch (err) {
    return next(err);
  }
}

// ─── POST /auth/logout ───────────────────────────────
export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const user = getCurrentUser(req);
    if (!user) throw new UnauthorizedError();

    const { refreshToken } = req.body ?? {};
    await authService.logout(req, user.id, refreshToken);
    return sendSuccess(res, { message: 'Logged out successfully' });
  } catch (err) {
    return next(err);
  }
}

// ─── POST /auth/logout-all ───────────────────────────
export async function logoutAll(req: Request, res: Response, next: NextFunction) {
  try {
    const user = getCurrentUser(req);
    if (!user) throw new UnauthorizedError();
    await authService.logoutAll(req, user.id);
    return sendSuccess(res, { message: 'Logged out from all devices' });
  } catch (err) {
    return next(err);
  }
}

// ─── GET /auth/me ────────────────────────────────────
export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    const user = getCurrentUser(req);
    if (!user) throw new UnauthorizedError();
    const data = await authService.me(user.id);
    return sendSuccess(res, data);
  } catch (err) {
    return next(err);
  }
}

// ─── POST /auth/forgot-password ──────────────────────
export async function forgotPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);
    const result = await authService.forgotPassword(req, email);
    return sendSuccess(res, {
      message: 'If the email exists, a reset link has been sent',
      // dev-only: include the token in response so the frontend can use it
      ...(result.resetToken ? { devResetToken: result.resetToken } : {}),
    });
  } catch (err) {
    return next(err);
  }
}

// ─── POST /auth/reset-password ───────────────────────
export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { token, newPassword } = resetPasswordSchema.parse(req.body);
    await authService.resetPassword(req, token, newPassword);
    return sendSuccess(res, { message: 'Password reset successful. Please log in.' });
  } catch (err) {
    return next(err);
  }
}

// ─── POST /auth/change-password ──────────────────────
export async function changePassword(req: Request, res: Response, next: NextFunction) {
  try {
    const user = getCurrentUser(req);
    if (!user) throw new UnauthorizedError();
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
    await authService.changePassword(req, user.id, currentPassword, newPassword);
    return sendSuccess(res, { message: 'Password changed successfully' });
  } catch (err) {
    return next(err);
  }
}
