import type { Request, Response } from "express";
import { authConfig } from "../../config/auth.js";
import { sendSuccess } from "../../core/http/responses.js";
import { authService } from "./auth.service.js";

/**
 * Controllers are receptionists: read the request, call the service, send the
 * standard response. No business logic lives here.
 */

function requestMeta(req: Request) {
  return {
    ipAddress: req.ip ?? null,
    userAgent: req.headers["user-agent"] ?? null,
  };
}

/** Sets the refresh token as a secure, HttpOnly cookie. */
function setRefreshCookie(res: Response, refreshTokenRaw: string): void {
  res.cookie(authConfig.refreshCookieName, refreshTokenRaw, {
    httpOnly: true,
    secure: authConfig.isProduction, // HTTPS-only in production
    sameSite: "lax",
    path: "/api/v1/auth",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

export const authController = {
  async login(req: Request, res: Response): Promise<void> {
    const { user, accessToken, refreshTokenRaw } = await authService.login(
      req.body,
      requestMeta(req),
    );
    setRefreshCookie(res, refreshTokenRaw);
    sendSuccess(res, { user, accessToken });
  },

  async refresh(req: Request, res: Response): Promise<void> {
    const refreshTokenRaw = req.cookies?.[authConfig.refreshCookieName] as
      | string
      | undefined;
    const { accessToken } = await authService.refresh(refreshTokenRaw ?? "");
    sendSuccess(res, { accessToken });
  },

  async logout(req: Request, res: Response): Promise<void> {
    const refreshTokenRaw = req.cookies?.[authConfig.refreshCookieName] as
      | string
      | undefined;
    await authService.logout(refreshTokenRaw, requestMeta(req));
    res.clearCookie(authConfig.refreshCookieName, { path: "/api/v1/auth" });
    sendSuccess(res, { loggedOut: true });
  },

  async me(req: Request, res: Response): Promise<void> {
    const user = await authService.me(req.auth!.userId);
    sendSuccess(res, { user });
  },

  async changePassword(req: Request, res: Response): Promise<void> {
    await authService.changePassword(
      req.auth!.userId,
      req.body,
      requestMeta(req),
    );
    sendSuccess(res, { changed: true });
  },
};
