/**
 * Auth routes.
 *
 * Public routes (no auth):
 *   - POST /auth/login
 *   - POST /auth/refresh
 *   - POST /auth/forgot-password
 *   - POST /auth/reset-password
 *
 * Protected routes (require valid JWT):
 *   - GET  /auth/me
 *   - POST /auth/logout
 *   - POST /auth/logout-all
 *   - POST /auth/change-password
 *
 * Rate limiting is applied to all auth routes to prevent brute force.
 */

import { Router } from 'express';
import * as authController from './auth.controller';
import { requireAuth } from '../../common/guards/auth.guard';
import { authRateLimiter } from '../../common/middlewares/rateLimit';

const router = Router();

// Apply auth-specific rate limiting to ALL auth routes
router.use(authRateLimiter);

// Public
router.post('/login', authController.login);
router.post('/refresh', authController.refresh);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Protected
router.get('/me', requireAuth, authController.me);
router.post('/logout', requireAuth, authController.logout);
router.post('/logout-all', requireAuth, authController.logoutAll);
router.post('/change-password', requireAuth, authController.changePassword);

export default router;
