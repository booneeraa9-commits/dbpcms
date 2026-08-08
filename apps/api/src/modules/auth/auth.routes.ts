import { Router } from "express";
import { authRateLimiter } from "../../middleware/rate-limit.js";
import { authenticate } from "../../middleware/authenticate.js";
import { authController } from "./auth.controller.js";

/**
 * Auth routes. Public endpoints (login/refresh/logout) get the strict rate
 * limiter; /me and change-password require a valid access token.
 *
 * Note: async controllers are wrapped so thrown errors reach the central
 * error handler (Express 4 doesn't forward async rejections automatically).
 */
export const authRouter = Router();

const wrap =
  (handler: (req: never, res: never) => Promise<void>) =>
  (req: unknown, res: unknown, next: (err?: unknown) => void) => {
    Promise.resolve(handler(req as never, res as never)).catch(next);
  };

authRouter.post("/login", authRateLimiter, wrap(authController.login));
authRouter.post("/refresh", authRateLimiter, wrap(authController.refresh));
authRouter.post("/logout", wrap(authController.logout));
authRouter.get("/me", authenticate, wrap(authController.me));
authRouter.post(
  "/change-password",
  authenticate,
  wrap(authController.changePassword),
);
